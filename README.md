# HTCMS – House Tax Collection & Management System (ULB System)

A full-stack web application for Urban Local Bodies (ULB) to manage property tax, water tax, demands, collections, and staff operations.

## Features

- **Admin / Super Admin:** ULB management, staff management, wards, reports, audit logs, attendance
- **Collector:** Assigned wards, property list, tax summary, field collections, tasks, attendance
- **Clerk / Inspector / Officer:** Property and water applications, assessments, demands
- **Citizen:** My properties, demands, water connections, notices, payments, shop registration
- **Tax modules:** Property tax, water tax, shop tax, D2DC
- **Attendance:** Punch-in/punch-out for collectors, staff, and admins (super admin sees admin attendance)

## Tech Stack

| Layer   | Stack |
|--------|--------|
| Backend | Node.js, Express, Sequelize, PostgreSQL |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios |
| Auth    | JWT (auth + staff auth) |
| PDF     | PDFKit (receipts, notices) |

## Project Structure

```
HTCMS/
├── backend/          # Express API
│   ├── config/       # Database config
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/      # Migration/backfill scripts
│   └── server.js
├── frontend/         # React (Vite) app
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/    # admin, citizen, collector, clerk, etc.
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v18+)
- PostgreSQL
- npm or yarn

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` in `backend/` with at least:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/htcms
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

Run migrations (if using Sequelize CLI):

```bash
npm run migrate
```

Start the server:

```bash
npm run dev
```

API runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
```

Create `.env` in `frontend/` if needed (API and WebSocket use the same host):

```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

App runs at `http://localhost:5173`.

## Running the App

- **Development:** From project root you can run backend and frontend in two terminals:
  - Terminal 1: `cd backend && npm run dev`
  - Terminal 2: `cd frontend && npm run dev`
- **Production:** Build frontend with `cd frontend && npm run build`, then serve backend (and optionally static frontend) with `cd backend && npm start`. Set `NODE_ENV=production` and ensure `DATABASE_URL` and `JWT_SECRET` are set.

## Real-time notifications (WebSocket)

- Notifications use **Socket.IO** on the same host and port as the API. The frontend connects to `VITE_API_URL` (e.g. `https://your-backend.onrender.com`).
- **Deployment:** Use one backend URL for both REST and WebSocket. Ensure your host allows WebSocket (e.g. Render, Heroku, and most Node hosts do). Do not put the API behind a proxy that strips WebSocket upgrade headers; if you use a reverse proxy, enable WebSocket passthrough for the API path.
- Create the notifications table once: `cd backend && node scripts/sync-notifications-table.js`.

## Environment Variables (Backend)

| Variable       | Description |
|----------------|-------------|
| `PORT`         | Server port (default 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`   | Secret for JWT signing |
| `JWT_EXPIRE`   | Token expiry (e.g. 7d) |
| `NODE_ENV`     | `development` or `production` |

## License

ISC
