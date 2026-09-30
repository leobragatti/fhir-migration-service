# FHIR Migration Service — Backend

FastAPI service that migrates Patient and Observation resources from a FHIR R4 server (the public [HAPI FHIR](https://hapi.fhir.org/baseR4) sandbox by default) into PostgreSQL, and serves the migrated data to the frontend.

The migration runs as a background [RQ](https://python-rq.org) job backed by Redis, so the API stays responsive and the job's progress can be polled.

```
HAPI FHIR ──► RQ worker (fetch_data) ──► PostgreSQL ◄── FastAPI ◄── Frontend
                  ▲                                        │
                  └──────────── Redis queue ◄──────────────┘
                                             POST /migrations
```

## Tech stack

- **FastAPI** + Uvicorn: HTTP API with automatic OpenAPI docs
- **SQLAlchemy 2** + **Alembic**: ORM and schema migrations
- **PostgreSQL 15**: storage
- **RQ** + **Redis**: background migration job and progress tracking
- **httpx**: FHIR client, with retries on rate limiting
- **Pydantic**: parsing FHIR JSON and shaping API responses

## Running

### With Docker Compose (recommended)

From the repository root:

```sh
docker compose up --build
```

This starts:

| Service    | What it does                                            |
| ---------- | ------------------------------------------------------- |
| `db`       | PostgreSQL                                              |
| `redis`    | Queue for the migration job                             |
| `migrate`  | Runs `alembic upgrade head` once, then exits            |
| `backend`  | API on http://localhost:8000, reloads on code changes   |
| `worker`   | RQ worker that runs the migration job                   |
| `frontend` | Expo web app on http://localhost:8081                   |

The interactive API docs are at http://localhost:8000/docs.

> The RQ worker does not reload on code changes. Restart it after editing the job code:
> `docker compose restart worker`

### Locally

Requires Python 3.11+, plus a PostgreSQL and a Redis instance you can reach.

```sh
cd backend
python -m venv .venv
source .venv/bin/activate          # fish: source .venv/bin/activate.fish
pip install -r requirements.txt
cp .env.example .env               # then fill in the values (see below)

alembic upgrade head               # create the schema

cd app
uvicorn main:app --reload          # API on http://localhost:8000
rq worker                          # in a second terminal, also from app/
```

Both the API and the worker must be started from `app/`, because modules import each other as top-level packages (`database`, `data`, `routers`).

> In `docker-compose.yml` the `db` service doesn't publish port 5432. To use the Compose database from a local API, add `ports: ["5432:5432"]` to `db`.

## Configuration

Settings are read from environment variables, or from `backend/.env` via `python-dotenv`.

| Variable        | Required | Default                        | Description                                                                 |
| --------------- | -------- | ------------------------------ | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | Yes      | —                              | SQLAlchemy URL, e.g. `postgresql+psycopg://myapp:myapp@localhost:5432/myapp` |
| `REDIS_URL`     | No       | `redis://localhost:6379`       | Redis connection for RQ                                                     |
| `FHIR_BASE_URL` | No       | `https://hapi.fhir.org/baseR4` | FHIR R4 server to migrate from                                              |

## API

All list endpoints are paged and return `{ "items": [...], "total": <number of pages>, "page": <current page> }`.

> `total` is the **number of pages**, not the number of items.

JSON responses use camelCase keys. Query parameters use snake_case (`page_size`, `patient_id`).

### Health

| Method | Path      | Description   |
| ------ | --------- | ------------- |
| GET    | `/health` | Liveness check |

### Migrations

| Method | Path           | Description                                                                                   |
| ------ | -------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/migrations/` | Start the migration job. If one is already queued or running, returns that job instead.       |
| GET    | `/migrations/` | Status of the latest job. Returns 404 if no migration has ever been run.                      |

Example response:

```json
{
  "id": "migrate_data",
  "status": "started",
  "result": null,
  "meta": { "processed": 42, "errors": 1, "total": 43 },
  "enqueuedAt": "2026-09-30T02:36:22.986317Z",
  "startedAt": "2026-09-30T02:36:23.002531Z",
  "endedAt": null
}
```

- `status` is the RQ job status: `queued`, `started`, `finished`, `failed`, and so on.
- `meta` holds live progress and is updated after each patient.
- `result` holds the final counts once the job finishes.
- In both, `total` is the number of patients handled so far, `processed` the number saved, and `errors` the number that failed.

### Patients

| Method | Path                                  | Query parameters                                   | Description                                    |
| ------ | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| GET    | `/patients/`                          | `page` (1), `page_size` (100), `name`              | List patients ordered by ID. `name` is a case-insensitive match on any part of the name. |
| GET    | `/patients/{patient_id}`              | —                                                  | One patient; 404 if not found                  |
| GET    | `/patients/{patient_id}/observations` | `page` (1), `page_size` (100, max 500), `code`     | The patient's observations, newest first; 404 if the patient doesn't exist |

### Observations

| Method | Path                             | Query parameters                                                 | Description                           |
| ------ | -------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| GET    | `/observations/`                 | `page` (1), `page_size` (100, max 500), `patient_id`, `code`     | List observations, newest first       |
| GET    | `/observations/{observation_id}` | —                                                                | One observation; 404 if not found     |

`code` filters by exact observation code, e.g. `8867-4` for heart rate.

## How the migration works

The job is `data.migrator.fetch_data`. It always runs with the fixed job ID `migrate_data`, so only one migration exists at a time.

1. Fetch a page of patients with `GET /Patient?_count=50&_offset=N`.
2. For each patient:
   - Convert it to the internal model with `PatientResource.to_internal()`.
   - Fetch its observations with `GET /Observation?subject=Patient/{id}&_count=500` and convert each with `ObservationResource.to_internal()`.
   - Save the patient and its observations together in one transaction.
   - Update `processed`, `errors` and `total` in the job's `meta`.
3. If one patient fails, the error is logged and counted, and the job moves on to the next patient.

The FHIR client retries HTTP 429 (rate limited) responses up to 3 times, waiting 2, 4 and 8 seconds. Other HTTP errors fail the current patient.

### Current limitations

- The job stops after **50 patients**, a demo cap set in `fetch_data`.
- Only the first 500 observations of each patient are fetched.
- Re-running starts again from the first patient. Patients that already exist fail on the primary key and are counted as errors; nothing is updated.
- There is no checkpoint for resuming an interrupted run.

## Project structure

```
backend/
├── alembic/                  # Schema migrations
│   └── versions/
├── alembic.ini
├── app/
│   ├── main.py               # FastAPI app, CORS, routers, /health
│   ├── routers/
│   │   ├── migrations.py     # Start job / job status
│   │   ├── patients.py       # Patient list, detail, observations
│   │   └── observations.py   # Observation list and detail
│   ├── data/
│   │   ├── client.py         # FHIRClient: search, retries, paging
│   │   ├── schemas.py        # FHIR resource models + to_internal() transformers
│   │   ├── migrator.py       # RQ job enqueue/status and the fetch_data job
│   │   └── responses.py      # API response models (camelCase)
│   └── database/
│       ├── __init__.py       # Engine, SessionLocal, get_db, db_session
│       ├── models.py         # Patient, Observation
│       ├── patient.py        # Patient queries
│       └── observation.py    # Observation queries
├── Dockerfile
└── requirements.txt
```

### Database sessions

- **In API routes**, use `get_db` as a FastAPI dependency: `db: Session = Depends(get_db)`.
- **Outside FastAPI** (for example in the RQ job), use `db_session` as a context manager: `with db_session() as db: ...`.

Both use the same function to open and close the session.

## Database migrations

Create a migration after changing `database/models.py`, then apply it. Run both from `backend/`:

```sh
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

With Docker Compose, the `migrate` service applies pending migrations on `docker compose up`. To apply them by hand:

```sh
docker compose run --rm migrate
```
