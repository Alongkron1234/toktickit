# Lab 1 Automated Tests Result

All automated tests for Lab 1 are executed using Vitest and Supertest (`npm test`).

## Test Execution Summary

| Test ID | Tool | Test Description | Test File Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| **API-01** | Supertest | Health endpoint returns 200 and expected JSON | `server/tests/lab-01/api-01.test.ts` | **PASSED** |
| **API-02** | Supertest | Categories endpoint returns the four seeded categories | `server/tests/lab-01/api-02.test.ts` | *Pending (Issue 4)* |
| **UI-01** | Vitest | TokTickIT heading renders | `client/src/App.test.tsx` | **PASSED** |
| **UI-02** | Vitest | Loading state changes to category list | `client/src/App.test.tsx` | *Pending (Issue 4)* |
| **UI-03** | Vitest | API failure displays a useful error message | `client/src/App.test.tsx` | **PASSED** |

---

### Command Output (`npm test`)

```text
> test
> npm run test:server && npm run test:client

> test:server
> npm --prefix server run test

 RUN  v4.1.10 server
 ✓ tests/lab-01/api-01.test.ts (1 test) 7ms

 Test Files  1 passed (1)
      Tests  1 passed (1)

> test:client
> npm --prefix client run test

 RUN  v4.1.10 client
 ✓ src/App.test.tsx (3 tests) 55ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```