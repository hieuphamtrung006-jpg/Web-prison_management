# Prison Backend

Backend FastAPI for prison operations, scheduling, and AI-based planning.

## Stack
- FastAPI
- SQLAlchemy 2.x
- SQL Server (pyodbc)
- JWT auth
- Supabase admin client (optional integration)

## Environment
Copy `.env.example` to `.env` and fill values.

Required keys:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `SUPABASE_URL` (optional)
- `SUPABASE_SERVICE_ROLE_KEY` (optional)

## Install
```bash
pip install -e .
```

## Run
```bash
uvicorn app.main:app --reload --app-dir backend
```

If you run the command from `backend/`, use:
```bash
uvicorn app.main:app --reload
```

## API Base
- `/api/v1`
- OpenAPI docs: `/docs`
- Health: `/health`

## Auth Flow
1. `POST /api/v1/auth/login` with username/password.
2. Receive Bearer token.
3. Use `Authorization: Bearer <token>` for protected APIs.
4. `GET /api/v1/auth/me` to fetch current profile.

## Role Access Summary
- `Admin`: full access.
- `Warden`: operational + scheduling management.
- `Guard`: operations input (incidents, visits create, labor input, prisoners update).
- `Viewer`: read-only monitoring APIs.

## Main Domains
- `auth`, `users`
- `prisoners`, `incidents`, `visits`
- `locations`, `labor`
- `shifts`, `schedules`

## Scheduling Engine
`POST /api/v1/schedules/generate` loads data from:
- SchedulingConfigs
- Prisoners
- Locations
- Shifts
- LaborAssignments
- LaborProjects

Then runs GA in `app/services/ai_engine.py`, replaces existing schedules of target date, and bulk inserts best solution.
