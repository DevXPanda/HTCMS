# HTCMS — Data flow diagrams (DFD)

Convention used below:

- **External entities**: Citizen, Staff, Super Admin, Payment gateway, Email service  
- **Processes**: numbered bubbles  
- **Data stores**: D1, D2, … (map to PostgreSQL tables/groups)  
- **Flows**: labeled arrows  

> Diagrams use **Mermaid** syntax. Render in [mermaid.live](https://mermaid.live) or any Mermaid-compatible tool, then export for PowerPoint.

---

## DFD Level 0 (context diagram)

Single system process: **HTCMS**.

```mermaid
flowchart LR
  Citizen((Citizen))
  Staff((ULB Staff))
  SuperAdmin((Super Admin))
  PG((Payment Gateway))
  Email((Email / SMS))
  HTCMS[HTCMS System]

  Citizen <-->|HTTPS: portal, pay, requests| HTCMS
  Staff <-->|HTTPS + WSS: operations| HTCMS
  SuperAdmin <-->|HTTPS: cross-ULB admin| HTCMS
  HTCMS <-->|Charge / verify payment| PG
  HTCMS -->|Notifications| Email
```

**Narration for slides:** All external actors interact only with HTCMS; the system owns business rules and persistence; payments and messaging go through external providers.

---

## DFD Level 1 — Major processes

Decompose HTCMS into logical subsystems (aligned with modules in code).

```mermaid
flowchart TB
  Citizen((Citizen))
  Staff((Staff))
  SuperAdmin((Super Admin))
  PG((Payment Gateway))

  D_USERS[(D1: users / admin_management)]
  D_MASTER[(D2: ulbs / wards)]
  D_TAX[(D3: properties / assessments / demands / payments)]
  D_WATER[(D4: water connections / bills / payments)]
  D_SHOP[(D5: shops / shop tax)]
  D_FIELD[(D6: collector tasks / visits / D2DC)]
  D_SWM[(D7: toilet / MRF / gau_shala / workers)]
  D_LOG[(D8: audit_logs / notifications)]

  P1[1.0 Authenticate & authorize]
  P2[2.0 Manage master data]
  P3[3.0 Tax: assess & bill]
  P4[4.0 Collect & reconcile]
  P5[5.0 Citizen self-service]
  P6[6.0 Field & worker ops]
  P7[7.0 Sanitation modules]
  P8[8.0 Report & notify]

  Citizen --> P1
  Staff --> P1
  SuperAdmin --> P1
  P1 --> D_USERS

  Staff --> P2
  SuperAdmin --> P2
  P2 --> D_MASTER

  Staff --> P3
  SuperAdmin --> P3
  P3 --> D_TAX
  P3 --> D_WATER
  P3 --> D_SHOP

  Citizen --> P4
  Staff --> P4
  P4 --> D_TAX
  P4 --> PG

  Citizen --> P5
  P5 --> D_TAX
  P5 --> D_WATER
  P5 --> D_SHOP

  Staff --> P6
  P6 --> D_FIELD
  P6 --> D_TAX

  Staff --> P7
  P7 --> D_SWM

  P8 --> D_LOG
  P3 --> P8
  P4 --> P8
  P7 --> P8
```

---

## DFD Level 2 — Example: Demand → Payment (property tax)

```mermaid
flowchart LR
  subgraph Staff[Staff / Admin]
    A[Generate / approve demand]
    B[Record or approve payment]
  end

  subgraph Citizen[Citizen]
    C[View demand]
    D[Pay online]
  end

  PG((Payment Gateway))

  D_DEM[(demands / demand_items)]
  D_PAY[(payments)]
  D_PROP[(properties)]

  A -->|write| D_DEM
  C -->|read| D_DEM
  C --> D
  D -->|create intent| PG
  PG -->|callback / confirm| B
  B -->|insert payment| D_PAY
  D_DEM --> D_PROP
  D_PAY --> D_DEM
```

---

## DFD Level 2 — Example: Discount / penalty waiver approval

```mermaid
flowchart TB
  AO((Account Officer))
  SA((Super Admin))

  P1[Create discount or waiver request]
  P2[Approve / reject request]
  P3[Apply to demand]

  D_REQ[(payment_approval_requests)]
  D_DEM[(demands)]
  D_DISC[(tax_discounts / penalty_waivers)]

  AO --> P1
  P1 --> D_REQ
  SA --> P2
  P2 -->|read| D_REQ
  P2 --> P3
  P3 --> D_DISC
  P3 --> D_DEM
```

This matches backend messaging: Account Officer submits; **only Super Admin** approves/rejects in `paymentApprovalRequest.controller.js`.

---

## DFD Level 2 — Example: Citizen water connection request

```mermaid
flowchart LR
  Citizen((Citizen))
  P1[Submit connection request]
  P2[Inspect / process]
  P3[Create connection & assessment]

  D_REQ[(water_connection_requests)]
  D_CONN[(water_connections)]

  Citizen --> P1
  P1 --> D_REQ
  P2 --> D_REQ
  P3 --> D_CONN
  P2 --> P3
```

(Exact steps depend on Clerk/Inspector/Officer involvement; entities are in `WaterConnectionRequest` model.)

---

## Tabular mapping: data stores → DB groups

| Store ID | Tables (representative) |
|----------|-------------------------|
| D1 | `users`, `admin_management` |
| D2 | `ulbs`, `wards` |
| D3 | `properties`, `assessments`, `demands`, `demand_items`, `payments`, `notices`, `penalty_rules`, `tax_discounts`, `penalty_waivers`, `payment_approval_requests` |
| D4 | `water_connections`, `water_bills`, `water_payments`, `water_tax_assessments`, `water_connection_requests` |
| D5 | `shops`, `shop_tax_assessments`, `shop_registration_requests` |
| D6 | `collector_tasks`, `field_visits`, `follow_ups`, `collector_attendance`, `d2dc_records` |
| D7 | Toilet/MRF/Gau Shala/Worker tables |
| D8 | `audit_logs`, `notifications`, `alerts` |

---

## How to use in a PPT

1. **Slide 1**: Level 0 context (actors + HTCMS).  
2. **Slide 2**: Level 1 decomposition (processes 1.0–8.0).  
3. **Slide 3–5**: Level 2 for **payment**, **approval workflow**, and **citizen request** (pick what your audience cares about).  
