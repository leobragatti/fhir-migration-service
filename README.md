# FHIR Migration Service

Migrates patient records and their observations from a legacy FHIR R4 server into an internal PostgreSQL database, and provides an app to run the migration and browse the results.

By default the source is the public [HAPI FHIR](https://hapi.fhir.org/baseR4) R4 sandbox.

## Features

- **Background migration:** fetches patients page by page, along with each patient's observations, and saves them to Postgres. It runs as a background job, so the API stays responsive.
- **Live progress:** the app shows the job's status and how many patients have been migrated or failed.
- **Browse the data:** a patient list with name search and pagination, and each patient's details and observations.
- **Cross-platform app:** one Expo codebase for web, iOS and Android, with light and dark themes.

## Architecture

```
                      ┌──────────────┐
                      │  HAPI FHIR   │
                      │  (FHIR R4)   │
                      └──────▲───────┘
                             │ GET /Patient, /Observation
┌──────────┐  HTTP    ┌──────┴───────┐        ┌────────────┐
│ Frontend ├─────────►│   Backend    │ enqueue│   Redis    │
│  (Expo)  │          │  (FastAPI)   ├───────►│  (queue)   │
└──────────┘          └──────┬───────┘        └─────┬──────┘
                             │ read                 │ job
                      ┌──────▼───────┐        ┌─────▼──────┐
                      │  PostgreSQL  │◄───────┤ RQ worker  │
                      │              │ write  │ fetch_data │
                      └──────────────┘        └────────────┘
```

1. The frontend calls `POST /migrations/`, and the API puts the job on the Redis queue.
2. The RQ worker runs the job: it pulls data from the FHIR server, converts it to the internal schema and writes it to Postgres. It records its progress on the job as it goes.
3. The frontend polls `GET /migrations/` for that progress and reads patients and observations from the API.

## Quick start

Requires Docker with Docker Compose.

```sh
docker compose up --build
```

| URL                          | What                    |
| ---------------------------- | ----------------------- |
| http://localhost:8081        | App (Expo, web version) |
| http://localhost:8000/docs   | API docs (Swagger UI)   |
| http://localhost:8000/health | API health check        |

Open the app and press **Start migration**. Patients appear in the list as they are migrated.

Compose starts PostgreSQL and Redis, applies the database migrations (`migrate` service), and runs the API, the RQ worker and the Expo dev server. Code under `backend/app` and `frontend/` is mounted into the containers. The API and the app reload on changes; the worker doesn't:

```sh
docker compose restart worker
```

### On a phone

The Docker setup serves the web version only. To use the app on a device with Expo Go, keep the backend running in Docker and start the app locally:

```sh
cd frontend
npm install
npx expo start
```

Then scan the QR code. The app calls the API on port 8000 of the machine running Metro, so the phone must be on the same network.

## Repository layout

```
.
├── backend/             # FastAPI API, RQ migration job, SQLAlchemy models, Alembic
├── frontend/            # Expo app (Expo Router, React Native Reusables, Nativewind)
├── docker-compose.yml   # Full local stack
└── PLAN.md              # Migration plan: challenges, phases, risks
```

Each part has its own README with setup, configuration and structure:

- **[backend/README.md](backend/README.md):** running without Docker, environment variables, full API reference, how the migration job works, database migrations.
- **[frontend/README.md](frontend/README.md):** running on web, device or emulator, pointing the app at a different API, project structure, adding UI components.

## Tech stack

| Area     | Choice                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| API      | Python, FastAPI, Pydantic                                                                           |
| Jobs     | RQ on Redis                                                                                         |
| Database | PostgreSQL 15, SQLAlchemy 2, Alembic                                                                |
| FHIR     | httpx client with retry and backoff on rate limiting                                                |
| App      | Expo (React Native), Expo Router, TanStack Query                                                    |
| UI       | [React Native Reusables](https://reactnativereusables.com) (shadcn/ui for React Native), Nativewind |

## Current limitations

The migration is still a demo:

- It stops after **50 patients**.
- Only the first 500 observations per patient are fetched.
- Re-running starts over from the first patient. Patients that already exist are counted as errors instead of being updated.
- There is no checkpoint for resuming an interrupted run.
- There is no authentication on the API, and CORS allows all origins.

See [PLAN.md](PLAN.md) for the approach and next steps, and the backend README for details.
