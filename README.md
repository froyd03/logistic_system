# 🚛 Logistic 2: Fleet and Transportation Operations
### A Production-Ready Module for Hotel & Restaurant Management Systems

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema & ER Diagram](#database-schema)
4. [Modules Implemented](#modules)
5. [API Documentation](#api-documentation)
6. [Setup & Installation](#setup)
7. [Seed Data & Test Accounts](#seed-data)
8. [Business Rules](#business-rules)
9. [Security](#security)
10. [Testing](#testing)

---

## 🏗️ System Overview

**Logistic 2** is a full-stack enterprise Fleet & Transportation Operations module built with:

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | MySQL |
| ORM | Sequelize (v6) |
| Frontend | React 18 + Hooks |
| Authentication | JWT with RBAC |
| Docs | Swagger/OpenAPI |
| Testing | Jest + Supertest |

---

## 🏛️ Architecture

```
logistic2/
├── backend/
│   ├── config/
│   │   └── database.js         # Sequelize connection pool
│   ├── controllers/
│   │   ├── authController.js   # Login, register, JWT
│   │   ├── vehicleController.js
│   │   ├── driverController.js
│   │   ├── reservationController.js
│   │   └── costController.js
│   ├── middlewares/
│   │   ├── auth.js             # JWT verify + RBAC authorize()
│   │   ├── auditMiddleware.js  # Automatic audit trail
│   │   └── errorHandler.js    # Global error handling
│   ├── models/
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Driver.js
│   │   ├── Reservation.js
│   │   ├── index.js            # All supporting models
│   │   └── associations.js     # All Sequelize relations
│   ├── routes/
│   │   └── index.js            # All API routes + Swagger docs
│   ├── services/               # Business logic services
│   ├── utils/
│   │   ├── logger.js           # Winston logger
│   │   └── response.js         # Standard JSON responses
│   ├── seeders/
│   │   └── index.js            # Demo data seeder
│   ├── tests/
│   │   └── unit.test.js        # Unit + integration tests
│   └── server.js               # Express app entry point
│
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.js  # Global auth state
        ├── services/
        │   └── api.js          # Axios API client (all endpoints)
        ├── components/
        │   └── common/
        │       ├── Layout.js   # Sidebar + main layout
        │       └── UI.js       # Shared component library
        └── pages/
            ├── Login.js
            ├── Dashboard.js
            ├── Vehicles.js
            ├── Drivers.js
            ├── Reservations.js
            ├── Expenses.js
            └── Reports.js
```

---

## 🗄️ Database Schema

### ER Diagram (Conceptual)

```
USERS ──────────────────────────────────────────────────────────────────
  │                                                                      │
  │ 1:1                                                             1:many
  ▼                                                                      ▼
DRIVERS                                                          RESERVATIONS
  │                                                                      │
  │ 1:many                                                         approved_by
  ▼                                                                      │
DRIVER_PERFORMANCE                                               DISPATCH_RECORDS
DRIVER_INCIDENTS                                                        │
                                                                         │
VEHICLES ──────────────────────────────────────────────────────────────┘
  │
  │ 1:many
  ▼
VEHICLE_MAINTENANCE
VEHICLE_DOCUMENTS
VEHICLE_STATUS_HISTORY
TRIP_LOGS ──── TRANSPORT_EXPENSES
               FUEL_LOGS
               
AUDIT_LOGS (captures all mutations)
```

### Table Descriptions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | All system users with roles | id, email, password_hash, role |
| `vehicles` | Fleet vehicles | plate_number, status, insurance_expiry |
| `vehicle_maintenance` | Service records | maintenance_type, cost, status |
| `vehicle_documents` | Uploaded docs | file_path, expiry_date |
| `vehicle_status_history` | Audit of status changes | from_status, to_status |
| `drivers` | Driver profiles | license_number, license_expiry, rating |
| `driver_performance` | Monthly KPIs | total_trips, on_time_percentage |
| `driver_incidents` | Incident reports | severity, action_taken |
| `reservations` | Trip requests | purpose, status, scheduled_start/end |
| `dispatch_records` | Confirmed dispatches | odometer_start, dispatched_at |
| `trip_logs` | Completed trip data | distance_km, duration, delay_minutes |
| `transport_expenses` | All costs | expense_type, amount |
| `fuel_logs` | Fuel fill-ups | liters, price_per_liter |
| `audit_logs` | System audit trail | action, entity, old/new values |

---

## 📦 Modules Implemented

### 1️⃣ Fleet & Vehicle Management (FVM)
- ✅ Add / Edit / Archive (soft delete) vehicles
- ✅ Track status: Available → Reserved → In Transit → Maintenance → Inactive
- ✅ Registration & Insurance expiry warnings (30-day alert)
- ✅ Maintenance history with cost tracking
- ✅ Document uploads (registration, insurance, etc.)
- ✅ Full status change audit trail
- ✅ Vehicle statistics endpoint

### 2️⃣ Vehicle Reservation & Dispatch System (VRDS)
- ✅ Create reservation requests (any staff)
- ✅ Approve/Reject (Transport Manager only)
- ✅ Vehicle + Driver assignment at approval
- ✅ **Double-booking prevention** (overlap detection)
- ✅ Dispatch with transaction (vehicle + driver status updated atomically)
- ✅ Trip completion flow (calculates delays, updates odometer, frees vehicle/driver)
- ✅ Auto-generated reservation codes (RES-000001)
- ✅ Cancellation with reason

### 3️⃣ Driver & Trip Performance Monitoring
- ✅ Driver profile management (linked to User account)
- ✅ License expiry tracking with `expired / expiring_soon / valid` states
- ✅ Driver status: Available / On Trip / Off Duty / Suspended / Inactive
- ✅ Auto-suspend on critical incident
- ✅ Cumulative stats: trips, KM, rating
- ✅ 5-star weighted rating system
- ✅ Incident reporting (minor → critical severity)
- ✅ Monthly performance metrics

### 4️⃣ Transport Cost Analysis & Optimization (TCAO)
- ✅ Expense recording by type (fuel, maintenance, toll, parking, etc.)
- ✅ Fuel log with auto-cost calculation
- ✅ Monthly breakdown charts (stacked bar by category)
- ✅ Highest cost vehicles ranking
- ✅ PDF report export (PDFKit)
- ✅ CSV export (csv-writer)
- ✅ Dashboard analytics cards + charts

---

## 📡 API Documentation

Full Swagger docs available at: `http://localhost:5000/api/docs`

### Authentication
```
POST   /api/auth/login              Login → returns JWT
POST   /api/auth/register           Register new user
GET    /api/auth/me                 Get current user profile
PUT    /api/auth/password           Change password
```

### Vehicles
```
GET    /api/vehicles                List (paginated, filterable)
GET    /api/vehicles/stats          Status counts
GET    /api/vehicles/:id            Detail + maintenance + docs
POST   /api/vehicles                Create [admin, transport_manager]
PUT    /api/vehicles/:id            Update [admin, transport_manager]
DELETE /api/vehicles/:id            Archive (soft delete) [admin]
GET    /api/vehicles/:id/status-history
POST   /api/vehicles/:id/maintenance
POST   /api/vehicles/:id/documents  (multipart/form-data)
```

### Drivers
```
GET    /api/drivers                 List (paginated, filterable)
GET    /api/drivers/:id             Detail + recent trips
POST   /api/drivers                 Create (also creates user account)
PUT    /api/drivers/:id             Update
GET    /api/drivers/:id/performance Annual monthly performance
GET    /api/drivers/:id/incidents   Incident history
POST   /api/drivers/:id/incidents   Report incident
PATCH  /api/drivers/:id/rating      Update rating
```

### Reservations & Dispatch
```
GET    /api/reservations            List (filterable by status/purpose)
GET    /api/reservations/:id        Detail
POST   /api/reservations            Create request
PATCH  /api/reservations/:id/approve  [transport_manager, admin]
PATCH  /api/reservations/:id/reject   [transport_manager, admin]
POST   /api/reservations/:id/dispatch [transport_manager, admin]
POST   /api/trips/complete          Complete trip + update all statuses
PATCH  /api/reservations/:id/cancel
```

### Analytics & Reports
```
GET    /api/dashboard/stats         KPI cards + chart data
POST   /api/expenses                Record expense
POST   /api/fuel-logs               Record fuel fillup
GET    /api/analytics/monthly       Monthly cost breakdown
GET    /api/reports/export-pdf      Download PDF report
GET    /api/reports/export-csv      Download CSV export
```

### Query Parameters
All list endpoints support: `page`, `limit`, `search`, `status`

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Step 1: Database Setup
```sql
CREATE DATABASE logistic2_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET

# Run seed data (creates tables + demo data)
npm run seed

# Start development server
npm run dev
# → Server: http://localhost:5000
# → API Docs: http://localhost:5000/api/docs
```

### Step 3: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start React app
npm start
# → App: http://localhost:3000
```

### Step 4: Verify
1. Open http://localhost:3000
2. Login with: admin@hotel.com / Admin@123
3. Explore the dashboard

---

## 👥 Seed Data & Test Accounts

After running `npm run seed`, the following accounts are created:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@hotel.com | Admin@123 | Full access |
| Transport Manager | transport@hotel.com | Manager@123 | Approve, dispatch, manage fleet |
| Driver | juan@hotel.com | Driver@123 | View own trips, complete trips |
| Driver | pedro@hotel.com | Driver@123 | View own trips |
| Staff | maria@hotel.com | Staff@123 | Create reservations |
| Staff | carlos@hotel.com | Staff@123 | Create reservations |

**Seeded Data:**
- 6 vehicles (sedan, van, van, truck, van, motorcycle)
- 2 drivers
- 3 sample reservations (approved, pending, completed)
- 2 maintenance records
- 6 months of expense and fuel log history

---

## ⚖️ Business Rules

### Vehicle Assignment Rules
```
❌ Vehicle CANNOT be assigned if:
   - status ≠ 'available'
   - insurance_expiry < today
   - already has overlapping approved reservation

✅ Double-booking prevention:
   - Checks all non-rejected/cancelled reservations for time overlap
   - Uses database-level time range overlap query
```

### Driver Assignment Rules
```
❌ Driver CANNOT be assigned if:
   - status ≠ 'available'
   - license_expiry < today
   - already on another trip

✅ Auto status updates:
   - On dispatch: driver.status → 'on_trip'
   - On trip complete: driver.status → 'available'
   - On critical incident: driver.status → 'suspended'
```

### Dispatch Lifecycle
```
pending → approved → dispatched → [in_progress] → completed
                  ↘ rejected
        ↘ cancelled (any stage before completion)
```

### Transaction Safety
- Dispatch uses DB transactions with row locking
- All status changes are atomic
- Rollback on any failure

---

## 🔐 Security

- **JWT Authentication**: 24h expiry, bearer token
- **RBAC**: admin > transport_manager > driver > staff
- **Helmet.js**: Security headers
- **Rate Limiting**: 500 req/15min per IP
- **Input Validation**: express-validator on all write endpoints
- **SQL Injection**: Protected via Sequelize ORM parameterized queries
- **Soft Delete**: Records never permanently deleted
- **Audit Logs**: All create/update/delete logged with user + IP

---

## 🧪 Testing

```bash
cd backend
npm test
```

**Test coverage includes:**
- Vehicle assignment validation logic
- Overlap detection algorithm
- Driver license validation
- Status transition rules
- Cost calculation accuracy
- Monthly expense aggregation

---

## 📊 Dashboard Cards

| Card | Data Source |
|------|------------|
| Total Vehicles | COUNT vehicles WHERE is_active=true |
| Active Drivers | COUNT drivers WHERE status='available' |
| In Transit | COUNT vehicles WHERE status='in_transit' |
| Pending Requests | COUNT reservations WHERE status='pending' |
| Monthly Cost | SUM expenses WHERE date >= month_start |
| Fuel Consumption | SUM fuel_logs.liters WHERE date >= month_start |
| Completed Trips | COUNT trip_logs WHERE status='completed' AND date >= month_start |

---

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=logistic2_db
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=change_this_in_production_min_32_chars
JWT_EXPIRE=24h
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

---

## 🎨 UI Features

- 🎨 Clean, modern dashboard with Inter font
- 📊 Recharts: Bar charts, pie charts, line charts
- 🏷️ Color-coded status badges (green/yellow/red/blue)
- 📱 Responsive grid layouts
- ⚡ Loading states and spinners
- 🔔 React Hot Toast notifications
- 🗂️ Modal forms for all CRUD operations
- 🔍 Search + filter bars
- 📄 Pagination for all lists
- ⚠️ Expiry warnings (30-day insurance/license alerts)

---

*Built for production-grade enterprise hotel/restaurant management systems*
