# HTCMS — System design

## 1. Architectural style

**Three-tier, single-page application + REST API:**

```text
┌─────────────────┐     HTTPS / WSS      ┌─────────────────┐
│  React SPA      │ ◄──────────────────► │  Express API    │
│  (Vite build)   │   JWT Bearer header  │  + Socket.IO    │
└────────┬────────┘                      └────────┬────────┘
         │                                          │
         │  Dev: Vite proxy `/api` → backend        │
         ▼                                          ▼
┌─────────────────┐                      ┌─────────────────┐
│  Browser        │                      │  PostgreSQL     │
│  localStorage / │                      │  (Sequelize)    │
│  sessionStorage │                      └─────────────────┘
└─────────────────┘
```

- **Synchronous operations**: HTTP JSON APIs under `/api/...`.  
- **Push notifications**: WebSocket connection (Socket.IO) after login.  
- **Scheduled work**: Cron services started from `backend/server.js` (server-side only).  

## 2. Backend layering

| Layer | Responsibility | Examples |
|-------|------------------|----------|
| **Routes** | Map HTTP paths to controllers; attach middleware | `backend/routes/*.routes.js` |
| **Middleware** | JWT verification, attach `req.user`, ULB/ward scoping | `backend/middleware/enhancedAuth.js`, `ulbFilter.js`, `wardAccess.js` |
| **Controllers** | Request validation, orchestration, HTTP response | `backend/controllers/*.controller.js` |
| **Services** | Reusable business logic, notifications, integrations | `backend/services/` |
| **Models** | Sequelize entities + associations | `backend/models/*.js`, `backend/models/index.js` |
| **Utils** | Cross-cutting helpers | `backend/utils/ulbAccessHelper.js` (Super Admin / SBM / effective ULB) |

## 3. Frontend layering

| Layer | Responsibility | Examples |
|-------|------------------|----------|
| **Pages** | Role-specific screens and workflows | `frontend/src/pages/**` |
| **Layouts** | Shell, navigation, guards | Admin layout, citizen layout, SBM layout, etc. |
| **Contexts** | Auth state, staff auth, selected ULB, notifications | `frontend/src/contexts/` |
| **Services** | Axios instance, API modules | `frontend/src/services/api.js` |
| **Routing** | `PrivateRoute` + `allowedRoles` | `frontend/src/App.jsx` |

## 4. Authentication and authorization

### 4.1 Authentication

- **Citizen / User-table staff**: Login via **`AuthContext`** → JWT stored (e.g. `token`, `role`, `user` in `localStorage`).  
- **Admin_management staff**: Unified **`/staff/login`** → **`StaffAuthContext`** → `staffToken` / `token`, `userType: admin_management`.  

### 4.2 Authorization patterns

- **Route-level**: React `PrivateRoute` checks allowed roles (normalized to upper/lower as coded).  
- **API-level**: `authenticate` middleware validates JWT; controllers use **`getEffectiveUlbForRequest(req)`** to derive:
  - **`isSuperAdmin`** — `user` + `admin` + no `ulb_id` (or role `super_admin` if used)  
  - **`isSbmMonitor`** — staff role **SBM**  
  - **`effectiveUlbId`** — Super Admin/SBM may pass `ulb_id` query; others use their assigned `ulb_id`  
- **SFI / Supervisor**: Ward-limited access via **`getEffectiveWardIdsForRequest`** / **`getWardIdsForRequest`** — only wards assigned in `ward_ids` within their ULB.  

## 5. Multi-tenancy (ULB)

- **`ulbs`** master; **`wards`** belong to a ULB; **properties**, **demands**, **payments**, and most operational data are tied to wards/ULBs.  
- **Super Admin** picks a ULB in the UI (session storage) to scope admin screens.  
- **SBM** uses ULB selection + optional read-only vs full CRUD (`full_crud_enabled` on `AdminManagement`).  

## 6. Major API surface (grouped)

Illustrative groups mounted from `server.js` (exact paths in `backend/server.js`):

- **Auth & profile**: `/api/auth`, staff auth equivalents  
- **Core tax**: properties, assessments, demands, payments, notices, discounts, penalty waivers  
- **Water**: connections, readings, bills, payments, assessments, documents, requests  
- **Shops**: shops, assessments, registration requests  
- **Citizen**: consolidated citizen endpoints  
- **Field**: attendance, field visits, tasks, field monitoring  
- **Workers**: workers, payroll, worker tasks  
- **Sanitation modules**: toilet, MRF, Gau Shala, inventory, utility bills  
- **SBM / SFI**: dedicated route modules for cross-ULB or role-specific operations  
- **Uploads & reports**: file upload, reporting endpoints  

## 7. Real-time design

- **Socket.IO** attached to the HTTP server; notification service receives **`setNotificationIO`** for emitting events.  
- Clients connect after authentication; server targets users/staff by id/room patterns (see `backend/socket/notificationSocket.js` and `services/notificationService.js`).  

## 8. External integrations

| Integration | Role in system |
|-------------|----------------|
| **Razorpay** | Online tax/water payments where enabled |
| **Nodemailer** | Email alerts / transactional mail where enabled |
| **PDFKit** | PDF generation (notices/reports as implemented) |

## 9. Non-functional aspects

- **Logging**: Morgan HTTP logging on API.  
- **CORS**: Whitelist of origins.  
- **Static files**: Uploaded assets served from backend uploads directory.  

## 10. PPT talking points (system design)

1. **Separation of portals** — Citizen, ULB Admin, Staff (Collector, SFI, …), Account Officer, SBM — same codebase, different routes and API filters.  
2. **Security** — JWT, role checks on UI and server; ULB/ward scoping on server is authoritative.  
3. **Scalability** — Stateless API (except WebSocket); DB is the system of record; horizontal scale = multiple Node instances + sticky sessions or Redis adapter for Socket.IO if needed (future ops concern).  
