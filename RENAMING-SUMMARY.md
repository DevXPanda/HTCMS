# Assessment/Demand Renaming Summary

## Overview
Systematically renamed "Assessment" to "Tax Assessment" and "Demand" to "Tax Demand" throughout the system for better clarity and government-grade terminology.

## Changes Made

### Frontend Changes

#### 1. Sidebar Navigation
- **File:** `frontend/src/components/AdminSidebar.jsx`
- Changed: "Assessment" → "Tax Assessment"
- Changed: "Demand" → "Tax Demand"

#### 2. Assessment Pages
- **Files Updated:**
  - `frontend/src/pages/admin/assessments/Assessments.jsx`
  - `frontend/src/pages/admin/assessments/AddAssessment.jsx`
  - `frontend/src/pages/admin/assessments/EditAssessment.jsx`
  - `frontend/src/pages/admin/assessments/AssessmentDetails.jsx`
- **Changes:**
  - Page titles: "Assessment" → "Tax Assessment"
  - Button labels: "New Assessment" → "New Tax Assessment"
  - Toast messages: "Assessment" → "Tax Assessment"
  - Error messages: "Assessment" → "Tax Assessment"

#### 3. Demand Pages
- **Files Updated:**
  - `frontend/src/pages/admin/demands/Demands.jsx`
  - `frontend/src/pages/admin/demands/DemandDetails.jsx`
  - `frontend/src/pages/admin/demands/GenerateDemands.jsx`
- **Changes:**
  - Page titles: "Demand" → "Tax Demand"
  - Button labels: "Generate Demands" → "Generate Tax Demands"
  - Toast messages: "Demand" → "Tax Demand"
  - Error messages: "Demand" → "Tax Demand"

#### 4. Dashboard
- **File:** `frontend/src/pages/admin/Dashboard.jsx`
- **Changes:**
  - "Total Assessments" → "Total Tax Assessments"
  - "Pending Demands" → "Pending Tax Demands"
  - "Overdue Demands" → "Overdue Tax Demands"
  - "Create Assessment" → "Create Tax Assessment"
  - "Generate Demands" → "Generate Tax Demands"

### Backend Changes

#### 1. Model Comments
- **Files:**
  - `backend/models/Assessment.js` - Added comment: "Tax Assessment Model"
  - `backend/models/Demand.js` - Added comment: "Tax Demand Model"
- **Note:** Model names remain unchanged for backward compatibility

#### 2. Controller Messages
- **Files:**
  - `backend/controllers/assessment.controller.js`
  - `backend/controllers/demand.controller.js`
- **Changes:**
  - Error messages: "Assessment not found" → "Tax Assessment not found"
  - Error messages: "Demand not found" → "Tax Demand not found"
  - Route descriptions updated

### Image Upload Functionality

#### 1. Backend Upload Controller
- **File:** `backend/controllers/upload.controller.js` (NEW)
- **Features:**
  - Property photo upload (Admin, Assessor, Collector)
  - Field visit photo upload (Collector only)
  - File validation (image types, 5MB limit)
  - Unique filename generation

#### 2. Upload Routes
- **File:** `backend/routes/upload.routes.js` (NEW)
- **Endpoints:**
  - `POST /api/upload/property-photo` - Upload property photos
  - `POST /api/upload/field-visit-photo` - Upload field visit proof photos

#### 3. Server Configuration
- **File:** `backend/server.js`
- **Changes:**
  - Added upload routes
  - Added static file serving for `/uploads` directory

#### 4. Frontend Property Forms
- **Files:**
  - `frontend/src/pages/admin/properties/AddProperty.jsx`
  - `frontend/src/pages/admin/properties/EditProperty.jsx`
- **Features:**
  - File upload button with preview
  - Image preview grid
  - Remove photo functionality
  - Manual URL input (fallback)
  - Upload progress indication

#### 5. Frontend Field Visit Form
- **File:** `frontend/src/pages/collector/RecordFieldVisit.jsx`
- **Features:**
  - Photo upload for field visit proof
  - Image preview
  - Remove photo functionality
  - Manual URL input (fallback)

#### 6. API Service
- **File:** `frontend/src/services/api.js`
- **Added:**
  - `uploadAPI.uploadPropertyPhoto()`
  - `uploadAPI.uploadFieldVisitPhoto()`

### Fixed Issues

#### 1. FieldVisit visitNumber Generation
- **File:** `backend/controllers/fieldVisit.controller.js`
- **Fix:** Explicitly generate visitNumber before creating FieldVisit
- **Format:** `FV-YYYY-{sequence}` (e.g., FV-2026-000001)

#### 2. Audit Log Enum
- **Action:** Ran `npm run fix-audit-enums` to update database enums
- **Result:** All enum values (Attendance, FieldVisit, FollowUp, CollectorTask) now available

## Notes

### Backward Compatibility
- **Model names remain unchanged:** `Assessment`, `Demand` (for database/API compatibility)
- **Table names unchanged:** `assessments`, `demands` (for database compatibility)
- **API endpoints unchanged:** `/api/assessments`, `/api/demands` (for API compatibility)
- **Only display names changed:** User-facing text now shows "Tax Assessment" and "Tax Demand"

### Image Upload
- Files stored in `backend/uploads/` directory
- URLs served via `/uploads/{filename}` endpoint
- In production, consider using cloud storage (AWS S3, Cloudinary, etc.)
- File size limit: 5MB per image
- Supported formats: JPEG, PNG, GIF, WebP

### Remaining Work
Some files may still contain "Assessment" or "Demand" in:
- Internal variable names (acceptable - these are code-level)
- Database column names (unchanged for compatibility)
- API response field names (unchanged for compatibility)

All user-facing text has been updated to "Tax Assessment" and "Tax Demand".
