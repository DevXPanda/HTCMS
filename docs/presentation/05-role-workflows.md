# HTCMS — Roles and workflows

This document describes **only** the roles you listed, as implemented (or implied) in the HTCMS codebase: **Super Admin**, **Admin**, **SFI (SFI)**, **Collector**, **Account Officer**, **Supervisor**, **Citizen**.

> **Naming:** In the UI, **SFI** is labeled *Sanitary & Food Inspector* (`AdminManagement.jsx`). **Admin** below means **ULB-scoped portal admin** (`users.role` in `admin` / `assessor` / `cashier` with `ulb_id`). **Super Admin** is **`admin` without `ulb_id`** (see `SelectedUlbContext.jsx` and `ulbAccessHelper.js`).

---

## 1. Super Admin

### 1.1 Definition

- Account in **`users`** with role **`admin`** and **no `ulb_id`** (or role `super_admin` if configured that way on the backend).  
- **Not** the same as **SBM** (SBM is **`admin_management`** global monitoring — out of scope for your list, but Super Admin assigns SBM in Staff Management).  

### 1.2 Login and portal

- **`/admin/login`** → lands on **`/dashboard`** with **`AdminLayout`** (same shell as ULB Admin; difference is ULB scope and permissions).  
- **`SelectedUlbContext`**: Super Admin **selects a ULB** from the header; APIs use **`effectiveUlbId`** = selected ULB or query `ulb_id` where applicable.  

### 1.3 Typical capabilities (from routes and controllers)

- **Full ULB operations** when a ULB is selected: property tax, water tax, shop tax, demands, payments, notices, wards, users (citizens), admin accounts, staff management UI entry, reports, audit logs, field monitoring, toilet/MRF/Gau Shala (under admin paths).  
- **Cross-ULB visibility** when no ULB filter is applied (backend `effectiveUlbId` null) for Super Admin on many list/stat endpoints.  
- **Payment approval authority**: **Approve/reject** discount and penalty waiver requests raised by Account Officers (`paymentApprovalRequest.controller.js` — “Only Super Admin can approve/reject”).  
- **Staff management**: Create/manage staff in **`/admin-management`**; only Super Admin can assign **SBM** role and toggle SBM full CRUD (`AdminManagement.jsx`).  

### 1.4 Workflow (summary)

```text
Login (Admin portal)
  → Select ULB (session)
  → Configure masters (wards, users, staff as needed)
  → Oversee demands / payments / reports for selected ULB (or all, per API)
  → Review Account Officer requests → Approve/Reject → System applies discount/waiver to demand
  → Audit / compliance via audit logs and reports
```

---

## 2. Admin (ULB Admin — Assessor / Cashier included)

### 2.1 Definition

- Account in **`users`** with role **`admin`**, **`assessor`**, or **`cashier`** and **`ulb_id` set**.  
- Restricted to **one ULB**; cannot freely query other ULBs (contrast Super Admin).  

### 2.2 Login and portal

- **`/admin/login`** → **`/dashboard`** with **`AdminLayout`**.  
- **`effectiveUlbId`** is always their **`ulb_id`** (no global ULB picker behavior like Super Admin).  

### 2.3 Typical capabilities

Same **admin route tree** as Super Admin for **their ULB** (subject to role nuances):

- **Tax management**: Property / water / shop modules, unified demands, D2DC demand generation, discounts/penalty waiver **management pages** (final sensitive approvals may still route through Super Admin per approval API).  
- **Masters**: Properties, assessments, demands, payments, notices, wards (within ULB), ULB management screens as permitted, citizen users list, **admin accounts**, **admin management** (EO/staff) for their organization.  
- **Operational**: Field monitoring, field worker monitoring, attendance, water connection requests processing, toilet/MRF/Gau Shala under `/` admin paths.  
- **`/approval-requests`**: UI exists under admin layout (labeled for Super Admin in comments) — actual API enforcement: Super Admin for approve/reject; Account Officer for visibility of own requests.  

### 2.4 Workflow (summary)

```text
Login
  → Work always scoped to assigned ULB
  → Maintain property/shop/water master and assessments
  → Generate demands and notices
  → Record payments (cashier/admin flows) / monitor collections
  → Coordinate staff (EO hierarchy) and field programs
  → Use reports for ULB decision-making
```

