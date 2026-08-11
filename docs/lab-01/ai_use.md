# AI Use Log and Reflection

I used the Antigravity coding agent through my Google Cloud Platform account. I mainly used Gemini 3.6 Flash as the LLM with a thinking level of High.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| Plan Lab 1 Implementation | Read the enclosed TokTickIT Lab 1 requirements. Summarize the four GitHub Issues, their dependencies, required outputs, and required automated tests. Propose an implementation order, but do not write code yet. | Worked in one shot with clear structure and breakdown. |
| Analyze Project Structure & Plan Issue 2 | Read my file structure again, I've made some small edits. Then explain issue 2 and put together a step-by-step implementation plan. | Generated a complete implementation plan covering Express setup, Supertest, React UI, and Vitest. |
| Implement Health Check API | Create GET /api/health endpoint returning status 200 and { status: 'ok', service: 'TokTickIT API' }. | Implemented in server/src/app.ts cleanly. |
| Write Supertest API-01 Test | Create a Supertest test in server/tests/lab-01/api-01.test.ts to verify GET /api/health. | Test passed on first run. |
| Build Check System UI | Update React App component with Bootstrap to show TokTickIT IT Service Desk, [Check System] button, and handling of Online/Offline status. | Created clean UI with loading and error states. |