# Prison Frontend

React + Vite frontend for Prison Management backend.

## Quick Start
1. Copy `.env.example` to `.env`.
2. Set API URL if needed:
   - `VITE_API_BASE_URL=http://localhost:8000/api/v1`
3. Install dependencies:
   - `npm install`
4. Run dev server:
   - `npm run dev`

## Main Routes
- `/login`
- `/` Dashboard
- `/users`
- `/prisoners`
- `/locations`
- `/incidents`
- `/visits`
- `/labor`
- `/schedules`
- `/shifts`

## Auth
- Uses `POST /auth/login`.
- Stores token in localStorage as `accessToken`.
- Auto loads profile from `GET /auth/me`.

## API Contracts and Collections
- Contract samples: `../backend/docs/api-contracts.json`
- Postman collection: `../backend/docs/postman-collection.json`
- Thunder Client collection: `../backend/.thunder-client/collections/prison-api.json`
