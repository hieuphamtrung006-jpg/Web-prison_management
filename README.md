# Web-prison_management

Production-ready baseline for a prison management platform:
- Backend: FastAPI (REST, versioned API, env-based config)
- Frontend: React + Vite (built and served by Nginx in production)
- Infra: Docker Compose for full stack startup

## Architecture style

- RESTful API with versioning (`/api/v1`)
- Layered backend architecture (`api`, `services`, `db`, `core`, `models`)
- Frontend and backend separated (client-server)

## Project structure

```text
Web-prison_management/
|-- backend/
|   |-- app/
|   |   |-- api/v1/endpoints/
|   |   |-- core/
|   |   |-- db/
|   |   |-- models/
|   |   |-- services/
|   |   `-- main.py
|   |-- tests/
|   |-- .env.example
|   |-- Dockerfile
|   |-- requirements.txt
|   `-- requirements-dev.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |-- .env.example
|   |-- Dockerfile
|   |-- nginx.conf
|   `-- package.json
|-- docker-compose.yml
`-- README.md
```

## Production hardening included

- Strict settings model in `backend/app/core/config.py`
- CORS from environment (`CORS_ORIGINS`)
- Global exception handling in `backend/app/main.py`
- Liveness and readiness endpoints:
  - `GET /api/v1/health`
  - `GET /api/v1/readiness`
- Runtime/dev dependency split:
  - `backend/requirements.txt`
  - `backend/requirements-dev.txt`
- Production frontend image via Nginx (`frontend/Dockerfile`)

## Environment setup

1) Copy env templates:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

2) Fill secrets in `backend/.env`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run locally (dev)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## Tests

```bash
python -m pytest backend/tests -q
```
