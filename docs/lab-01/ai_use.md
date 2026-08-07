# AI Use Log and Reflection

I used the Antigravity coding agent through my Google Cloud Platform account. I mainly used Gemini 3.6 Flash as the LLM with a thinking level of High.

## Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Project Setup & Planning | Read TokTickIT Lab 1 requirements, summarize the four GitHub Issues, dependencies, and automated tests. Propose implementation roadmap and set up project foundation including frontend, backend, prisma, `.gitignore`, `.env.example`, and `README.md`. | Worked in one shot. Generated clear breakdown, folder structure, and setup roadmap. |
| **Issue 2** | Health Check Feature | Plan and implement `GET /api/health` endpoint returning HTTP 200 `{ status: 'ok', service: 'TokTickIT API' }`, write Supertest test (`api-01.test.ts`), and build Check System UI with Bootstrap loading/error states. | Successfully implemented vertical slice from Express backend API to React UI and Vitest/Supertest suites. |
| **Issue 3** | Category Model & Seeding | Explain Issue 3 requirements and plan, define Prisma Category model (`id`, `name`, `createdAt`), configure Prisma v7 (`prisma.config.ts`), run migration, and create idempotent seed script inserting the 4 IT request categories. | Successfully created schema, migration SQL, and idempotent seed script using `upsert` that passed duplicate run tests cleanly. |