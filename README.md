# Silai Master (Tailor Management System) - MERN Stack

A modern, responsive, end-to-end **Tailor Management System** built with the MERN stack (MongoDB, Express, React with Vite, Node.js) specifically designed for tailoring shops to manage customers, clothing measurements, patterns, and order workflows in English.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MongoDB**: Local MongoDB server or MongoDB Atlas URI running

### 2. Environment Setup
The backend `.env` is located in `server/.env` (and an example is in `server/.env.example`):
```env
PORT=5000

CLIENT_URL=http://localhost:5173
```

### 3. Start the Project

#### Step A: Run the Backend Server
```bash
cd server
npm install
npm run seed     # Seeds the initial admin account & sample customers/orders
npm run dev      # Or `npm start` (Runs on http://localhost:5000)
```

#### Step B: Run the Frontend (Vite + React)
```bash
cd client
npm install
npm run dev      # Runs on http://localhost:5173
```

---

## 🔑 Default Credentials (Seed Data)

- **Login URL:** [http://localhost:5173/login](http://localhost:5173/login)
- **Email:** `admin@tailor.com`
- **Password:** `admin123`
*(A quick one-click demo credentials button is also available on the login screen for testing convenience.)*

---

## 📦 System Architecture & Features

### 1. 🔐 Authentication & Session
- JWT-based authentication with bcrypt-hashed passwords.
- Protected routes on client and server.
- Session auto-restoration and clean logout flow.

### 2. 📊 Dashboard
- **Live MongoDB Counts**:
  - **Total Orders**
  - **Orders Due Today** — highlighted in amber with urgency warnings
  - **Pending Orders** — active in-progress/ready orders
  - **Completed Orders** — delivered orders
- Urgent alert banners for overdue orders or orders due today.
- Today's deadline list with 1-click status update modal.
- Upcoming deadlines list (next 7 days).
- Recent orders table with customer details, garment counts, and view actions.

### 3. ➕ Create Order
- Mutually exclusive customer mode selector:
  - **Existing Customer**: Real-time search by name or mobile number, auto-populates previous measurements and patterns. Option to save updated measurements to the customer's permanent profile or keep them only on this order snapshot.
  - **New Customer**: Input name, mobile number, address, and notes. Automatic duplicate mobile detection.
- **Collision-Safe Order Sequence**:
  - Atomic backend order sequence generator using MongoDB `$inc` on `OrderCounter` (`ORD-YYYY-XXXXX`).
  - Clear placeholder `"Will be generated automatically upon saving"` before order saving.
- **Shirt Measurements**:
  - Fields: Length, Chest, Waist, Shoulder, Sleeve Length, Sleeve Opening / Cuff, Neck / Collar, Front Chest, Notes.
  - Selectable pattern list: Plain, Checks, Striped, Printed, Kurta Collar, Chinese Collar, Other (with custom specification).
  - Quantity and price per shirt.
- **Pant Measurements**:
  - Fields: Length, Waist, Hip / Seat, Thigh, Knee, Bottom Opening, Crotch / Rise, Notes.
  - Selectable pattern list: Plain Pant, Formal Pant, Jeans Style, Pencil Fit, Pleated, Cotton Trouser, Other (with custom specification).
  - Quantity and price per pant.
- **Unit Selector**: One-click toggle between **Inches** and **CM**.
- **Pricing & Balance**:
  - Automatic calculation of total `(shirtQty * shirtPrice + pantQty * pantPrice)` with override option.
  - Advance paid and real-time balance due indicator.
- **Printable Slip / Invoice Generation**: Automatically generates a tailor shop receipt/chit for printout with `window.print()`.

### 4. 📋 All Orders
- Complete searchable, filterable table.
- Search by order number, customer name, or phone number.
- Status filters: All Orders, Pending, In Progress, Ready, Delivered, Cancelled.
- Sorting by newest, oldest, or nearest deadline.
- Server-side pagination.
- Instant order status modal for updating order progress.
- Direct printing of tailoring slips.

### 5. 👥 Customers & Profile History
- Searchable customer table with order counts, latest order date, and next deadline.
- Customer details page showing:
  - Contact profile.
  - Current saved shirt & pant measurements.
  - Full order history with preserved past measurement snapshots (editing current measurements never corrupts old orders).
  - Direct "New Order for this Customer" button pre-filling customer details.

### 6. 💾 7-Day Automated Backup & Local Storage System
- **Automated 7-Day Recurring Cron Job**:
  - Uses `node-cron` scheduled for every 7 days (`0 2 * * 0` - weekly every Sunday at 02:00 AM).
  - Configurable via `BACKUP_CRON_SCHEDULE` in `server/.env`.
  - Serializes all collections (`Customer`, `Order`, `User`, `OrderCounter`) with timestamps and metadata.
- **Server Local Storage**:
  - Stored directly on disk in `server/backups/`.
  - Configurable retention policy (automatically retains latest 15 backups and prunes older files).
- **Browser LocalStorage Integration**:
  - One-click snapshot synchronization to browser `window.localStorage` (`silai_master_latest_backup`).
  - Allows offline inspection and client-side download without database queries.
- **Full Database Restoration**:
  - 1-click restore from any local storage backup file or uploaded JSON backup file.
  - Automatic `pre_restore` safety snapshot taken before any restoration.
- **Dashboard Interface**: Dedicated `/backups` management page with live cron status, manual trigger, download, restore, and delete controls.

---

## 🛠️ Testing & Verification

1. **System & Order Workflow Integration Test:**
```bash
npm run test:api
# Or: node server/src/scripts/verify_system.js
```

2. **7-Day Cron & Backup Local Storage Integration Test:**
```bash
npm run test:backup
# Or: node server/src/scripts/test_backup_system.js
```
Tested endpoints:
- `GET /api/backups` (Cron status, schedule description, local storage metrics)
- `POST /api/backups/trigger` (Manual and simulated 7-day cron run)
- `GET /api/backups/latest-data` (Payload retrieval for browser localStorage caching)
- `GET /api/backups/download/:filename` (Direct JSON download)
- `POST /api/backups/restore/:filename` (Complete MongoDB restoration)