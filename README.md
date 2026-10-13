# Forcecraver Recruiter Portal (TalentHub)

A modern, full-stack recruitment management portal and candidate pipeline tracking system built with Next.js 14, TypeScript, Tailwind CSS, and PostgreSQL (Neon).

---

## 📌 Features

- **Candidate Pipeline Tracking**: Submit candidate profiles, track interview stages, record CTC & notice period, attach resumes, and review screening statuses (`Good`, `Average`, `Worst`).
- **Live Interview Portal Sync**: Candidates marked with `Good` or `Average` automatically synchronize with the downstream Interview Scheduling System.
- **Open Job Descriptions (JDs)**: Manage job openings, departments, locations, experience bands, salary budgets, and shift timings.
- **Role-Based Authentication**:
  - Email OTP login with automated Hostinger SMTP delivery
  - Secure password authentication (bcrypt hashed)
  - One-time setup and self-service password reset flows
  - Master / Admin login support
- **Recruiter Dashboard**: Individualized submission metrics, open positions, pipeline statistics, and conversion KPIs.
- **Admin Control Center**: Manage recruiters, assign permissions (post JDs, screen candidates, schedule interviews), inspect candidates, and review platform analytics.
- **Resilient Data Architecture**: Primary persistence in PostgreSQL (Neon serverless) with fallback and local JSON sync (`src/data/`).

---

## 📋 Prerequisites

Before running the application, make sure your development environment has:

- **Node.js**: `v18.17.0` or higher (Node 20+ recommended)
- **npm**: `v9.x` or higher (or `yarn` / `pnpm`)
- **PostgreSQL**: PostgreSQL 14+ or a cloud instance such as [Neon PostgreSQL](https://neon.tech/)

---

## ⚙️ Environment Configuration

1. Clone or extract the repository to your local machine.
2. Create your `.env` file from `.env.example`:

```bash
cp .env.example .env
```

3. Configure the following variables in `.env`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (supports SSL / Neon pooled connection) | `postgresql://user:password@ep-xyz.region.neon.tech/neondb?sslmode=require` |
| `OPEN_JD_API_URL` | External API endpoint for syncing company Open JDs | `https://your-open-jd-api-url.com` |
| `PORT` | Local development port | `3002` |
| `SMTP_HOST` | Hostinger or external SMTP mail host | `smtp.hostinger.com` |
| `SMTP_PORT` | Secure SMTP port | `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | Authenticated email address used to send verification OTPs | `no-reply@yourcompany.com` |
| `SMTP_PASS` | App password or SMTP account password | `your-smtp-password` |
| `EMAIL_FROM` | Display name and sender address on outgoing emails | `Forcecraver Portal <no-reply@yourcompany.com>` |
| `JWT_SECRET` | Secret key used to sign session cookies and auth tokens | `your-jwt-secret-key-min-32-chars` |

---

## 🗄️ Database Initialization

The project includes a ready-to-run SQL schema file: [`schema.sql`](./schema.sql).

### Method 1: Using psql CLI
```bash
psql "<DATABASE_URL>" -f schema.sql
```

### Method 2: Neon Web Console / pgAdmin
1. Open your Neon SQL Editor or pgAdmin query tool.
2. Open [`schema.sql`](./schema.sql), copy all queries, and execute them.
3. This creates:
   - `users` table: Recruiter credentials, OTP timestamps, roles, and permissions.
   - `jobs` table: Open JD requisitions, salary bands, and department metadata.
   - `candidates` table: Candidate applications, screening states, interview rounds, and notes.
   - Necessary UUID extensions and search performance indexes.

### Method 3: Running Migrations
If you already have existing tables and need to sync updated authentication columns:
```bash
npm run migrate
```

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts Next.js on port `3002` (configurable in `package.json`):
```bash
npm run dev
```
Open [http://localhost:3002](http://localhost:3002) in your browser.

### 3. Production Build & Start
Compile optimized production bundles:
```bash
npm run build
```
Start the production server:
```bash
npm run start
```

### 4. Create an Offline Database Backup
To create a standalone SQL snapshot of schema definitions and all row data:
```bash
npm run backup
```
This generates `backup_schema_and_data.sql` in the project root.

---

## 📁 Project Structure

```
├── public/                 # Static assets (logos, icons)
├── scripts/
│   ├── backup.cjs          # Automated database schema & data backup script
│   └── migrate.cjs         # Database migration utility
├── src/
│   ├── app/
│   │   ├── admin/          # Admin control panel page
│   │   ├── admin-login/    # Admin entry redirect
│   │   ├── api/            # Next.js API endpoints (auth, candidates, jds, upload, etc.)
│   │   ├── login/          # Recruiter login (Password + OTP flow)
│   │   ├── master-login/   # Master recruiter / supervisor entry
│   │   ├── my-submissions/ # Personal candidate submission tracker
│   │   └── page.tsx        # Main Open JDs portal page
│   ├── components/         # Reusable UI modals (CandidateModal, JDModal, Navbar, Footer)
│   ├── data/               # Local JSON storage fallback
│   ├── lib/                # Database connection pools, JWT auth, and mailer logic
│   ├── middleware.ts       # Route guard middleware protecting secure portal routes
│   └── types/              # TypeScript interface definitions
├── .env.example            # Environment configuration template
├── package.json            # Scripts and dependencies
├── schema.sql              # PostgreSQL DDL schema definition
└── tsconfig.json           # TypeScript configuration
```

---

## 🛡️ License & Ownership

Confidential and proprietary property of Forcecraver. All rights reserved.
