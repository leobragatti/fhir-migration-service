from collections.abc import Sequence
from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database.models import Observation


def get(db: Session, observation_id: str) -> Observation | None:
    return db.get(Observation, observation_id)


def get_all(
    db: Session,
    page: int,
    page_size: int,
    patient_id: str | None = None,
    code: str | None = None,
) -> tuple[Sequence[Observation], int]:
    base_query = select(Observation).order_by(
        Observation.effective_datetime.desc().nulls_last(), Observation.id
    )
    if patient_id:
        base_query = base_query.where(Observation.patient_id == patient_id)
    if code:
        base_query = base_query.where(Observation.code == code)

    # total count
    total = db.scalar(select(func.count()).select_from(base_query.subquery()))

    # fetch the page
    items = db.scalars(base_query.offset((page - 1) * page_size).limit(page_size)).all()

    total_pages = ceil(total / page_size)
    return items, total_pages