---

## 3. SFI (Sanitary & Food Inspector)

### 3.1 Definition

- Staff row in **`admin_management`** with **`role: SFI`**.  
- Assigned **`ulb_id`** and **`ward_ids`** (array) — backend filters sanitation/facility data to **those wards only** (`getEffectiveWardIdsForRequest`).  
- **Assignable modules** in UI: **Toilet**, **MRF**, **Gau Shala** (not Worker Management as assignable for SFI in `AdminManagement.jsx`).  

### 3.2 Login and portal

- **`/staff/login`** → **`/sfi/dashboard`** (`StaffLogin.jsx`).  
- Routes under **`/sfi/...`** in `App.jsx`: full toilet management subtree, MRF module, Gau Shala module, **`workers`** page, **`staff-management`** (Admin Management screen for their context), notifications.  

### 3.3 Typical workflows

1. **Toilet management**  
   - Facilities CRUD, inspections, complaints triage, maintenance records, staff assignment per facility, reports.  
2. **MRF**  
   - Facilities, waste entries, worker assignment page, sales, reports.  
3. **Gau Shala**  
   - Facilities, cattle, inspections, feeding, complaints, reports.  
4. **Cross-cutting**  
   - Only sees data for **assigned wards** within **their ULB** on APIs that use ward scoping.  

### 3.4 Workflow (diagram narrative)

```text
Login (Staff)
  → Dashboard
  → Pick module (Toilet / MRF / Gau Shala)
  → Record inspection / maintenance / complaint / inventory action
  → Data persisted with facility → ward → ULB linkage
  → Reports filtered to SFI wards
```

---

## 4. Collector

### 4.1 Definition

- Staff in **`admin_management`** with **`role: COLLECTOR`**.  
- Often linked to **wards** (e.g. `ward_ids` / ward assignment from Admin Management); collector UI focuses on **assigned wards** and **tasks**.  

### 4.2 Login and portal

- **`/staff/login`** → **`/collector/dashboard`**.  
- Routes (`App.jsx`): dashboard, **wards**, **properties**, tax summary, **collections**, **daily tasks**, **field visit**, **attendance**, activity logs, demand details, notifications.  

### 4.3 Typical workflows

1. **Start shift** — attendance / login hooks (logout calls staff API for attendance in `StaffAuthContext`).  
2. **View assigned wards and properties** — locate defaulters/pending demands.  
3. **Daily tasks** — work through **`collector_tasks`** linked to demands/follow-ups.  
4. **Field visit** — record **`field_visits`** against property/demand.  
5. **Collection** — record payment collection (offline flows) consistent with backend payment rules; may tie to **D2DC** records where used.  
6. **Follow-up** — update **`follow_ups`** and related notices where applicable.  

### 4.4 Workflow (summary)

```text
Login
  → Check attendance
  → Open tasks / wards / properties
  → Visit property → record visit
  → Collect payment OR escalate via follow-up / notice chain
  → Sync status to supervisor/EO via system data (monitoring pages)
```

---

## 5. Account Officer

### 5.1 Definition

- Staff in **`admin_management`** with **`role: ACCOUNT_OFFICER`**.  
- Uses **`SBMLayout`** with **`SelectedUlbProvider`** but **only** the account-officer route bundle (not full SBM).  

### 5.2 Login and portal

- **`/staff/login`** → **`/account-officer/dashboard`**.  

### 5.3 Routes (dedicated)

- `/account-officer/dashboard` — KPIs: collections, pending/approved/rejected approval requests, discount/waiver summaries.  
- `/account-officer/payments` — payment list/details.  
- `/account-officer/discounts` — **Discount management** (create requests).  
- `/account-officer/penalty-waivers` — **Penalty waiver** requests.  
- `/account-officer/approval-requests` — **track** submitted requests.  
- `/account-officer/notifications`  

### 5.4 Workflow (approval chain)

```text
Account Officer identifies need (discount or penalty waiver on a demand)
  → Creates request via Discount / Penalty Waiver UI
  → Request stored (payment_approval_requests + linked entities)
  → Super Admin reviews queue on admin-side Payment Approval Requests
  → Super Admin APPROVE → backend applies to demand + audit log + notify
     OR REJECT → Account Officer sees status in Approval Requests
```

