# TokTickIT · Full-Stack IT Service Desk

TokTickIT is an IT service desk web application for handling Account & Access, Hardware, Software, and Network support requests. This repository contains the Lab 2 (Sprint 2) full-stack implementation built strictly according to the **Zen Green** visual design system, featuring simulated identity context switching, automated ticket generation, paginated ticket management, read-only ticket details, and secure attachment lifecycle management with soft removal.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Bootstrap 5, Zen Green Design System
- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Testing**: Vitest (Unit/Component), Supertest (API), Playwright (E2E)
- **Workflow**: Git Flow (`main` <- `lab2-staging` <- `feature/*`), GitHub Projects

---

## 📂 Repository Structure

```
toktickit/
├── client/          # React + Vite frontend
│   └── src/tests/   # UI component tests (Vitest)
├── server/          # Node.js + Express + Prisma backend
│   ├── prisma/      # Prisma schema, migrations, and seed scripts
│   ├── src/         # Express server source code
│   └── tests/       # API integration tests (Supertest)
├── e2e/             # Playwright E2E test suite & screenshot generator
├── docs/
│   ├── lab-01/      # Lab 1 documentation
│   └── lab-02/      # Lab 2 documentation (specification.md, ui-spec.md, tests.md, reviewer.md, ai-use.md)
├── artifacts/       # Lab 2 screenshots & evidence outputs
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
Clone the repository and install dependencies inside `server`, `client`, and `e2e`:
```bash
# Clone the repository
git clone https://github.com/Alongkron1234/toktickit.git
cd toktickit

# Install server dependencies
cd server && npm install
cd ..

# Install client dependencies
cd client && npm install
cd ..

# Install E2E test dependencies
cd e2e && npm install
cd ..
```

### 3. Environment Configuration
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Ensure `DATABASE_URL` is set to your PostgreSQL connection string in `.env`.

### 4. Database Setup & Migration & Seeding
Run Prisma migrations and seed initial Requesters, Categories, and Related Systems:
```bash
cd server

# Apply database migrations
npx prisma migrate dev

# Seed database (Requesters, Categories, Related Systems, Sample Tickets)
npx prisma db seed
cd ..
```

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

---

## 🧪 Running Automated Tests

Run all automated test suites across Server, Client, and E2E levels:

```bash
# 1. Run server API integration tests (Supertest)
cd server
npm test

# 2. Run client UI component tests (Vitest)
cd client
npm test

# 3. Run End-to-End browser tests (Playwright)
cd e2e
npx playwright test
```

---

## 📋 Features (Lab 2 / Sprint 2 Scope)

- **Development Requester Selection**: Simulated multi-user identity switching context (`X-Dev-Requester-Id`) with identity protection guards.
- **Create Ticket Workflow**: Form with system-generated ticket number (`TKT-YYYY-XXXXXX`), initial status `NEW`, real-time field validation, busy submit state, and error state preservation.
- **My Tickets Workspace**:
  - Multi-criteria filtering (Category, Requested Priority, IT Priority, Current Status).
  - Partial case-insensitive search by ticket number or summary.
  - Sorting and pagination (10 items per page).
  - Responsive layouts: Desktop Data Table (≥992px), Tablet 2-row layout (768–991px), Mobile Cards (<768px).
- **Requester Ticket Detail**: Read-only detailed ticket inspection with strict ownership access control.
- **Attachment Lifecycle & Soft Removal**:
  - File upload supporting JPG, PNG, WEBP, PDF up to 5MB (max 5 active files per ticket).
  - Active attachment downloads.
  - Soft removal (`isRemoved = true`) requiring mandatory removal reason, storing audit history while permanently blocking file downloads.

