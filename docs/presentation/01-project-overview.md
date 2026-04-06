# HTCMS — Project overview

## 1. Purpose

**HTCMS** is a web platform for **Urban Local Bodies (ULBs)** to manage and collect revenues and related civic services. It combines:

- **Property tax**, **water tax**, **shop tax**, and **D2DC** (door-to-door collection) style workflows  
- **Citizen self-service** (properties, demands, online payments, water/shop requests, toilet complaints)  
- **Staff portals** with **role-based access**, **ward/ULB scoping**, and **real-time notifications** (Socket.IO)  
- **Sanitation / solid waste / cattle management** modules (toilets, MRF, Gau Shala) aligned with field operations  

## 2. High-level scope (functional areas)

| Domain | What the system supports |
|--------|---------------------------|
| **Tax & revenue** | Assessments, demand generation (property / water / shop / D2DC), notices, payments (cash/cheque/online via Razorpay), discounts, penalty rules & waivers, approval workflow for sensitive financial actions |
| **Master data** | ULBs, wards, properties, shops, water connections, citizens (`users` with role `citizen`) |
| **Applications & workflow** | Property applications, water connection requests, shop registration — with inspection and officer decision paths (legacy Clerk/Inspector/Officer roles still in routing where used) |
| **Field collection** | Collector tasks, field visits, follow-ups, attendance, D2DC records |
| **Workers** | Field workers under EO / Supervisor / Contractor; attendance, tasks, payroll approvals |
| **Toilet / MRF / Gau Shala** | Facilities, inspections, maintenance, complaints, inventory, sales (MRF), cattle and feeding (Gau Shala) |
| **Governance** | Audit logs, reports, alerts (cron-driven services on the server) |

## 3. Technology stack (as implemented)

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS, Axios, Socket.IO client, react-hook-form, Recharts |
| **Backend** | Node.js (ES modules), Express, JWT (`jsonwebtoken`), bcrypt, Sequelize ORM, PostgreSQL (`pg`) |
| **Real-time** | Socket.IO (same HTTP server as API) |
| **Jobs** | `node-cron` (penalties, tasks, alerts, etc.) |
| **Files** | `multer`, static `uploads` |
| **Payments** | Razorpay integration (where configured) |
| **Email** | Nodemailer (where configured) |
| **Documents** | PDFKit (where used) |

## 4. Repository structure (conceptual)

- **`backend/`** — REST API under `/api/...`, Sequelize models, middleware (`authenticate`, ULB/ward filters), services, socket handlers, scripts/migrations helpers  
- **`frontend/`** — SPA: `src/pages` (portals per role), `src/components`, `src/contexts` (Auth, Staff auth, Selected ULB, notifications), `src/services/api.js`  

## 5. Deployment notes (from project configuration)

- Frontend may be hosted on **Vercel** (`vercel.json` SPA rewrites).  
- Backend expects env vars such as **`DATABASE_URL`**, **`JWT_SECRET`**, **`NODE_ENV`**, and frontend **`VITE_API_URL`**.  
- CORS is configured for known origins (e.g. local Vite + deployed frontend URL).  

## 6. User identity model (two tables)

The system uses **two authenticated personas**:

1. **`users` table** — Citizens and **portal admins** (`admin`, `assessor`, `cashier`, legacy roles like `collector` in the User enum where still referenced).  
2. **`admin_management` table** — **Staff** (EO, Supervisor, Collector, SFI, Account Officer, SBM, deprecated Clerk/Inspector/Officer/Contractor, etc.) with `ulb_id`, optional `ward_ids`, hierarchy (`eo_id`, `supervisor_id`).  

JWT carries **`userType`** (`user` vs `admin_management`) so the API loads the correct record.

## 7. “Super Admin” vs “Admin” (terminology used in code)

- **Super Admin**: `users` row with role **`admin`** and **no `ulb_id`** — can operate across all ULBs and typically selects a ULB in the UI (`SelectedUlbContext`).  
- **ULB Admin (Admin)**: `users` row with role **`admin`** (or `assessor` / `cashier`) **with `ulb_id` set** — restricted to that ULB’s data.  

This distinction is enforced in backend helpers such as `getEffectiveUlbForRequest` (`backend/utils/ulbAccessHelper.js`).
