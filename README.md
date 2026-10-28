# TokTickIT · Full-Stack IT Service Desk

TokTickIT is an IT service desk web application for handling Account & Access, Hardware, Software, and Network support requests. This repository contains the Lab 3 (Sprint 3) full-stack implementation built strictly according to the **Zen Green** visual design system. It replaces Lab 2's simulated Development Requester selector with real email/password authentication and role-based authorization for three roles — **Requester**, **IT Staff**, and **Administrator** — and adds an operational IT Staff ticket workflow and a minimalist Administrator user management screen, on top of the Lab 2 ticket creation, listing, and attachment lifecycle features.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Bootstrap 5, Zen Green Design System
- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Auth**: JWT-based sessions, bcrypt password hashing, server-side role-based authorization
- **Testing**: Vitest (Unit/Component), Supertest (API), Playwright (E2E)
- **Workflow**: Git Flow (`main` <- `lab3-staging` <- `feature/*`), GitHub Projects

---

## 📂 Repository Structure

```
toktickit/
├── client/          # React + Vite frontend
│   └── src/tests/   # UI component tests (Vitest), incl. lab-03/
├── server/          # Node.js + Express + Prisma backend
│   ├── prisma/      # Prisma schema, migrations, and seed scripts
│   ├── src/         # Express server source code
│   ├── scripts/     # One-off maintenance/E2E-support scripts
│   └── tests/       # API integration tests (Supertest), incl. lab-03/
├── e2e/             # Playwright E2E specs (lab-02/, lab-03/)
├── playwright.config.ts  # Playwright config (repo root; testDir: ./e2e)
├── docs/
│   ├── lab-01/      # Lab 1 documentation
│   ├── lab-02/      # Lab 2 documentation (specification.md, ui-spec.md, tests.md, reviewer.md, ai-use.md)
│   └── lab-03/      # Lab 3 documentation (specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md)
├── artifacts/
│   ├── lab-02/screenshots/  # Lab 2 responsive screenshots & evidence
│   └── lab-03/screenshots/  # Lab 3 responsive screenshots (authentication, staff-queue, staff-ticket-detail, user-management)
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started & Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: v18+ 
- **npm**: v9+
- **PostgreSQL**: v14+ (or Prisma Local Postgres)

### 2. Installation
Clone the repository and install dependencies at the repo root (E2E/Playwright), `server`, and `client`:
```bash
# Clone the repository
git clone https://github.com/Alongkron1234/toktickit.git
cd toktickit

# Install root dependencies (Playwright E2E runner)
npm install

# Install server dependencies
cd server && npm install
cd ..

# Install client dependencies
cd client && npm install
cd ..
```

### 3. Environment Configuration
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Ensure `DATABASE_URL` is set to your PostgreSQL connection string in `.env`.

> The Prisma client in `server/generated/` is **not committed**. `npm install` in `server` runs `prisma generate` automatically (`postinstall`); run `npx prisma generate` manually after changing `schema.prisma`.

### 4. Database Setup & Migration & Seeding
Run Prisma migrations and seed initial Requesters, Categories, and Related Systems:
```bash
cd server

# Apply the committed migrations (does not reset data)
npx prisma migrate deploy

# Seed database (Requesters, Categories, Related Systems, Sample Tickets)
npx prisma db seed
cd ..
```

Migrations live in `server/prisma/migrations/` and are applied with `migrate deploy`. Avoid `prisma migrate dev` on a database that already holds data: it can offer to reset it. To create a new migration, generate the SQL with `prisma migrate diff`, review it, then apply it with `migrate deploy`. The seed is idempotent (upsert), so it can be re-run safely.

### 5. Running the Application
Start the backend and frontend development servers:

- **Backend (Express API)**:
  ```bash
  cd server
  npm run dev
  ```
  Backend runs on `http://localhost:5001`.

- **Frontend (React UI)**:
  ```bash
  cd client
  npm run dev
  ```
  Frontend runs on `http://localhost:5173`.

### 6. Test Accounts (Local Development Only)
The seed script creates accounts for each role. All seeded accounts share the same initial password and are for local testing only — never reuse these in a real deployment.

