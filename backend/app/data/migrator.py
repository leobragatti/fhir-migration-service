import logging
import os

from data.client import FHIRClient
from database import db_session, models
from redis import Redis
from rq import Queue, get_current_job
from rq.exceptions import NoSuchJobError
from rq.job import Job

logger = logging.getLogger(__name__)


def get_redis_connection():
    connection = Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    try:
        yield connection
    finally:
        connection.close()


def start_migration(redis_connection: Redis) -> Job:
    """Execute full patient migration with progress tracking"""
    queue = Queue(connection=redis_connection)
    try:
        job = Job.fetch("migrate_data", connection=redis_connection)
        print("Finished and failed", job.is_finished, job.is_failed)
        if job.is_finished or job.is_failed:
            job = queue.enqueue(fetch_data, job_id="migrate_data", job_timeout=-1)
    except NoSuchJobError:
        job = queue.enqueue(fetch_data, job_id="migrate_data", job_timeout=-1, meta={})
    return job


def get_migration_status(redis_connection: Redis) -> Job | None:
    try:
        return Job.fetch("migrate_data", connection=redis_connection)
    except NoSuchJobError:
        return None


def fetch_data():
    fhir_client = FHIRClient(
        os.getenv("FHIR_BASE_URL") or "https://hapi.fhir.org/baseR4"
    )
    job = get_current_job()

    processed = 0
    errors = 0
    total = 0

    patient_stream = fhir_client.stream_patients(batch_size=50)
    while patient_stream:
        for fhir_patient in patient_stream:
            try:
                patient_data = fhir_patient.to_internal()
                patient = models.Patient(**patient_data)

                # Fetch and save associated observations
                observations = fhir_client.get_observations(fhir_patient.id)
                patient.observations.extend(
                    [
                        models.Observation(**obs.to_internal(fhir_patient.id))
                        for obs in observations
                    ]
                )

                with db_session() as db:
                    db.add(patient)
                    db.commit()

                processed += 1

            except Exception as e:
                errors += 1
                logger.error(f"Migration error for patient {fhir_patient.id}: {e}")
            finally:
                total += 1

            patient_stream = fhir_client.stream_patients(batch_size=50, offset=total)
            job.meta.update(
                {
                    "processed": processed,
                    "errors": errors,
                    "total": total,
                    "last_checkpoint": f"Patient/{fhir_patient.id}",
                }
            )
            job.save_meta()
            if total >= 50:
                break

    return {
        "processed": processed,
        "errors": errors,
        "total": total,
    }
