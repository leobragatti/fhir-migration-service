from collections.abc import Sequence
from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database.models import Patient


def get(db: Session, patient_id: str) -> Patient | None:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def get_all(
    db: Session, page: int, page_size: int, name: str | None = None
) -> tuple[Sequence[Patient], int]:
    base_query = select(Patient).order_by(Patient.id)
    if name:
        # Case-insensitive substring match; escape LIKE wildcards in user input
        escaped = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        base_query = base_query.where(Patient.name.ilike(f"%{escaped}%", escape="\\"))

    # total count
    total = db.scalar(select(func.count()).select_from(base_query.subquery()))

    # fetch the page
    items = db.scalars(base_query.offset((page - 1) * page_size).limit(page_size)).all()

    total_pages = ceil(total / page_size)
    return items, total_pages
