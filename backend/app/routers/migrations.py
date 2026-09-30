from data import migrator, responses
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/migrations")


@router.get("/", response_model=responses.Job)
async def get_migration(redis=Depends(migrator.get_redis_connection)):
    job = migrator.get_migration_status(redis)
    if not job:
        raise HTTPException(status_code=404, detail="Migration not found")

    return responses.Job.from_rq(job)


@router.post("/", response_model=responses.Job)
async def start_migration(redis=Depends(migrator.get_redis_connection)):
    job = migrator.start_migration(redis)
    return responses.Job.from_rq(job)
