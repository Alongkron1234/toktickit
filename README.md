# TokTickIT · Full-Stack IT Service Desk Starter

TokTickIT is an IT service desk web application for handling Account & Access, Hardware, Software, and Network requests. This repository contains the Lab 1 initial full-stack implementation using React, Express, Prisma ORM, and PostgreSQL.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Bootstrap
- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Testing**: Vitest, Supertest
- **Workflow**: Git Flow (`main` <- `lab1-staging` <- `feature/*`), GitHub Projects

---

## 📂 Repository Structure

```
toktickit/
├── client/          # React + Vite frontend
│   └── tests/       # UI component tests (Vitest)
├── server/          # Node.js + Express + Prisma backend
│   ├── prisma/      # Prisma schema, migrations, and seed scripts
│   ├── src/         # Express server source code
│   └── tests/       # API integration tests (Supertest)
├── docs/
│   └── lab-01/      # Lab documentation (ai_use.md, reviewer.md, tests.md)
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started & Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: v18+ 
- **npm**: v9+
- **PostgreSQL**: v14+ (or Prisma Local Postgres / Docker)

### 2. Installation
Clone the repository and install dependencies inside `server` and `client`:
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
```

### 3. Environment Configuration
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Ensure `DATABASE_URL` is set to your PostgreSQL connection string in `.env`.

### 4. Database Setup & Seeding
Run Prisma migrations and seed initial IT request categories:
```bash
# Start local Prisma Postgres server
cd server
npx prisma dev

# Apply database migrations
npx prisma migrate dev

# Seed initial categories (Account and Access, Hardware, Software, Network)
npx prisma db seed
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

Run server API tests and client component tests inside their respective directories:

```bash
# Run server integration tests (Supertest)
cd server
npm test

# Run client unit tests (Vitest)
cd client
npm test
```

---

## 📋 Features (Lab 1 Scope)

- **GET /api/health**: Backend health check endpoint returning status and service name.
- **GET /api/categories**: Returns supported IT request categories from PostgreSQL.
- **System Status UI**: React frontend displaying system status and request category list with loading/error states.
