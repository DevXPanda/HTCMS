# HTCMS — Database design

## 1. Design approach

- **RDBMS**: PostgreSQL (runtime; Sequelize models in `backend/models/`).  
- **ORM**: Sequelize — tables map to `sequelize.define` models; relationships centralized in `backend/models/index.js`.  
- **Multi-tenancy**: **`ulbs`** → **`wards`** → most taxable assets (**`properties`**, **`shops`**, links for water, etc.).  
- **Staff vs citizen**: **`users`** (citizens + user-table admins) vs **`admin_management`** (ULB staff).  

## 2. Core entity groups

### 2.1 Organization & access

| Entity (table) | Purpose |
|----------------|---------|
| **`ulbs`** | ULB master (name, codes, metadata) |
| **`wards`** | Wards under a ULB; may link to collector/clerk/inspector/officer staff ids (legacy columns on `wards`) |
| **`users`** | Citizens (`role: citizen`), portal admins (`admin` / `assessor` / `cashier`), legacy enum roles; optional `ulb_id` |
| **`admin_management`** | Staff accounts: EO, Supervisor, Collector, SFI, Account Officer, SBM, etc.; `ulb_id`, `ward_ids[]`, `eo_id`, `supervisor_id`, `assigned_modules` (SFI/Supervisor) |

### 2.2 Property tax chain

| Entity | Purpose |
|--------|---------|
| **`properties`** | Property master; `ownerId` → `users`, `wardId` → `wards` |
| **`assessments`** | Assessed values / tax basis; links to property and assessor/approver users |
| **`demands`** | Tax demand per property (and links to water/shop assessments when unified); **`demand_items`** for line items |
| **`payments`** | Collections against demands; links to `receivedBy` / `collectedBy` (User and/or AdminManagement per model) |
| **`notices`** | Demand notices; escalation chain via `previousNoticeId` |
| **`tax_discounts`**, **`penalty_waivers`** | Adjustments tied to demands |
| **`payment_approval_requests`** | Discount / penalty waiver requests — Account Officer raises, Super Admin approves (see controller messages) |
| **`penalty_rules`** | Rule configuration |

### 2.3 Water tax

| Entity | Purpose |
|--------|---------|
| **`water_connections`**, **`water_meter_readings`**, **`water_bills`**, **`water_payments`** | Connection lifecycle and billing |
| **`water_tax_assessments`** | Assessment linkage to property/connection |
| **`water_connection_requests`** | Citizen/clerk workflow for new connections |
| **`water_connection_documents`** | Uploaded documents |

### 2.4 Shop tax

| Entity | Purpose |
|--------|---------|
| **`shops`**, **`shop_tax_assessments`**, **`shop_registration_requests`** | Shop registration and assessment |

### 2.5 Field collection & D2DC

| Entity | Purpose |
|--------|---------|
| **`collector_attendance`**, **`field_visits`**, **`follow_ups`**, **`collector_tasks`** | Collector operations |
| **`d2dc_records`** | Door-to-door collection activity linkage |

### 2.6 Workers (sanitation / field workforce)

| Entity | Purpose |
|--------|---------|
| **`workers`**, **`worker_attendances`**, **`worker_payrolls`**, **`worker_tasks`** | Worker registry, attendance, payroll approval chain, tasks |

### 2.7 Toilet / MRF / Gau Shala

| Entity | Purpose |
|--------|---------|
| **`toilet_facilities`**, **`toilet_inspections`**, **`toilet_maintenance`**, **`toilet_staff_assignments`**, **`toilet_complaints`** | Community toilet lifecycle |
| **`mrf_facilities`**, **`mrf_waste_entries`**, **`mrf_worker_assignments`**, **`mrf_tasks`**, **`mrf_sales`** | MRF operations |
| **`gau_shala_facilities`**, **`gau_shala_cattle`**, **`gau_shala_complaints`**, **`gau_shala_feeding_records`**, **`gau_shala_inspections`**, **`cattle_medical_records`** | Gau Shala |
| **`inventory_items`**, **`inventory_transactions`** | Stock movements |
| **`facility_utility_bills`** | Utilities for facilities |

### 2.8 Cross-cutting

| Entity | Purpose |
|--------|---------|
| **`audit_logs`** | Who did what (actor `actorUserId` → User) |
| **`alerts`** | System/operational alerts |
| **`notifications`** | User/staff notification records |
| **`citizen_feedback`** | Feedback capture |
| **`property_applications`** | New property registration workflow |

## 3. Key relationships (simplified ER narrative)

```text
ULB (1) ──< Ward (N)
Ward (1) ──< Property (N)
User[citizen] (1) ──< Property (N) [as owner]

Property (1) ──< Assessment (N) ──< Demand (N) ──< Payment (N)
Demand (1) ──< DemandItem (N)
Demand (1) ──< TaxDiscount / PenaltyWaiver / PaymentApprovalRequest

Property (1) ──< WaterConnection (N) ──< WaterBill / WaterPayment / MeterReading

AdminManagement [EO] (1) ──< AdminManagement [subordinates] (N)  [via eo_id, supervisor_id]
Worker (N) ──> AdminManagement [supervisor / eo / contractor]
```

Full foreign keys and aliases are defined in **`backend/models/index.js`**.

## 4. Cardinality examples (for slides)

| Relationship | Cardinality |
|--------------|-------------|
| ULB → Wards | 1 : N |
| Ward → Properties | 1 : N |
| Property → Demands | 1 : N |
| Demand → Payments | 1 : N |
| Demand → DemandItems | 1 : N |
| ToiletFacility → Inspections | 1 : N |

## 5. Indexes and constraints (conceptual)

- **Unique** constraints: `users.username`, `users.email`, `admin_management.employee_id`, `admin_management.phone_number`, etc. (see individual model files).  
- **ENUM** types: `users.role` (legacy set), `admin_management.role` (staff enum including SFI, ACCOUNT_OFFICER, …).  
- **Arrays**: `admin_management.ward_ids` for SFI/Supervisor ward scoping.  

## 6. Data integrity rules (business-level)

1. **ULB isolation**: Non–super-admin users must not read/write other ULBs’ operational data — enforced in controllers using `effectiveUlbId` and ward filters.  
2. **Payment integrity**: Payments reference `demandId` / `propertyId` as modeled; approval requests gate certain discounts/waivers.  
3. **Audit trail**: Sensitive approvals log to **`audit_logs`** (e.g. payment approval controller references Super Admin actions).  

## 7. PPT suggestion

Include one **simplified ER diagram** showing: **ULB → Ward → Property → Demand → Payment** plus side branches **WaterConnection** and **Shop**, and a separate box for **admin_management** linked to **ULB** and **Ward**.
