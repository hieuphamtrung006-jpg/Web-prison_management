# Prison Management System

## Requirements
- Python 3.11+
- Node.js 18+
- SQL Server (local) + ODBC Driver 18

## Quick Start
1) Clone the repo.
2) Create env files:
   - Copy backend/.env.example -> backend/.env
   - Copy frontend/.env.example -> frontend/.env
3) Update backend/.env:
   - DATABASE_URL (SQL Server connection)
   - JWT_SECRET_KEY
   - CORS_ORIGINS (use http://localhost:5173,http://127.0.0.1:5173)
4) Install backend deps:
   - From backend/: pip install -r requirements.txt
5) Install frontend deps:
   - From frontend/: npm install
6) Start fullstack:
   - From repo root: .\run-fullstack.ps1

## Notes
- If you need initial schema/data, run the SQL in backend/TaoBang.sql.
- Backend runs at http://127.0.0.1:8000/docs
- Frontend runs at http://127.0.0.1:5173
