# 🚀 100% Free Hosting & Deployment Guide
### Tailor Management System (MERN Stack: React + Express + MongoDB)

This comprehensive guide walks you through deploying the complete Tailor Management System online **100% free of charge**, with zero credit card required.

---

## 🏗️ Free Architecture Overview

```
┌─────────────────────────────────┐
│       Frontend (Client)         │
│  Hosted Free on VERCEL / NETLIFY │  👉 Blazing Fast Global CDN, Auto SSL/HTTPS
│       (React 18 + Vite)         │
└────────────────┬────────────────┘
                 │
                 │ HTTPS API Calls (Bearer JWT)
                 ▼
┌─────────────────────────────────┐
│        Backend (Server)         │
│     Hosted Free on RENDER       │  👉 Node.js + Express API, Auto Git Deploy
│       (Node.js + Express)       │
└────────────────┬────────────────┘
                 │
                 │ Mongoose Native Connection
                 ▼
┌─────────────────────────────────┐
│        Cloud Database           │
│   Hosted Free on MONGODB ATLAS   │  👉 M0 Shared Cluster (512MB, Free Forever)
│          (MongoDB Cloud)        │
└─────────────────────────────────┘
```

| Component | Free Platform | Free Plan Limits | Credit Card Needed? |
| :--- | :--- | :--- | :--- |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | 512 MB storage, shared cluster, free forever | ❌ No |
| **Backend API** | [Render.com](https://render.com) | 750 free instance hours/month, auto SSL | ❌ No |
| **Frontend Web** | [Vercel](https://vercel.com) | Unlimited hobby deployments, 100GB bandwidth | ❌ No |

---

## Step 1: Set Up Free Cloud Database (MongoDB Atlas)

1. Go to **[mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)** and sign up for a free account.
2. Click **Create a Deployment** and select the **M0 Free** cluster (Choose AWS or Google Cloud, and pick the region closest to you, e.g., `Mumbai / ap-south-1` or `Frankfurt / eu-central-1`).
3. Set up **Database Access (User)**:
   - Go to **Security** → **Database Users** → **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `tailoradmin` (or your choice).
   - Password: Click **Autogenerate Secure Password** or create your own (e.g. `TailorSecurePass2026`). **Copy and save this password.**
   - Role: **Atlas Admin** or **Read and write to any database**.
4. Set up **Network Access (IP Whitelist)**:
   - Go to **Security** → **Network Access** → **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Confirm**. *(This allows your free Render backend server to securely connect to MongoDB).*
5. Get your **Connection String**:
   - Go to **Database** → Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the connection URI string. It looks like:
     ```
     mongodb+srv://tailoradmin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Replace `<db_password>` with your actual password and add the database name `/tailor_management` before the `?`:
     ```
     mongodb+srv://tailoradmin:TailorSecurePass2026@cluster0.abcde.mongodb.net/tailor_management?retryWrites=true&w=majority
     ```

---

## Step 2: Push Your Code to GitHub

1. Initialize git and commit your clean repository (if not already done):
   ```bash
   git add .
   git commit -m "Production ready tailor management system"
   ```
2. Create a new repository on **[github.com](https://github.com)** (e.g., `tailor-management-system`).
3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tailor-management-system.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy Backend API for Free (Render.com)

1. Sign up for free at **[render.com](https://render.com)** (Sign in with your GitHub account).
2. Click **New +** → Select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your `tailor-management-system` repository.
4. Fill in the deployment settings:
   - **Name**: `tailor-management-api` (or any unique name)
   - **Region**: Choose the region closest to your MongoDB Atlas cluster (e.g., Singapore or Frankfurt).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: Select **Free** ($0/month).
5. Add **Environment Variables** (Click **Advanced** or scroll down to **Environment Variables**):

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production security optimizations |
| `PORT` | `5000` | Server listening port |
| `MONGODB_URI` | `mongodb+srv://tailoradmin:...@cluster0.abcde.mongodb.net/tailor_management?retryWrites=true&w=majority` | Your MongoDB Atlas connection URI from Step 1 |
| `JWT_SECRET` | `prod_super_secret_jwt_tailor_token_key_999xyz` | Strong random 32+ character secret string |
| `CLIENT_URL` | `https://your-frontend-app.vercel.app` | Leave as `*` initially, then update with your Vercel URL once frontend is deployed |
| `BACKUP_DIR` | `./backups` | Server local directory for weekly backups |

6. Click **Create Web Service**.
7. Render will build and start your server in ~2 minutes. Once deployed, Render gives you a free HTTPS URL:
   ```
   https://tailor-management-api.onrender.com
   ```
8. Verify it by visiting:
   ```
   https://tailor-management-api.onrender.com/api/health
   ```
   You should see: `{"status":"ok","service":"Tailor Management API", ...}`

---

## Step 4: Deploy Frontend for Free (Vercel)

1. Sign up for free at **[vercel.com](https://vercel.com)** (Sign in with your GitHub account).
2. Click **Add New...** → **Project**.
3. Import your `tailor-management-system` GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select **`client`**
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `dist` (Default)
   - **Install Command**: `npm install` (Default)
5. Expand **Environment Variables** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://tailor-management-api.onrender.com/api` | Your live Render backend API URL with `/api` appended |

6. Click **Deploy**.
7. Vercel will install dependencies, compile the production bundle, and deploy to their global CDN in ~45 seconds.
8. Your frontend is now live with an official HTTPS address:
   ```
   https://tailor-management-system.vercel.app
   ```

> [!NOTE]
> Single Page Application routing (SPA rewrites) is already configured for you in `client/vercel.json`, guaranteeing that deep links and page refreshes on `/orders`, `/customers`, and `/settings` will never return 404 errors.

---

## Step 5: Final Cross-Origin & Bootstrap Setup

### 1. Update Backend CORS Origin
Now that you have your live Vercel URL (e.g. `https://tailor-management-system.vercel.app`):
1. Go back to **Render Dashboard** → Your Web Service → **Environment**.
2. Update `CLIENT_URL` to your exact Vercel frontend domain:
   ```
   CLIENT_URL = https://tailor-management-system.vercel.app
   ```
3. Click **Save Changes** (Render will automatically redeploy with the updated CORS rule in 30 seconds).

### 2. Bootstrap Central Platform Owner Account
To create your master administrator credentials:
1. In the **Render Dashboard**, open your web service and click on the **Shell** tab on the left menu.
2. Run the platform owner bootstrap command:
   ```bash
   node src/scripts/bootstrap_owner.js
   ```
3. You will see:
   ```
   🎉 PLATFORM OWNER BOOTSTRAPPED SUCCESSFULLY! 🎉
   Email: owner@platform.com
   Role: platform_owner
   ```
4. Now open your live website in any browser:
   - Navigate to: `https://your-frontend-app.vercel.app/owner/login`
   - Log in with:
     - **Email:** `owner@platform.com`
     - **Password:** `Owner@Pass2026!`
   - You can immediately onboard your first tailor studio tenant, configure their shop name, and set up tailor operator logins!

---

## ⚡ Bonus: Keep Free Backend Awake (Prevent Render Sleep)

Render's free tier automatically spins down (sleeps) if no HTTP requests are received for 15 minutes. The first request after sleep takes 30-40 seconds to spin back up ("cold start").

**How to keep it 100% awake 24/7 for free:**
1. Go to **[cron-job.org](https://cron-job.org)** or **[uptimerobot.com](https://uptimerobot.com)** (both 100% free forever).
2. Create a free HTTP ping monitor:
   - **URL**: `https://tailor-management-api.onrender.com/api/health`
   - **Interval**: Every **14 minutes**
3. This sends a lightweight heartbeat ping every 14 minutes, keeping your Render server continuously warm and instantly responsive with zero latency!

---

## 🛠️ Verification Checklist After Deployment

- [ ] Visit `https://your-api.onrender.com/api/health` and verify HTTP 200 OK.
- [ ] Visit `https://your-frontend.vercel.app/owner/login` and log into Platform Administration.
- [ ] Onboard a new tailor tenant studio (e.g. *Om Tailor*).
- [ ] Log in via standard tailor login at `https://your-frontend.vercel.app/login`.
- [ ] Create a customer and place an order with dynamic measurements.
- [ ] Generate and download a PDF order slip to test client-side jsPDF rendering.
- [ ] Refresh the browser on `/orders` and `/customers` to confirm zero 404 errors.

---

## ❓ Frequently Asked Questions (FAQ)

### Can I attach my own custom domain?
**Yes, 100% free!**
- On **Vercel**: Go to Settings → Domains → Add `tailorstudio.com` (or `www.tailorstudio.com`). Follow the simple CNAME/A-record instructions in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.). Free automated SSL certificates are generated instantly.
- On **Render**: Go to Settings → Custom Domains → Add `api.tailorstudio.com`.

### Is my database data safe?
**Yes.** MongoDB Atlas includes continuous monitoring, encrypted connections (TLS/SSL), automated replica set failovers, and restricted IP whitelists. The server also executes automated weekly backups in `./backups`.

### What if I prefer Netlify instead of Vercel?
You can deploy the `client` folder to Netlify just as easily:
- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `client/dist`
- Create a `client/public/_redirects` file with `/*  /index.html  200` for SPA routing.
