# Silai Master — Multi-Tenant Tailor Management System

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%20--%20v24-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/Express-4.21.2-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Mongoose](https://img.shields.io/badge/Mongoose-8.9.5-green.svg)](https://mongoosejs.com/)
[![Vite Version](https://img.shields.io/badge/Vite-6.0.7-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-gold.svg)](#)

A modern, high-performance, multi-tenant bespoke tailoring and apparel studio management platform built on the MERN stack (MongoDB, Express, React with Vite, Node.js). Designed specifically for tailor shops and custom apparel houses in India and globally, providing complete control over customer profiles, customizable measurement configurations (with bilingual English & Gujarati script support), pattern choices, collision-safe atomic order sequencing, high-DPI printable PDF job slips, automated 7-day backups, and platform-level superadministrator oversight.

---

## Table of Contents

1. [Project Purpose & Problem Solved](#1-project-purpose--problem-solved)
2. [Key Features](#2-key-features)
3. [User Roles & Permissions Matrix](#3-user-roles--permissions-matrix)
4. [Technology Stack & Detected Versions](#4-technology-stack--detected-versions)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Project Folder Structure](#6-project-folder-structure)
7. [Prerequisites](#7-prerequisites)
8. [Installation & Local Setup Guide (Windows & Cross-Platform)](#8-installation--local-setup-guide)
9. [Frontend Setup & Startup](#9-frontend-setup--startup)
10. [Backend Setup & Startup](#10-backend-setup--startup)
11. [MongoDB Setup & Connection Details](#11-mongodb-setup--connection-details)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Database Models, Schemas & Relationships](#13-database-models-schemas--relationships)
14. [Complete API Reference by Feature](#14-complete-api-reference-by-feature)
15. [Authentication & Strict Tenant Isolation](#15-authentication--strict-tenant-isolation)
16. [Customer & Order End-to-End Workflow](#16-customer--order-end-to-end-workflow)
17. [Measurement & Pattern Configuration Lifecycle](#17-measurement--pattern-configuration-lifecycle)
18. [PDF Job Slip Engine & Gujarati Unicode Rendering](#18-pdf-job-slip-engine--gujarati-unicode-rendering)
19. [Audit Logging & Platform Superadministrator Operations](#19-audit-logging--platform-superadministrator-operations)
20. [Input Validation & Centralized Error Handling](#20-input-validation--centralized-error-handling)
21. [Testing, Linting, Build & Verification Commands](#21-testing-linting-build--verification-commands)
22. [Production Deployment Instructions](#22-production-deployment-instructions)
23. [Security Considerations & Backup Operations](#23-security-considerations--backup-operations)
24. [Known Limitations & Current Scope](#24-known-limitations--current-scope)
25. [Troubleshooting Guide for Common Setup Issues](#25-troubleshooting-guide-for-common-setup-issues)
26. [Future Enhancements Roadmap](#26-future-enhancements-roadmap)

---

## 1. Project Purpose & Problem Solved

Traditional tailor studios struggle with paper measurement books, lost client measurement cards, missing garment notes, untracked delivery deadlines, and chaotic order handoffs between the front desk and master cutters. Furthermore:
- Tailors require **custom measurement fields** tailored to their craft (e.g. Kurta lengths, waistbands, pocket styles), which hardcoded software solutions cannot accommodate.
- Regional workshops in Gujarat and across India require **Gujarati script (લંબાઈ, છાતી, કમર, શોલ્ડર)** on printed tailor chits/slips so cutters and stitchers can understand orders without errors.
- Studio owners need strict **business data privacy** so one tailor shop cannot view another shop's customer base, order volume, or proprietary measurements.
- Historical orders must **never lose historical measurement snapshots** when studio measurement settings are updated or reordered.

**Silai Master** delivers an elegant, multi-tenant digital solution that solves these challenges with zero paper loss, atomic order numbering, dynamic custom measurements, and high-fidelity PDF slips.

---

## 2. Key Features

- **Multi-Tenant SaaS Architecture**: Each tailor business operates in complete tenant isolation with dedicated customers, orders, measurement definitions, patterns, and counters.
- **Dynamic Website Branding**: Dynamic browser title tabs and header branding automatically display the authenticated tenant's real business name (e.g., `Om Tailor`) or fallback gracefully.
- **Bilingual Gujarati & English Support**: Full Unicode rendering of Gujarati field names (`લંબાઈ`, `છાતી`, `કમર`, `શોલ્ડર`, `સામે ની છાતી`, etc.) with dedicated Google Font integration.
- **Dynamic Measurement Definitions Engine**: Configure, reorder, mark required, or toggle active/inactive status for shirt and pant measurement fields. No hardcoded field arrays in forms.
- **Immutable Historical Order Snapshots**: Changing or deactivating measurement definitions in studio settings never alters or corrupts historical orders or past customer measurement archives.
- **Collision-Safe Atomic Order Numbering**: Distributed atomic MongoDB `$inc` counters generate predictable sequential order IDs (`ORD-YYYY-XXXXX`) scoped to each tenant.
- **Safe Customer Deletion & Archival**: Customers with active or historical orders are protected against accidental permanent deletion, providing one-click safe archival to preserve past order history.
- **Dynamic Pattern Management**: Studios can create custom shirt and pant patterns (e.g., *Kurta Collar*, *Checks Premium*, *Pencil Fit*, *Two Pocket*) with custom text annotations.
- **High-DPI PDF Job Slip Engine**: Direct client-side vector-and-canvas hybrid generation of printable customer receipts and workshop slips without mojibake or broken characters.
- **7-Day Automated Backup System**: Scheduled `node-cron` background backup serialized to local server disk (`server/backups/`) with one-click browser `localStorage` caching and full MongoDB database restoration.
- **Platform Owner (Superadmin) Portal**: Dedicated portal at `/owner/*` for managing tenants, provisioning accounts, resetting passwords, and viewing activity audit logs with date-wise IST deletion.
- **Mobile-Responsive Navy & Gold Aesthetic**: Crafted with bespoke tailoring aesthetics featuring Rich Navy (`#0B1F3A`), Deep Navy (`#142D4E`), Tailor Gold (`#D4AF37`), and Warm Neutral Canvas (`#F8F7F2`).

---

## 3. User Roles & Permissions Matrix

| Capability / Resource | Platform Owner (`platform_owner`) | Studio Admin / Tailor (`admin` / `tailor`) | Unauthenticated User |
|---|:---:|:---:|:---:|
| Dedicated Portal URL | `/owner/*` (`/owner/login`) | `/*` (`/login`) | `/login`, `/owner/login` |
| View System Health Check | Yes | Yes | Yes (`/api/health`) |
| Provision New Tenants | Yes | No | No |
| Activate / Deactivate / Archive Tenants | Yes | No | No |
| Reset Tenant Admin Password | Yes | No | No |
| View Platform Activity Audit Logs | Yes | No | No |
| Delete Activity Logs by Date (IST) | Yes | No | No |
| Access Business Dashboard | No (Platform view) | Yes (Tenant-scoped) | No |
| Create / View / Edit / Delete Orders | No (Cross-tenant guard) | Yes (Own tenant only) | No |
| Create / View / Edit / Archive Customers | No | Yes (Own tenant only) | No |
| Configure Measurement Definitions | No | Yes (Own tenant only) | No |
| Configure Clothing Patterns | No | Yes (Own tenant only) | No |
| Trigger / Download / Restore Backups | No | Yes (Studio Admin) | No |

---

## 4. Technology Stack & Detected Versions

### Backend (Node.js & Express API)
- **Node.js**: v18.0.0+ (Tested in production on Node.js v24.x)
- **Express**: `^4.21.2` (RESTful routing, middleware pipelines)
- **MongoDB & Mongoose**: `^8.9.5` (Document modeling, schema validation, compound indexes)
- **bcryptjs**: `^2.4.3` (10-round salted password hashing)
- **jsonwebtoken**: `^9.0.2` (Stateless HMAC-SHA256 JWT tokens)
- **node-cron**: `^4.6.0` (Automated 7-day scheduled backups)
- **cors**: `^2.8.5` (CORS origin validation)
- **morgan**: `^1.10.0` (HTTP access logging)
- **dotenv**: `^16.4.7` (Environment configuration loading)
- **nodemon** (Dev): `^3.1.9` (Hot-reload development server)

### Frontend (Single Page Application)
- **React**: `^18.3.1` (Component-driven UI, Strict Mode compatible)
- **React DOM**: `^18.3.1` (Concurrent DOM rendering)
- **React Router DOM**: `^6.28.1` (Client-side nested routing, protected routes)
- **Vite**: `^6.0.7` (Ultra-fast ESM bundler and HMR dev server)
- **@vitejs/plugin-react**: `^4.3.4` (Babel/Fast-Refresh plugin)
- **lucide-react**: `^0.469.0` (Modern icon system)
- **jspdf**: `4.x` (Local tarball dependency with client-side canvas rasterization)
- **Google Fonts**: Inter (UI typography) & Noto Sans Gujarati (Regional Indian script rendering)

---

## 5. System Architecture Overview

```
                          ┌──────────────────────────────────────────────┐
                          │         Web Browser (Desktop / Mobile)       │
                          │   Dynamic Title: "Orders | Om Tailor"        │
                          └───────┬──────────────────────────────┬───────┘
                                  │                              │
                    Tailor Portal │                              │ Owner Portal
                    (Port 5173)   │                              │ (/owner/*)
                                  ▼                              ▼
                          ┌──────────────────────────────────────────────┐
                          │               Vite Dev / Nginx               │
                          │         React 18 SPA (Vanilla CSS)           │
                          │      Bilingual Noto Sans Gujarati Canvas     │
                          └──────────────────────┬───────────────────────┘
                                                 │ Reverse Proxy /api
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │          Express 4.21.2 Backend API          │
                          │                 (Port 5000)                  │
                          └──────┬───────────────┬───────────────┬───────┘
                                 │               │               │
                     requireAuth │   requireTenant│   requireOwner│
                                 ▼               ▼               ▼
                          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                          │  Auth & Me  │ │ Orders, Cust│ │ Tenant Mgmt │
                          │ Controllers │ │ Measurements│ │ Audit Logs  │
                          └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                                 │               │               │
                                 └───────┬───────┴───────────────┘
                                         ▼
                          ┌──────────────────────────────────────────────┐
                          │         MongoDB Database (v6 / v7)           │
                          │     Tenants, Users, Customers, Orders,       │
                          │    MeasurementDefinitions, Patterns, Logs    │
                          └──────────────────────────────────────────────┘
```

---

## 6. Project Folder Structure

```
d:/YASH KACHA/Tai/
├── package.json                   # Root workspace scripts (test, build, install)
├── README.md                      # Comprehensive production system documentation
├── MULTI_TENANT_GUIDE.md          # Multi-tenant operational & migration guide
├── OWNER_ADMIN_GUIDE.md           # Superadministrator management documentation
├── .gitignore                     # Git exclusion rules for node_modules, .env, backups
│
├── client/                        # React Frontend Application (Vite)
│   ├── package.json               # Frontend dependencies & scripts
│   ├── vite.config.js             # Vite configuration with /api reverse proxy
│   ├── index.html                 # HTML shell with Google Fonts & dynamic title script
│   └── src/
│       ├── api/                   # Modular API clients (auth, orders, customers, etc.)
│       ├── components/            # Reusable UI components
│       │   ├── common/            # Buttons, Modals, Loading, StatusBadge, Pagination
│       │   ├── layout/            # AppLayout, Header, Sidebar
│       │   ├── orders/            # StatusChangeModal, OrderPrintSlip
│       │   └── owner/             # OwnerLayout, OwnerSidebar
│       ├── context/               # AuthContext, ToastContext
│       ├── pages/                 # Tenant routes (Dashboard, CreateOrder, Orders, etc.)
│       │   └── owner/             # Owner routes (OwnerDashboard, Tenants, ActivityLogs)
│       ├── routes/                # ProtectedRoute & OwnerProtectedRoute guards
│       ├── services/              # orderSlipPdfService.js (Gujarati Canvas Rasterizer)
│       ├── utils/                 # dateUtils.js, currency formatters
│       ├── App.jsx                # Route hierarchy & page mapping
│       ├── main.jsx               # Application entry point
│       └── index.css              # Custom Vanilla CSS Design System Tokens
│
└── server/                        # Express.js Backend API
    ├── package.json               # Backend dependencies & scripts
    ├── .env.example               # Sanitized environment template
    ├── backups/                   # Disk storage directory for 7-day automated backups
    └── src/
        ├── app.js                 # Express application, CORS, JSON parser, route mounts
        ├── server.js              # Server bootstrapper, MongoDB connection, cron init
        ├── config/
        │   └── db.js              # Mongoose connection with error handling
        ├── models/                # Mongoose models with compound & unique indexes
        │   ├── Tenant.js          # Studio tenant model
        │   ├── User.js            # User accounts & roles
        │   ├── Customer.js        # Customer contact & measurement profiles
        │   ├── Order.js           # Orders with immutable measurement snapshots
        │   ├── OrderCounter.js    # Concurrency-safe atomic tenant order sequence
        │   ├── MeasurementDefinition.js # Dynamic configurable measurement fields
        │   ├── Pattern.js         # Custom clothing pattern configurations
        │   └── AuditLog.js        # Activity audit log records
        ├── middleware/
        │   ├── authMiddleware.js  # requireAuth, requireTenant, requireOwner
        │   └── errorMiddleware.js # Centralized JSON error response handler
        ├── controllers/           # REST business logic controllers
        ├── routes/                # Express router declarations
        ├── services/              # cronService.js (7-day automated backups)
        └── scripts/               # Test suites, seeders, verification runners
```

---

## 7. Prerequisites

Before installing and running the system, ensure you have:
1. **Node.js**: `v18.0.0` or higher (verified on Node.js v24.x). Check with `node -v`.
2. **npm**: `v9.0.0` or higher. Check with `npm -v`.
3. **MongoDB**: Local MongoDB Community Edition running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection string. Check with `mongosh` or `mongo`.
4. **Git**: Version control CLI. Check with `git --version`.

---

## 8. Installation & Local Setup Guide

### Windows PowerShell Setup

```powershell
# 1. Clone or navigate to the project directory
cd "d:\YASH KACHA\Tai"

# 2. Install all dependencies across root, server, and client
npm run install:all

# 3. Create server environment configuration
Copy-Item "server\.env.example" "server\.env"

# 4. Bootstrap the Platform Owner (Superadmin) account
node server/src/scripts/bootstrap_owner.js

# 5. Seed initial demo tailor business & data
npm run seed
```

### Linux / macOS Bash Setup

```bash
# 1. Navigate to directory
cd "/path/to/Tai"

# 2. Install dependencies
npm run install:all

# 3. Copy environment configuration
cp server/.env.example server/.env

# 4. Bootstrap Superadmin & Seed database
node server/src/scripts/bootstrap_owner.js
npm run seed
```

---

## 9. Frontend Setup & Startup

The client application runs via Vite.

```bash
# Navigate to client directory
cd client

# Install frontend dependencies (if not run via root)
npm install

# Start Vite development server
npm run dev
```

The frontend will start on **`http://localhost:5173`**.
- Vite automatically proxies `/api/*` network requests to `http://localhost:5000`.

To create an optimized production bundle:
```bash
npm run build
```
Production assets are generated into `client/dist/`.

---

## 10. Backend Setup & Startup

The server runs on Express.js with ES Modules (`"type": "module"`).

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Start server in hot-reload development mode
npm run dev

# Or start in standard production mode
npm start
```

The backend server listens on **`http://localhost:5000`**.

---

## 11. MongoDB Setup & Connection Details

By default, the server connects to local MongoDB via `server/.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/tailor_management
```

### Starting MongoDB locally
- **Windows (Service)**: Ensure the `MongoDB` Windows Service is running via `services.msc` or run `net start MongoDB` in Administrator PowerShell.
- **Linux (systemd)**: `sudo systemctl start mongod`
- **macOS (Homebrew)**: `brew services start mongodb/brew/mongodb-community`

### Using MongoDB Atlas (Cloud)
Set `MONGODB_URI` in `server/.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/tailor_management?retryWrites=true&w=majority
```

---

## 12. Environment Variables Reference

All backend environment variables are stored in `server/.env`. Safe placeholders:

| Variable | Required | Default Value | Description |
|---|:---:|---|---|
| `PORT` | No | `5000` | Port on which the Express server listens |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/tailor_management` | MongoDB connection URI |
| `JWT_SECRET` | Yes | `super_secret_tailor_management_key_2026_xyz` | Secret key used for signing JWT authentication tokens |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed frontend origin for CORS policies |
| `BACKUP_CRON_SCHEDULE` | No | `0 2 * * 0` | Cron expression for 7-day automated backups (Sundays 02:00 AM) |
| `BACKUP_DIR` | No | `./backups` | Disk directory where serialized JSON backups are saved |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |

*(Never commit your real `.env` file containing production secrets or passwords to Git. The `.gitignore` file enforces this automatically).*

---

## 13. Database Models, Schemas & Relationships

### 1. `Tenant`
Represents an individual tailoring business subscribing to the platform.
- **Key Fields**: `businessName`, `tenantCode` (unique, uppercase), `ownerName`, `email`, `mobileNumber`, `status` (`'active'`, `'inactive'`, `'archived'`, `'deleting'`).
- **Indexes**: Unique index on `tenantCode`, text index on `{ businessName, tenantCode, ownerName, email, mobileNumber }`.

### 2. `User`
Accounts for studio staff and the platform superadmin.
- **Key Fields**: `name`, `email` (unique, lowercase), `passwordHash` (bcrypt), `role` (`'platform_owner'`, `'admin'`, `'tailor'`, `'staff'`), `tenantId` (ObjectId ref to Tenant, null for superadmin), `isActive`, `mustChangePassword`.
- **Methods**: `comparePassword(candidate)`, `hashPassword(password)`.

### 3. `Customer`
Customer address book and permanent saved measurement profiles.
- **Key Fields**: `tenantId` (ObjectId ref), `name`, `mobileNumber` (10 digits), `address`, `notes`, `latestMeasurements` (shirt & pant measurement snapshots and patterns), `isActive`, `isArchived`, `archivedAt`.
- **Indexes**: Compound index `{ tenantId: 1, mobileNumber: 1 }` (mobile numbers unique within tenant), `{ tenantId: 1, createdAt: -1 }`.

### 4. `Order`
Tailoring job order with atomic sequence number and immutable historical snapshot.
- **Key Fields**: `tenantId`, `orderNumber` (`ORD-YYYY-XXXXX`), `customer` (ref Customer), `customerSnapshot` (`{ name, mobileNumber, address }`), `orderDate`, `deadline`, `deliveryTime`, `status` (`'in_progress'`, `'ready'`, `'delivered'`, `'cancelled'`), `shirt` (`quantity`, `patterns`, `measurements`), `pant` (`quantity`, `patterns`, `measurements`), `measurementSnapshot` (immutable array of `{ fieldKey, displayName, gujaratiName, fieldType, value }`), `pricing` (`shirtPrice`, `pantPrice`, `total`, `advancePaid`, `balanceDue`).
- **Indexes**: Compound unique index `{ tenantId: 1, orderNumber: 1 }`, `{ tenantId: 1, status: 1, deadline: 1 }`.

### 5. `OrderCounter`
Atomic sequence counter for collision-safe order numbering.
- **Key Fields**: `name` (`order_seq_${tenantId}_${year}`), `seq` (Number).

### 6. `MeasurementDefinition`
Studio-specific configurable measurement fields.
- **Key Fields**: `tenantId`, `category` (`'shirt_measurement'`, `'pant_measurement'`), `fieldKey`, `displayName`, `gujaratiName`, `fieldType` (`'number'`, `'text'`), `isRequired`, `isActive`, `isDeleted`, `displayOrder`.
- **Indexes**: Compound unique index `{ tenantId: 1, category: 1, fieldKey: 1 }`.

### 7. `Pattern`
Tenant-scoped selectable clothing patterns.
- **Key Fields**: `tenantId`, `name`, `type` (`'shirt'`, `'pant'`), `isActive`.
- **Indexes**: Compound index `{ tenantId: 1, type: 1, name: 1 }`.

### 8. `AuditLog`
Security and administrative activity trail.
- **Key Fields**: `actor` (ref User), `actorEmail`, `actorRole`, `action`, `targetTenant`, `targetTenantName`, `details`, `ipAddress`, `userAgent`, `createdAt`.
- **Indexes**: Index on `createdAt: -1`.

---

## 14. Complete API Reference by Feature

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `POST` | `/api/auth/login` | No | Tenant User | Authenticate tailor studio user, returns JWT token |
| `POST` | `/api/auth/owner-login` | No | Platform Owner | Authenticate platform superadmin |
| `GET` | `/api/auth/me` | Bearer JWT | Any | Get currently authenticated user and tenant profile |
| `POST` | `/api/auth/change-password` | Bearer JWT | Any | Change password (enforces 8+ chars and clears `mustChangePassword`) |
| `POST` | `/api/auth/logout` | Bearer JWT | Any | Stateless session logout |

### Orders (`/api/orders`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/orders` | Bearer JWT | Tenant | List orders with pagination, search, status & date filters |
| `POST` | `/api/orders` | Bearer JWT | Tenant | Create order with atomic sequence number & measurement snapshot |
| `GET` | `/api/orders/:id` | Bearer JWT | Tenant | Get single order details with customer population |
| `PUT/PATCH` | `/api/orders/:id` | Bearer JWT | Tenant | Update order details, measurements, or pricing |
| `PATCH` | `/api/orders/:id/status` | Bearer JWT | Tenant | Update status (`in_progress`, `ready`, `delivered`, `cancelled`) |
| `DELETE` | `/api/orders/:id` | Bearer JWT | Tenant | Delete order (retains customer profile and order history integrity) |

### Customers (`/api/customers`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/customers` | Bearer JWT | Tenant | List active customers with search, sort, and order counts |
| `POST` | `/api/customers` | Bearer JWT | Tenant | Create new customer (validates 10-digit mobile uniqueness in tenant) |
| `GET` | `/api/customers/:id` | Bearer JWT | Tenant | Get customer profile & latest saved measurements |
| `PUT/PATCH` | `/api/customers/:id` | Bearer JWT | Tenant | Update customer contact information |
| `PATCH` | `/api/customers/:id/measurements` | Bearer JWT | Tenant | Update customer permanent measurement profile |
| `GET` | `/api/customers/:id/orders` | Bearer JWT | Tenant | Get complete order history for customer |
| `DELETE` | `/api/customers/:id` | Bearer JWT | Tenant | Delete customer (blocked if orders exist; accepts `?archive=true`) |
| `POST` | `/api/customers/:id/archive` | Bearer JWT | Tenant | Safe archive customer to preserve historical order snapshots |

### Measurement Definitions (`/api/measurement-definitions`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/measurement-definitions` | Bearer JWT | Tenant | Get tenant measurement definitions (`?active=true` for form) |
| `POST` | `/api/measurement-definitions` | Bearer JWT | Tenant | Create custom measurement field (with Gujarati name & validation) |
| `PUT` | `/api/measurement-definitions/reorder` | Bearer JWT | Tenant | Reorder fields display sequence |
| `PUT/PATCH` | `/api/measurement-definitions/:id` | Bearer JWT | Tenant | Edit field display name, Gujarati name, or required state |
| `PATCH` | `/api/measurement-definitions/:id/status`| Bearer JWT | Tenant | Toggle active/inactive state |
| `DELETE` | `/api/measurement-definitions/:id` | Bearer JWT | Tenant | Soft-delete definition (preserves existing order snapshots) |

### Clothing Patterns (`/api/patterns`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/patterns` | Bearer JWT | Tenant | List shirt and pant patterns for tenant |
| `POST` | `/api/patterns` | Bearer JWT | Tenant | Create new pattern with duplicate prevention |
| `PATCH` | `/api/patterns/:id/status` | Bearer JWT | Tenant | Toggle pattern active/inactive status |
| `PUT/PATCH` | `/api/patterns/:id` | Bearer JWT | Tenant | Edit pattern name |
| `DELETE` | `/api/patterns/:id` | Bearer JWT | Tenant | Safely delete pattern |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/dashboard/summary` | Bearer JWT | Tenant | Aggregated live counts: total, due today, overdue, pending, completed |

### Backups (`/api/backups`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `GET` | `/api/backups` | Bearer JWT | Studio Admin | Cron schedule status, disk file metrics |
| `POST` | `/api/backups/trigger` | Bearer JWT | Studio Admin | Manually trigger full JSON backup to disk |
| `GET` | `/api/backups/latest-data` | Bearer JWT | Studio Admin | Get latest serialized data for browser localStorage caching |
| `GET` | `/api/backups/download/:file`| Bearer JWT | Studio Admin | Download backup JSON file |
| `POST` | `/api/backups/restore/:file` | Bearer JWT | Studio Admin | Restore database from local server backup file |
| `POST` | `/api/backups/restore-data` | Bearer JWT | Studio Admin | Restore database from uploaded JSON payload |
| `DELETE` | `/api/backups/:file` | Bearer JWT | Studio Admin | Delete old backup file from disk |

### Platform Owner Portal (`/api/owner`)
| Method | Endpoint | Auth | Role | Description |
|---|---|:---:|:---:|---|
| `POST` | `/api/owner/login` | No | Superadmin | Platform Owner login |
| `GET` | `/api/owner/stats` | Bearer JWT | Superadmin | Platform-wide aggregate metrics (tenants, orders, revenue) |
| `GET` | `/api/owner/tenants` | Bearer JWT | Superadmin | List all tenants with search, status filters, and pagination |
| `POST` | `/api/owner/tenants` | Bearer JWT | Superadmin | Provision new studio tenant and generate initial admin credentials |
| `GET` | `/api/owner/tenants/:id` | Bearer JWT | Superadmin | Detailed tenant profile, user list, and business metrics |
| `PATCH` | `/api/owner/tenants/:id` | Bearer JWT | Superadmin | Edit tenant business details |
| `POST` | `/api/owner/tenants/:id/activate` | Bearer JWT | Superadmin | Activate suspended tenant |
| `POST` | `/api/owner/tenants/:id/deactivate` | Bearer JWT | Superadmin | Suspend tenant access |
| `POST` | `/api/owner/tenants/:id/archive` | Bearer JWT | Superadmin | Archive tenant business |
| `POST` | `/api/owner/tenants/:id/restore` | Bearer JWT | Superadmin | Restore archived tenant |
| `DELETE`| `/api/owner/tenants/:id` | Bearer JWT | Superadmin | Soft-delete tenant |
| `POST` | `/api/owner/tenants/:id/reset-password` | Bearer JWT | Superadmin | Reset tenant admin password |
| `GET` | `/api/owner/activity-logs` | Bearer JWT | Superadmin | View audit trail logs with search and date filters |
| `DELETE/POST` | `/api/owner/activity-logs/delete-by-date` | Bearer JWT | Superadmin | Delete audit logs for a single calendar day in Asia/Kolkata (IST) |

---

## 15. Authentication & Strict Tenant Isolation

### Architectural Isolation Principles
1. **Zero Client Trust**: The backend **never** relies on a `tenantId` passed in query parameters, headers, or request bodies.
2. **Server-Derived Context**: The `requireAuth` middleware verifies the signed JWT token, fetches the user from MongoDB, verifies `isActive: true` and active tenant status, and populates `req.user` and `req.tenant`.
3. **Database Scoping**: Every query on `Customer`, `Order`, `MeasurementDefinition`, `Pattern`, and `OrderCounter` explicitly includes `{ tenantId: req.user.tenantId }`.
4. **Platform Owner Segregation**:
   - Platform Owners have `role: 'platform_owner'` and `tenantId: null`.
   - The `requireTenant` middleware explicitly blocks `platform_owner` from accessing ordinary studio business data without scoping, preventing cross-tenant accidental contamination.
   - Platform owners authenticate strictly at `/api/owner/login` and are rejected at `/api/auth/login`.

---

## 16. Customer & Order End-to-End Workflow

```
       [ Customer Arrives at Studio ]
                    │
                    ▼
          Customer Mode Selector
         ┌──────────┴──────────┐
         │                     │
    [Existing]              [New]
         │                     │
  Search by Mobile/Name    Input Name, Address &
  Loads past measurements  10-digit mobile number
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
          Select Garment Quantities
        (Shirts: N  |  Pants: M)
                    │
                    ▼
       Dynamic Measurement Fields
   (Populated exclusively from active
      tenant studio definitions)
                    │
                    ▼
         Select Clothing Patterns
    (Plain, Checks, Designer Collar)
                    │
                    ▼
      Delivery Deadline & Notes
                    │
                    ▼
   [ Atomic Save: ORD-YYYY-XXXXX ]
                    │
                    ▼
       High-DPI PDF Slip Generated
 (Gujarati Unicode rendered crisply for cutters)
```

---

## 17. Measurement & Pattern Configuration Lifecycle

1. **Tenant Default Seeding**: When a tenant is onboarded, `seedTenantDefaultMeasurements` populates the studio's initial shirt and pant measurement catalog (Length, Chest, Waist, Shoulder, Sleeve, Collar, etc.) with bilingual Gujarati names.
2. **Custom Fields**: Studios can create custom measurements (e.g. *Pocket Height*, *Waistband Width*), setting display names, Gujarati translations, and whether the field is required.
3. **Active/Inactive State**: Tailors can toggle fields on or off. Only `isActive: true` fields appear on the Create Order form.
4. **Historical Isolation**: When an order is created, an immutable snapshot array (`order.measurementSnapshot`) is saved. If a tailor later deactivates or renames a field, past orders retain their original display names, values, and Gujarati script.

---

## 18. PDF Job Slip Engine & Gujarati Unicode Rendering

### The Mojibake Challenge
Standard client-side PDF libraries (such as default jsPDF) rely on single-byte WinAnsi encoding for standard fonts (Helvetica, Times). Regional Indian Unicode characters (`U+0A80` through `U+0AFF` for Gujarati) get truncated or mangled into Latin-1 mojibake symbols (e.g., `› ¾ ¤ À`, `– ‚ - Ë`, `² ‚ ¬ ¾ ˆ`).

### The Silai Master Solution
The `orderSlipPdfService.js` implements a **Dual-Mode Vector + High-DPI Canvas Text Rasterizer**:
1. Standard ASCII text (English numbers, order IDs, phone numbers) is rendered natively in vector format for maximum sharpness.
2. Text blocks containing Gujarati script (`containsNonAscii(text)`) are rendered into a high-DPI (4x scale, 300+ DPI) off-screen HTML5 Canvas styled with `font-family: 'Noto Sans Gujarati', sans-serif`.
3. The crisp rasterized image is embedded into the jsPDF document alongside vector borders and dividers.
4. Result: Zero WinAnsi corruption, zero vertical letter wrapping, and clear readability for tailors and master cutters.

---

## 19. Audit Logging & Platform Superadministrator Operations

- **Automatic Auditing**: The platform records audit events for tenant onboarding, business updates, deactivations, reactivations, password resets, customer deletions, and customer archival.
- **Date-Wise Deletion in Asia/Kolkata (IST)**:
  - Superadministrators can purge logs on a calendar day basis (`YYYY-MM-DD`).
  - The backend computes exact IST day boundaries:
    - `startOfDay = YYYY-MM-DDT00:00:00.000+05:30`
    - `endOfDay = YYYY-MM-DDT23:59:59.999+05:30`
  - Only records strictly within those UTC timestamps are deleted, safeguarding preceding and succeeding days.

---

## 20. Input Validation & Centralized Error Handling

- **Mobile Numbers**: Strictly validated against `/^\d{10}$/`. Strips dashes, spaces, and country codes.
- **Garment Quantities**: Must be integers $\ge 0$. Orders must contain at least 1 shirt or 1 pant ($S_{qty} + P_{qty} > 0$).
- **Measurements**: If quantity $> 0$, all measurement fields configured as `isRequired: true` for that tenant are strictly validated on the backend.
- **Order Statuses**: Restricted to `'in_progress'`, `'ready'`, `'delivered'`, `'cancelled'`. The legacy status `'pending'` is safely rejected.
- **Centralized Middleware**: Unhandled exceptions are caught by `errorHandler` in `server/src/middleware/errorMiddleware.js`, returning structured JSON errors without exposing raw server stack traces in production.

---

## 21. Testing, Linting, Build & Verification Commands

All test and verification suites are executable directly from the repository root:

| Command | Script / Target | Description | Verified Status |
|---|---|---|:---:|
| `npm run test` | `verify_system.js` | Complete end-to-end integration test (Auth, Orders, Customers, Patterns) | **PASS (100%)** |
| `npm run test:backup` | `test_backup_system.js` | 7-day cron, disk storage, download, and database restoration | **PASS (100%)** |
| `npm run test:measurements` | `verify_measurement_data_separation.js` | 8 scenarios verifying historical vs new measurement isolation | **PASS (8/8)** |
| `npm run test:pdf` | `verify_gujarati_pdf_rendering.js` | Gujarati Unicode PDF slip verification (0 mojibake characters) | **PASS (100%)** |
| `npm run test:customers` | `verify_customer_deletion.js` | Customer deletion blocking, safe archival, and audit log recording | **PASS (100%)** |
| `npm run test:owner` | `verify_owner_login_activity_logs_dedup.js` | Owner login separation, IST audit log purge, request deduplication | **PASS (18/18)** |
| `npm run build:client` | `vite build` | Frontend production bundle compilation | **PASS (6.49s)** |
| `npm audit --prefix server` | `npm audit` | Node.js backend dependency security scan | **0 vulnerabilities** |

---

## 22. Production Deployment Instructions

### Architecture: Linux (Ubuntu/Debian) with Nginx, PM2, and MongoDB

#### 1. Server Provisioning
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mongodb-org nginx

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### 2. Deploy Application Files
```bash
# Clone repository
git clone <repo-url> /var/www/tailor
cd /var/www/tailor

# Install dependencies and build frontend
npm run install:all
npm run build:client
```

#### 3. Configure Server Environment
Create `/var/www/tailor/server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tailor_management
JWT_SECRET=<strong-random-production-secret-min-32-chars>
CLIENT_URL=https://tailor.yourdomain.com
BACKUP_CRON_SCHEDULE=0 2 * * 0
BACKUP_DIR=/var/www/tailor/server/backups
NODE_ENV=production
```

#### 4. Launch Backend via PM2
```bash
cd /var/www/tailor/server
pm2 start src/server.js --name "tailor-api"
pm2 save
pm2 startup
```

#### 5. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/tailor`:
```nginx
server {
    listen 80;
    server_name tailor.yourdomain.com;

    # Frontend Single Page App
    location / {
        root /var/www/tailor/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/tailor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 23. Security Considerations & Backup Operations

### Security Best Practices Implemented
- **Password Hashing**: Strong 10-round bcrypt salted hashes. Plaintext passwords are never logged or stored.
- **Mandatory Password Rotation**: Newly created tenant accounts require immediate password change upon initial login.
- **CORS Protection**: Restricted to configured frontend origins.
- **Payload Limits**: JSON and URL-encoded payloads are limited to 50MB to accommodate high-res print canvas assets while blocking oversized DOS attacks.
- **Tenant Authorization Barriers**: Every tenant endpoint requires both valid authentication and non-null tenant identity matching the target record.

### Backup Strategy & Disaster Recovery
- **Automated Disk Backups**: The backend runs a weekly Sunday cron job (`0 2 * * 0`) serializing all collections into `server/backups/YYYY-MM-DD.json`.
- **Manual 1-Click Backups**: Studio admins can trigger an immediate backup via the `/backups` page or API `POST /api/backups/trigger`.
- **Pre-Restore Safety Snapshots**: Before restoring any database backup, the backend automatically takes a safety snapshot (`pre_restore_<timestamp>.json`).

---

## 24. Known Limitations & Current Scope

1. **Single-Store Inventory**: The current version focuses on customer measurements, pattern styles, and order tracking. Raw fabric yardage inventory is not yet tracked.
2. **SMS Gateway Integration**: Mobile numbers are validated and stored; automated SMS/WhatsApp alerts for order readiness require an external Twilio or Gupshup webhook gateway.
3. **Frontend Chunk Size**: The production bundle includes `jspdf` and `html2canvas` (`~920 KB`), which generates a build warning. Future releases will introduce dynamic `React.lazy()` chunking for the print engine.

---

## 25. Troubleshooting Guide for Common Setup Issues

### 1. `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause**: MongoDB is not running locally.
- **Solution**: Start the service via `net start MongoDB` (Windows) or `sudo systemctl start mongod` (Linux). Check your `MONGODB_URI` in `server/.env`.

### 2. `Invalid email or password` on Login
- **Cause**: Database has not been seeded with initial credentials.
- **Solution**: Run `node server/src/scripts/bootstrap_owner.js` to create the Superadmin, or `npm run seed` to create demo tenant accounts.

### 3. `Route not found: /api/...`
- **Cause**: Vite dev server proxy is not running or backend is on a different port.
- **Solution**: Ensure backend is running on `http://localhost:5000` and Vite `client/vite.config.js` contains the `/api` proxy definition.

### 4. Gujarati Text Appears as Boxes (`□□□`) in PDF
- **Cause**: Google Fonts `Noto Sans Gujarati` failed to load in the browser.
- **Solution**: Ensure the client machine has internet connectivity during initial load or install the font locally.

---

## 26. Future Enhancements Roadmap

1. **WhatsApp & SMS Gateway**: Automated notification dispatch when order status changes to `ready` or `delivered`.
2. **Fabric & Inventory Tracking**: Tracking fabric rolls, meterage consumed per garment, and supplier details.
3. **Multi-Branch Multi-User Roles**: Multiple cutting master and tailor accounts within a single tailoring business.
4. **Barcode & QR Code Slip Scanning**: Fast mobile scanning on physical slips for one-tap status updates.
5. **Progressive Web App (PWA)**: Offline-first client cache with ServiceWorker background synchronization.

---

*Silai Master — Engineered with precision for bespoke apparel studios.*