from http import HTTPStatus

from data import responses
from database import get_db, observation, patient
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/patients")


@router.get("/", response_model=responses.PatientListResponse)
def get_patients(
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 100,
    name: str | None = Query(None, description="Case-insensitive substring of the name"),
):
    items, total = patient.get_all(db, page, page_size, name.strip() if name else None)
    return responses.PatientListResponse(items=items, total=total, page=page)


@router.get("/{patient_id}", response_model=responses.Patient)
async def get_patient(patient_id: str, db: Session = Depends(get_db)):
    record = patient.get(db, patient_id)
    if not record:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Patient not found"
        )

    return record


@router.get(
    "/{patient_id}/observations", response_model=responses.ObservationListResponse
)
def get_patient_observations(
    patient_id: str,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    code: str | None = None,
):
    if not patient.get(db, patient_id):
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Patient not found"
        )

    items, total = observation.get_all(db, page, page_size, patient_id, code)
    return responses.ObservationListResponse(items=items, total=total, page=page)
