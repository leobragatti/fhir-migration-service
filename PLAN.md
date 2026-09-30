# Migration Plan: Legacy FHIR System to Internal Service

## Overview

Migrate approximately 50,000 patient records and their observations from a legacy FHIR R4 system (exposed via API) into a new internal service.

## Architecture Flow

HAPI FHIR Sandbox --> Migration Job (Python/FastAPI) --> Internal Database
--> Frontend (React)

## Key Challenges & Solutions

### 1. Data Volume (50k+ patients)

Challenge: Cannot fetch all patients at once - risk of timeouts and memory overflow.

Solution: Pagination with _count and _offset, batch processing.

Pseudocode:
def fetch_patients_batch(batch_size=100):
offset = 0
while True:
response = fhir_client.search(
resource_type="Patient",
params={"_count": batch_size, "_offset": offset}
)
if not response.entries:
break
for entry in response.entries:
yield entry
offset += batch_size

### 2. Data Transformation

Challenge: FHIR data needs to be normalized to our internal schema.

Solution: SQLAlchemy ORM with explicit transformers.

def transform_fhir_patient(fhir_entry: dict) -> PatientSchema:
return PatientSchema(
id=fhir_entry["id"],
identifier=[i["value"] for i in fhir_entry.get("identifier", [])],
name=fhir_entry.get("name", [{}])[0].get("text", ""),
birth_date=fhir_entry.get("birthDate"),
gender=fhir_entry.get("gender", "unknown")
)

### 3. Observations Association

Challenge: Observations are in separate resources, need to be linked.

Solution: Search by subject reference.

def fetch_patient_observations(patient_id: str):
return fhir_client.search(
resource_type="Observation",
params={"subject": f"Patient/{patient_id}", "_count": 500}
)

### 4. Idempotency & Retry

Challenge: Migration can fail partially, must be able to resume.

Solution: Status tracking and checkpointing.

migration_status = {
"total_patients": 50000,
"processed": 23456,
"failed": 12,
"last_checkpoint": "Patient/12345"
}

## Implementation Phases

Phase 1: Setup basic infrastructure (DB, API scaffold)
Phase 2: Implement FHIR client with pagination
Phase 3: Create models and transformers
Phase 4: Migration job with batch processing
Phase 5: Basic frontend for viewing data
Phase 6: Testing and refinement

## Risk Assessment

| Risk                   | Likelihood | Impact | Mitigation                    |
| ---------------------- | ---------- | ------ | ----------------------------- |
| API rate limiting      | Medium     | High   | Implement exponential backoff |
| Schema mismatch        | Medium     | Medium | Validate sample data first    |
| Timeout large requests | High       | Medium | Use smaller batch sizes       |
| Memory overflow        | Low        | High   | Stream processing             |

## Next Steps

1. Add monitoring/logging
2. Implement authentication for the backend
3. Implement error alerting (Slack webhook)
4. Add comprehensive test suite
5. Write cleanup scripts (rollback migration)
6. Fully document API endpoints

## Tech Stack Decisions

| Component | Choice                                   | Reason                                                                                      |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend   | [FastAPI](https://fastapi.tiangolo.com)  | Async support, automatic OpenAPI docs, fast dev cycle                                       |
| Job Queue | [RQ](https://python-rq.org)              | Simple Python library for queueing jobs and processing them in the background with workers. |
| Frontend  | [Expo](https://expo.dev)                 | Simple setup, component-based, lightweight and mobile-friendly                              |
| Database  | [PostgreSQL](https://www.postgresql.org) | Reliable relational DB that handles linked patients and observations at scale               |
| Queue     | [Redis](https://redis.io/pt/)            | Fast in-memory store that RQ requires; holds the job queue and live migration progress      |
