from http import HTTPStatus

from data import responses
from database import get_db, observation
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/observations")


@router.get("/", response_model=responses.ObservationListResponse)
def get_observations(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    patient_id: str | None = None,
    code: str | None = None,
):
    items, total = observation.get_all(db, page, page_size, patient_id, code)
    return responses.ObservationListResponse(items=items, total=total, page=page)


@router.get("/{observation_id}", response_model=responses.Observation)
def get_observation(observation_id: str, db: Session = Depends(get_db)):
    record = observation.get(db, observation_id)
    if not record:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Observation not found"
        )

    return record