| Role | Email | Initial Password |
| :--- | :--- | :--- |
| Requester | `jennifer.anderson@example.com` | `InitialPassword123!` |
| IT Staff | `alex.thompson@toktickit.com` | `InitialPassword123!` |
| Administrator | `john.smith@toktickit.com` | `InitialPassword123!` |
| Requester (no tickets, empty dashboard) | `emma.wilson@example.com` | `InitialPassword123!` |

---

## 🧪 Running Automated Tests

Run all automated test suites across Server, Client, and E2E levels:

```bash
# 1. Run server API integration tests (Supertest) — needs the database running and seeded
cd server
npm test

# 2. Run client UI component tests (Vitest)
cd client
npm test

# 3. Run End-to-End browser tests (Playwright) — from the repo root
npx playwright test
```

Before running E2E tests, start the database (`npm run db:dev` in `server`), the backend (`npm run dev` in `server`) and the frontend (`npm run dev` in `client`), and make sure the database is seeded. Test case IDs and their status per lab are listed in `docs/lab-0X/tests.md`.

---

## 📋 Features

### Lab 4 / Sprint 4 Scope
- **Actions Taken**: IT Staff and Administrators record, edit, complete or cancel actions on a ticket; the performer always comes from the signed-in user. Requesters can read actions on their own tickets.
- **Ticket Workflow**: Status changes use optimistic versioning (`expectedVersion`) and enforce permitted transitions and a required resolution summary.
- **Dashboards**: Requester and Staff/Admin dashboards (default landing page) with metrics computed by the backend; metric cards drill down into the filtered ticket list.
- **Auth cleanup & hardening**: Identity comes only from the JWT (the `X-Dev-Requester-Id` header and the Requester selector are removed); a Requester who requests another user's ticket gets the same `404` as for a missing ticket; accessible modals (dialog role, labels, Esc to close); double-submit protection covered by tests.

**Lab 4 demo path**: sign in as Requester (Jennifer) → Dashboard → create a ticket → sign in as IT Staff (Alex) → Dashboard → open the ticket from the queue → claim it, add an Actions Taken entry and walk the status to Resolved → sign in as Requester → comment / reopen; Administrator (John) can additionally see user counts on the dashboard.

### Lab 3 / Sprint 3 Scope
- **Authentication & Role-Based Authorization**: Email/password login, bcrypt-hashed passwords, JWT sessions, mandatory password change on first login, and server-side authorization for three roles — Requester, IT Staff, Administrator.
- **IT Staff Ticket Queue**: Shared queue with search, filters, sorting, and pagination; responsive desktop table and mobile card layouts.
- **IT Staff Ticket Detail & Workflow**: Claim/reassign ownership, set IT Priority, permitted status transitions, Public Comments, and role-restricted Internal Notes.
- **Public Comments & Ticket Reopening**: Requesters can post Public Comments and indicate a problem "appears resolved."
- **Administrator User Management**: Minimalist screen to view/search/filter users, create accounts, edit basic info, assign one role, activate/deactivate, and reset initial passwords — with safety guards against self-deactivation and removing the last active Administrator.

### Lab 2 / Sprint 2 Scope
- **Create Ticket Workflow**: Form with system-generated ticket number (`TKT-YYYY-XXXXXX`), initial status `NEW`, real-time field validation, busy submit state, and error state preservation.
- **My Tickets Workspace**:
  - Multi-criteria filtering (Category, Requested Priority, IT Priority, Current Status).
  - Partial case-insensitive search by ticket number or summary.
  - Sorting and pagination (10 items per page).
  - Responsive layouts: Desktop Data Table (≥992px), Tablet 2-row layout (768–991px), Mobile Cards (<768px).
- **Requester Ticket Detail**: Detailed ticket inspection with strict ownership access control, now via the authenticated user identity rather than the retired Development Requester selector.
- **Attachment Lifecycle & Soft Removal**:
  - File upload supporting JPG, PNG, WEBP, PDF up to 5MB (max 5 active files per ticket).
  - Active attachment downloads.
  - Soft removal (`isRemoved = true`) requiring mandatory removal reason, storing audit history while permanently blocking file downloads.

