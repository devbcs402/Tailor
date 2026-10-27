# Platform Owner Administration Guide: Multi-Tenant Tailor Management SaaS

This guide explains the architecture, security policies, operations, database cleanup procedures, and password management of the **Platform Owner Admin Website** for the Multi-Tenant Tailor Management SaaS.

---

## Table of Contents

1. [Platform Architecture & Roles](#1-platform-architecture--roles)
2. [Initial Platform Owner Bootstrap](#2-initial-platform-owner-bootstrap)
3. [Starting the Application](#3-starting-the-application)
4. [Database Backup & One-Time Cleanup (Clean Slate Reset)](#4-database-backup--one-time-cleanup-clean-slate-reset)
5. [Logging in to the Owner Admin Portal](#5-logging-in-to-the-owner-admin-portal)
6. [Creating a New Tailoring Business Tenant](#6-creating-a-new-tailoring-business-tenant)
7. [Initial Administrator Onboarding & First-Login Password Change](#7-initial-administrator-onboarding--first-login-password-change)
8. [Owner-Initiated Tenant Administrator Password Reset](#8-owner-initiated-tenant-administrator-password-reset)
9. [Editing Tenant Business Profiles](#9-editing-tenant-business-profiles)
10. [Activating and Deactivating Tenants (Suspension)](#10-activating-and-deactivating-tenants-suspension)
11. [Tenant Archival and Safe Deletion Policy](#11-tenant-archival-and-safe-deletion-policy)
12. [Tenant Data Isolation and Security Architecture](#12-tenant-data-isolation-and-security-architecture)
13. [Troubleshooting Login and Tenant-Access Issues](#13-troubleshooting-login-and-tenant-access-issues)
14. [Verification Test Commands](#14-verification-test-commands)

---

## 1. Platform Architecture & Roles

The system uses a strictly enforced Role-Based Access Control (RBAC) model:

- **Platform Owner (`role: 'platform_owner'`):**
  - Global supervisor of the SaaS platform.
  - Can create, activate, deactivate, edit, archive, and delete tenants.
  - Can reset tenant administrator passwords and trigger temporary credentials.
  - Has `tenantId: null` and cannot directly inject business records into tenants without explicit scoping.
  - Accesses owner management at `http://localhost:5173/owner/*`.
- **Tenant Administrator (`role: 'admin'`):**
  - Manager of an individual tailoring business tenant (`tenantId: <ObjectId>`).
  - Manages orders, customers, measurements, patterns, and staff for their shop.
  - Has `mustChangePassword: true` on initial account creation or after owner reset.
  - Restricted to tenant dashboard at `http://localhost:5173/*`. Forbidden from `/api/owner/*`.
- **Tenant Staff / Tailor (`role: 'tailor'`, `'staff'`):**
  - Employees bound strictly to their shop's `tenantId`.

---

## 2. Initial Platform Owner Bootstrap

To prevent privilege escalation, **no public sign-up endpoint exists for platform owners**. Platform owners must be created via CLI on the server machine:

```bash
cd server
node src/scripts/create_platform_owner.js
```

### Providing Custom Credentials

```bash
PLATFORM_OWNER_EMAIL="owner@platform.com" \
PLATFORM_OWNER_PASS="Owner@Pass2026!" \
PLATFORM_OWNER_NAME="Central Platform Owner" \
node src/scripts/create_platform_owner.js
```

---

## 3. Starting the Application

The system consists of a Node.js/Express backend API on port `5000` and a Vite React frontend on port `5173`.

### Step 1: Start Backend Server

```bash
cd server
npm install
npm run dev
```

*Server boots on `http://localhost:5000` with nodemon auto-reloading.*

### Step 2: Start Frontend Application

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

*Frontend starts on `http://localhost:5173`.*

---

## 4. Database Backup & One-Time Cleanup (Clean Slate Reset)

When preparing the platform for new tenant registrations, use the automated cleanup utility: [cleanup_tenants.js](file:///d:/YASH%20KACHA/Tai/server/src/scripts/cleanup_tenants.js).

### Data Preservation vs Deletion Matrix

| Scope | Preserved | Purged | Description |
| :--- | :---: | :---: | :--- |
| **Platform Owner Account** | **YES** | NO | Verified by `role: 'platform_owner'`. Credentials & ID untouched. |
| **Global Audit Logs** | **YES** | NO | Security audit history and cleanup audit records preserved. |
| **System Configurations** | **YES** | NO | Global schema defaults and system settings remain intact. |
| **Tenants** | NO | **YES** | All existing tenant documents are purged. |
| **Tenant Users & Staff** | NO | **YES** | All users with `tenantId != null` and `role != 'platform_owner'`. |
| **Customers & Measurements** | NO | **YES** | All tenant-owned customer profiles and body measurements. |
| **Orders & Items** | NO | **YES** | All tenant-owned orders, item lines, and garment photos. |
| **Patterns** | NO | **YES** | All tenant-specific pattern templates. |
| **Order Counters** | NO | **YES** | All tenant sequence counters (`order_seq_*`). |

### Step 1: Pre-Cleanup Safety Backup

Before executing any deletion, the cleanup script automatically generates a full JSON snapshot of all collections to:
`server/backups/pre_cleanup_backup_<timestamp>.json`

You can also run a native MongoDB dump at any time:
```bash
mongodump --db=tailor_management --out=./backups/manual_$(date +%Y%m%d_%H%M%S)
```

### Step 2: Running Dry-Run Inspection

To preview the cleanup scope without altering any data:

```bash
cd server
node src/scripts/cleanup_tenants.js
```

The script verifies the platform owner, reports collection record counts, and halts with a safety notice.

### Step 3: Executing Confirmed Cleanup

To execute the atomic cleanup:

```bash
cd server
node src/scripts/cleanup_tenants.js --confirm
```

The script:
1. Verifies the platform owner account.
2. Writes a full backup to `server/backups/`.
3. Purges all tenant-owned collections.
4. Records a `database_cleanup_executed` event in `AuditLog`.
5. Verifies post-cleanup record counts (0 tenants, 1 active platform owner).

---

## 5. Logging in to the Owner Admin Portal

1. Navigate to: **`http://localhost:5173/owner/login`**
2. Enter the Platform Owner credentials:
   - **Email:** `owner@platform.com`
   - **Password:** `Owner@Pass2026!`
3. Click **Sign in to Platform**.

*Unauthenticated requests to `/owner/*` automatically redirect to `/owner/login`.*

---

## 6. Creating a New Tailoring Business Tenant

Platform owners can create new tenants from `http://localhost:5173/owner/tenants/create` or via the modal on `/owner/tenants`.

### Required Information:

- **Business Details:** Business name, owner name, contact email, mobile number, full address, city, state, pincode.
- **Initial Administrator Account:** Full name, email address, and temporary password.

### Automated Provisioning Pipeline:

When the platform owner submits the form:
1. **Tenant Document Created:** Created with status `active` and auto-generated `tenantCode` (e.g. `SAVIL-1042`).
2. **Standard Patterns Seeded:** 13 core shirt, pant, and suit templates seeded automatically.
3. **Tenant Admin User Provisioned:** Created with `role: 'admin'`, linked to `tenantId`, and **`mustChangePassword: true`** explicitly set.
4. **Password Hashing:** Passwords are hashed with bcrypt (10 rounds). Plaintext passwords are never logged or stored.
5. **Audit Logging:** Logs a `tenant_created` event in `AuditLog`.

---

## 7. Initial Administrator Onboarding & First-Login Password Change

### First Login Flow

1. Tenant administrator navigates to the tenant portal: **`http://localhost:5173/login`**.
2. Enters their initial temporary credentials.
3. The backend validates credentials and returns `{ user: { mustChangePassword: true }, token: ... }`.
4. The frontend detects `mustChangePassword === true` and redirects immediately to **`/change-password`**.

### Backend Enforcement (Zero Bypass)

The password change requirement is enforced centrally in [authMiddleware.js](file:///d:/YASH%20KACHA/Tai/server/src/middleware/authMiddleware.js):

- Any authenticated request with `mustChangePassword: true` attempting to access normal business endpoints (`/api/dashboard/*`, `/api/customers/*`, `/api/orders/*`, `/api/patterns/*`, etc.) is **blocked with HTTP 403 Forbidden**:
  ```json
  {
    "success": false,
    "code": "MUST_CHANGE_PASSWORD",
    "message": "You must change your initial password before accessing business operations."
  }
  ```
- **Only** the following safe authentication endpoints are permitted:
  - `POST /api/auth/change-password`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`

### Password Policy Requirements

The Change Password page (`/change-password`) enforces strict security policies on both frontend and backend:

- **Minimum Length:** At least 12 characters.
- **Complexity:** Must include at least 1 uppercase letter, 1 lowercase letter, and 1 number.
- **Current Password Verification:** Must provide correct current/initial password.
- **Identity Rejection:** New password **cannot be identical** to the initial temporary password.
- **Confirmation Match:** New password and confirmation must match identically.

### Post-Change Execution

Upon submitting valid new credentials to `POST /api/auth/change-password`:
1. The backend hashes the new password with bcrypt.
2. Updates `user.mustChangePassword = false`.
3. Issues a fresh JWT authentication token.
4. Records `password_changed` in `AuditLog`.
5. The user is redirected to the tenant dashboard (`/dashboard`) with full operational access.
6. Subsequent logins use the new password directly without prompting for a change.

---

## 8. Owner-Initiated Tenant Administrator Password Reset

If a tenant administrator forgets their password or experiences a security issue, the platform owner can reset their credentials directly from the Owner Admin Website:

1. Navigate to `/owner/tenants` and click on the tenant to open **Tenant Details**.
2. Click the **Reset Admin Password** button (`<KeyRound />`).
3. In the modal:
   - Provide a custom temporary password (minimum 8 characters), OR
   - Click **Generate Secure Password** to generate a randomized temporary credential (e.g. `Temp@K9X72!`).
4. Click **Reset & Force Password Change**.
5. The backend:
   - Finds the primary administrator for that tenant (`role: 'admin'`, `tenantId`).
   - Securely hashes the temporary password.
   - Sets **`mustChangePassword: true`**.
   - Preserves all business data (orders, customers, patterns).
   - Records `tenant_admin_password_reset` in `AuditLog`.
6. Copy the generated temporary credential using the **Copy** button and share it securely with the business owner.
7. Upon their next login with the temporary password, the administrator is forced to complete the `/change-password` workflow before accessing business operations.

---

## 9. Editing Tenant Details

Platform owners can modify business information, contacts, and addresses without disrupting operations or altering historical data:

1. In `/owner/tenants`, find the tenant and click **Edit Tenant Details** (or `/owner/tenants/:tenantId/edit`).
2. Update allowed fields:
   - Business Name
   - Owner Contact Name, Email, and Phone
   - Street Address, City, State, Pincode
3. Click **Save Changes**.

---

## 10. Activating and Deactivating Tenants (Suspension)

When a tailoring business pauses their subscription or fails payment, the platform owner can suspend their access without destroying their business data:

### Deactivating a Tenant (Suspension)

1. Open `/owner/tenants`, find the active tenant, and click **Suspend Tenant** (`POST /api/owner/tenants/:id/deactivate`).
2. **Immediate Enforcement:**
   - Tenant document status changes to `inactive`.
   - In [authMiddleware.js](file:///d:/YASH%20KACHA/Tai/server/src/middleware/authMiddleware.js), every incoming authenticated request from users belonging to this tenant is **immediately rejected with HTTP 403 `TENANT_INACTIVE`**.
   - Active JWT tokens immediately cease to authorize business operations without waiting for token expiry.
   - New login attempts are rejected with: *"Your business account has been deactivated. Please contact platform support."*

### Reactivating a Tenant

1. Open `/owner/tenants`, filter by status **Inactive**, find the tenant, and click **Activate Tenant** (`POST /api/owner/tenants/:id/activate`).
2. Tenant status updates to `active`.
3. Normal login and operational API access are restored instantly.

---

## 11. Tenant Archival and Safe Deletion Policy

The platform supports two tiers of tenant termination:

### Option A: Safe Archival (Soft Delete)
For businesses pausing subscriptions or closing temporarily:
1. In `/owner/tenants`, click the **Archive** button (`<Archive />`).
2. The system sets `tenant.status = 'archived'` and disables user accounts.
3. All customer records, order histories, and measurements are **permanently preserved** in MongoDB. The platform owner can restore the studio at any time.

### Option B: Permanent Tenant Deletion (Full Cascade Cleanup)
When a platform owner explicitly deletes a tenant (e.g. fraudulent registration, test tenant cleanup, GDPR/compliance data erasure):
1. In `/owner/tenants`, click the red **Delete** button (`<Trash2 />`).
2. A confirmation dialog displays the tenant's business name and code, warning of permanent data removal.
3. Upon confirmation, the backend executes `DELETE /api/owner/tenants/:tenantId`:
   - Validates platform-owner privileges (HTTP 403 for unauthorized users).
   - Prevents deletion of the currently active session or platform owner accounts.
   - Cascades deletion to all `Order`, `Customer`, `Pattern`, `OrderCounter`, and `User` records belonging strictly to this `tenantId`.
   - Deletes the `Tenant` document itself.
   - Records a `tenant_deleted` event in `AuditLog`.

---

## 12. Tenant Data Isolation and Security Architecture

Multi-tenancy uses a **Shared Database, Isolated Documents** architecture with defense-in-depth security:

```
[ HTTP Request with JWT ]
           │
           ▼
[ authMiddleware.js ]
   ├── Verifies JWT signature and expiry
   ├── Loads user and tenant from MongoDB
   ├── Validates tenant is active (blocks 'inactive' & 'archived')
   ├── Enforces mustChangePassword check (HTTP 403 MUST_CHANGE_PASSWORD)
   └── Injects req.tenantId = user.tenantId
           │
           ▼
[ Controllers (Customer, Order, Pattern, etc.) ]
   ├── Injects { tenantId: req.tenantId } into EVERY query filter
   └── Cross-validates foreign references before mutations
```

### Security Guarantees

1. **No Browser Trust:** The server never uses a client-supplied `tenantId` parameter to determine ownership. The `req.tenantId` is strictly derived from the validated JWT session.
2. **Compound Database Indexes:** Every business collection features compound indexes starting with `tenantId`:
   - `Customer`: `{ tenantId: 1, mobile: 1 }` (unique per tenant), `{ tenantId: 1, name: 1 }`
   - `Order`: `{ tenantId: 1, orderNumber: 1 }` (unique per tenant), `{ tenantId: 1, status: 1 }`
   - `Pattern`: `{ tenantId: 1, type: 1, name: 1 }` (unique per tenant)
   - `User`: `{ tenantId: 1, email: 1 }`, `{ tenantId: 1, role: 1 }`, `{ mustChangePassword: 1 }`
3. **Cross-Tenant Attack Prevention:** Queries scoped to one tenant cannot view or modify documents belonging to another tenant.

---

## 13. Troubleshooting Login and Tenant-Access Issues

### Problem 1: "You must change your initial password before accessing business operations" (HTTP 403 MUST_CHANGE_PASSWORD)
- **Cause:** User has `mustChangePassword: true` on their account.
- **Resolution:** Navigate to `/change-password` and set a new password meeting policy rules (min 12 characters, uppercase, lowercase, number).

### Problem 2: "Your business account has been deactivated" (HTTP 403 TENANT_INACTIVE)
- **Cause:** The tenant business has been suspended by the platform owner.
- **Resolution:** Platform owner logs into `/owner/tenants`, finds the tenant, and clicks **Activate Tenant**.

### Problem 3: Platform Owner Login Fails with "Invalid email or password"
- **Cause:** Credentials mismatch or owner account missing.
- **Resolution:** Re-run the bootstrap script:
  ```bash
  cd server
  node src/scripts/create_platform_owner.js
  ```

### Problem 4: Resetting Admin Password Did Not Work
- **Cause:** The tenant has no user with `role: 'admin'` or the temporary password was entered incorrectly.
- **Resolution:** Open the tenant details page at `/owner/tenants/:id`, verify the administrator email in the users list, and click **Reset Admin Password** to generate a new temporary credential.

---

## 14. Verification Test Commands

To verify platform health, forced first-login password changes, and tenant isolation:

```bash
# 1. First-login flow, forced password change, owner reset, and isolation (27 tests)
cd server
node src/scripts/verify_first_login_flow.js

# 2. Multi-tenant architecture & lifecycle verification (15 test suites)
node src/scripts/verify_multitenant_backend.js

# 3. Existing tailor shop operations & order integrity verification
node src/scripts/verify_system.js
```

All test suites will return **`100% PASSED`**.
