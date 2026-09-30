from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from rq.job import Job as RqJob

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        from_attributes=True,
    )


class Page(CamelModel, Generic[T]):
    items: list[T]
    total: int
    page: int


class HealthCheck(CamelModel):
    status: str = "healthy"
    service: str = "fhir-migration-api"


class Job(CamelModel):
    id: str
    status: str
    result: Any | None = None
    meta: Any | None = None
    enqueued_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None

    @classmethod
    def from_rq(cls, job: RqJob):
        return cls(
            id=job.id,
            status=job.get_status(),
            result=job.result,
            meta=job.meta,
            enqueued_at=job.enqueued_at,
            started_at=job.started_at,
            ended_at=job.ended_at,
        )


class Observation(CamelModel):
    id: str
    patient_id: str
    code: str | None = None
    display: str | None = None
    value_text: str | None = None
    effective_datetime: datetime | None = None


class Patient(CamelModel):
    id: str
    name: str = ""
    birth_date: str | None = None
    gender: str | None = None
    identifier: str | None = None
    created_at: datetime | None = None


class PatientListResponse(Page[Patient]):
    pass


class ObservationListResponse(Page[Observation]):
    pass
