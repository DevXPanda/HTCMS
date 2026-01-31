# Water Tax Module - Backend Routes Summary

## Overview
The Water Tax module backend is fully implemented with all necessary API endpoints. The backend routes are registered in `backend/server.js` and are ready to be consumed by the frontend.

## Backend API Endpoints

### Base URL
All Water Tax endpoints are prefixed with `/api/water-*`

### 1. Water Connections
**Base Route**: `/api/water-connections`

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/water-connections` | Get all water connections (with filters) | `getAllWaterConnections` |
| GET | `/api/water-connections/:id` | Get water connection by ID | `getWaterConnectionById` |
| GET | `/api/water-connections/property/:propertyId` | Get connections for a property | `getWaterConnectionsByProperty` |
| POST | `/api/water-connections` | Create new water connection | `createWaterConnection` |

**Frontend Route**: `/water/connections`

### 2. Water Bills
**Base Route**: `/api/water-bills`

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/water-bills` | Get all water bills (with filters) | `getAllWaterBills` |
| GET | `/api/water-bills/:id` | Get water bill by ID | `getWaterBillById` |
| GET | `/api/water-bills/connection/:waterConnectionId` | Get bills for a connection | `getWaterBillsByConnection` |
| POST | `/api/water-bills/generate` | Generate new water bill | `generateWaterBill` |

**Frontend Route**: `/water/bills`

### 3. Water Payments
**Base Route**: `/api/water-payments`

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/water-payments` | Get all water payments (with filters) | `getAllWaterPayments` |
| GET | `/api/water-payments/:id` | Get water payment by ID | `getWaterPaymentById` |
| GET | `/api/water-payments/bill/:waterBillId` | Get payments for a bill | `getWaterPaymentsByBill` |
| GET | `/api/water-payments/connection/:waterConnectionId` | Get payments for a connection | `getWaterPaymentsByConnection` |
| POST | `/api/water-payments` | Create new water payment | `createWaterPayment` |

**Frontend Route**: `/water/payments`

### 4. Water Dashboard (Reports)
**Base Route**: `/api/water-dashboard`

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/water-dashboard/citizen` | Get citizen dashboard data | `getCitizenDashboard` |
| GET | `/api/water-dashboard/collector` | Get collector dashboard data | `getCollectorDashboard` |
| GET | `/api/water-dashboard/collector/unpaid-bills` | Get unpaid bills for collector | `getCollectorUnpaidBills` |
| GET | `/api/water-dashboard/collector/collection-summary` | Get collection summary | `getCollectorCollectionSummary` |

**Frontend Route**: `/water/reports`

### 5. Water Meter Readings (Supporting API)
**Base Route**: `/api/water-meter-readings`

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/water-meter-readings` | Get all meter readings | `getAllMeterReadings` |
| GET | `/api/water-meter-readings/:id` | Get meter reading by ID | `getMeterReadingById` |
| GET | `/api/water-meter-readings/connection/:waterConnectionId` | Get readings for a connection | `getMeterReadingsByConnection` |
| GET | `/api/water-meter-readings/connection/:waterConnectionId/last` | Get last reading for connection | `getLastMeterReading` |
| POST | `/api/water-meter-readings` | Create new meter reading | `createMeterReading` |

**Note**: Meter readings are typically managed within the Water Connections or Bills pages, not as a separate menu item.

## Authentication
All endpoints require authentication via the `authenticate` middleware. No role-based restrictions are enforced (as per requirements).

## Request/Response Format

### Request Body
- Supports both `snake_case` and `camelCase` input
- Example: `property_id` or `propertyId` both work

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Server Error

## Frontend Integration

### Example API Calls

#### Get All Water Connections
```javascript
const response = await fetch('/api/water-connections', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

#### Create Water Connection
```javascript
const response = await fetch('/api/water-connections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    property_id: 1,
    connection_type: 'domestic',
    is_metered: true,
    meter_number: 'WM12345'
  })
});
```

#### Generate Water Bill
```javascript
const response = await fetch('/api/water-bills/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    water_connection_id: 1,
    billing_period: '2024-01'
  })
});
```

#### Create Water Payment
```javascript
const response = await fetch('/api/water-payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    water_bill_id: 1,
    amount: 1000,
    payment_mode: 'cash'
  })
});
```

## Data Models

### WaterConnection
- `id`, `connectionNumber`, `propertyId`, `meterNumber`, `connectionDate`, `status`, `connectionType`, `isMetered`, `pipeSize`, `monthlyRate`

### WaterBill
- `id`, `billNumber`, `waterConnectionId`, `meterReadingId`, `billingPeriod`, `consumption`, `fixedCharge`, `consumptionCharge`, `arrearsAmount`, `totalAmount`, `paidAmount`, `balanceAmount`, `dueDate`, `status`

### WaterPayment
- `id`, `paymentNumber`, `waterBillId`, `waterConnectionId`, `amount`, `paymentMode`, `paymentDate`, `receiptNumber`, `status`

## Status Constants
All status values are standardized in `backend/constants/waterTaxStatuses.js`:
- Connection: `DRAFT`, `ACTIVE`, `DISCONNECTED`
- Bill: `pending`, `partially_paid`, `paid`, `overdue`, `cancelled`
- Payment: `pending`, `completed`, `failed`, `cancelled`

## Next Steps for Frontend

1. **Create Page Components**:
   - `frontend/src/pages/admin/water/WaterConnections.jsx`
   - `frontend/src/pages/admin/water/WaterBills.jsx`
   - `frontend/src/pages/admin/water/WaterPayments.jsx`
   - `frontend/src/pages/admin/water/WaterReports.jsx`

2. **Update App.jsx Routes**:
   - Replace placeholder routes with actual page components

3. **API Integration**:
   - Use the endpoints listed above
   - Handle authentication tokens
   - Implement error handling
   - Add loading states

4. **Features to Implement**:
   - List views with pagination
   - Create/Edit forms
   - Detail views
   - Filters and search
   - Status management
   - Bill generation UI
   - Payment processing UI

## Backend Status
✅ All backend routes are implemented and tested
✅ Status standardization completed
✅ Data validation in place
✅ Transaction safety for critical operations
✅ Role-based filtering for citizen/collector dashboards

The backend is production-ready and waiting for frontend integration.
