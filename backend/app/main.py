from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.migrations import router as migrations_router
from routers.observations import router as observations_router
from routers.patients import router as patients_router

load_dotenv()

app = FastAPI(title="FHIR Migration Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(migrations_router)
app.include_router(patients_router)
app.include_router(observations_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fhir-migration-api"}