Copy for slides from dashboard subtitle: *“Full payment-management visibility with Super Admin approval workflow.”*

---

## 6. Supervisor

### 6.1 Definition

- Staff in **`admin_management`** with **`role: SUPERVISOR`**.  
- **`assigned_modules`**: **Toilet**, **MRF**, **Gau Shala** (values `toilet`, `mrf`, `gaushala`).  
- **`ward_ids`** scoping like SFI (`getEffectiveWardIdsForRequest`).  

### 6.2 Login and portal

- **`/staff/login`** → **`/supervisor/dashboard`**.  
- Routes: dashboard, **`workers`** (`SupervisorWorkerManagement`), **toilet complaints**, **MRF** list/detail, notifications.  

### 6.3 Typical workflows

1. **Supervise field workers** — worker management under supervisor context.  
2. **Toilet complaints** — triage/monitor **`/supervisor/toilet-complaints`**.  
3. **MRF oversight** — facility list and detail for assigned scope.  
4. **Operational coordination** — link workers to wards/tasks (within assigned wards/ULB).  

### 6.4 Workflow (summary)

```text
Login
  → Dashboard overview
  → Assign/monitor workers
  → Handle toilet complaints pipeline
  → Review MRF facilities in scope
  → Escalate or record outcomes (per implemented pages)
```

---

## 7. Citizen

### 7.1 Definition

- User in **`users`** with **`role: citizen`**.  
- Self-registration allowed on **`/register`** for citizen (and admin registration per UI copy).  

### 7.2 Login and portal

- **`/citizen/login`** → **`/citizen/dashboard`** with **`CitizenLayout`**.  
- **Must** use citizen login (staff attempting citizen login are rejected; citizen attempting staff login redirected — see `CitizenLogin.jsx` / `StaffLogin.jsx`).  

### 7.3 Routes (self-service)

- **Dashboard**, **properties** (+ detail), **demands** (+ detail / shared DemandDetails), **water connections** + **connection request**, **shops** + **shop registration requests**, **notices**, **payments** + **online payment**, **activity history**, **toilet**: file complaint + complaint history, **notifications**.  

### 7.4 Typical workflows

1. **Register / login** → manage profile-linked properties.  
2. **View demands** → see arrears/current tax.  
3. **Pay online** → redirect through Razorpay flow where configured → payment stored against demand.  
4. **Apply** for water connection or shop registration → tracks request status through ULB processing (clerk/inspector/officer pipeline on staff side).  
5. **File toilet complaint** → enters **`toilet_complaints`** for ULB action.  
6. **Track notices and payment history** for compliance.  

### 7.5 Workflow (summary)

```text
Register (optional) → Login
  → Link/view properties
  → View demands & notices
  → Pay online OR await field collection
  → Submit service requests (water, shop, toilet complaint)
  → Receive notifications on updates
```

---

## 8. Role comparison matrix (for one PPT slide)

| Role | Auth table | Login URL | Primary scope | Main outcome |
|------|------------|-----------|---------------|--------------|
| **Super Admin** | `users` | `/admin/login` | All ULBs; selects ULB in UI | Governance, approvals, full config |
| **Admin** | `users` | `/admin/login` | Single `ulb_id` | ULB tax & operations |
| **SFI** | `admin_management` | `/staff/login` | ULB + assigned wards | Sanitation compliance & facility data |
| **Collector** | `admin_management` | `/staff/login` | Assigned wards/tasks | Field collection & visits |
| **Account Officer** | `admin_management` | `/staff/login` | ULB (selected context) | Payments + approval **requests** |
| **Supervisor** | `admin_management` | `/staff/login` | ULB + assigned wards | Workers + toilet/MRF oversight |
| **Citizen** | `users` | `/citizen/login` | Own records | Pay tax, request services |

---

## 9. Suggested slide order (roles only)

1. Actor diagram (context).  
2. Matrix above.  
3. One slide per role: **definition → login → 4–6 bullet workflows → screenshot placeholder**.  
4. Closing slide: **Account Officer → Super Admin approval** sequence for financial controls.  
