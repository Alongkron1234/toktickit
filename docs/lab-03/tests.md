# Test Plan, Strategy & Traceability Matrix

**Project:** TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Sprint:** Sprint 3 (Lab 3)  

---

## 1. Test Strategy & Coverage Levels

The testing strategy strictly follows **Test-Driven Development (TDD)** and **Test-Driven Design (Test DD)** across five complementary levels:

1. **Unit Tests:** Verify helper functions, password hashing/validation, role checks, and utility formatters.
2. **API Integration Tests:** Verify HTTP REST endpoints, session authentication, server-side authorization enforcement, database persistence, and safety rules.
3. **UI Component Tests:** Verify React UI components, Zen Green theme badge renderings, form interactivity, busy submit states, and responsive views.
4. **Security / Authorization Tests:** Verify strict multi-tenant Requester boundaries, role isolation (e.g., blocking Requesters from Internal Notes or Admin endpoints), and Admin safety guards.
5. **End-to-End (E2E) Tests:** Verify complete multi-role user flows in real headless browser viewports (Desktop, Tablet, Mobile) using Playwright.

---

## 2. Planned Test Table

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-01 | Valid user authentication with email and password | 200 OK; returns authenticated user profile & role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | AC-01, BR-01 | Login attempt with invalid credentials or inactive account | 401 Unauthorized / 403 Forbidden error response | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | AC-02, BR-02 | First-login user password change submission | 200 OK; updates password, sets `requiresPasswordChange = false` | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-03, BR-05 | Requester requests ticket owned by another user | 403 Forbidden / 404 Not Found; access rejected | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-05** | API | AC-04, BR-10 | Requester requests Internal Notes endpoint | 403 Forbidden; no note metadata returned | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-06** | API | AC-05, FR-08 | IT Staff fetches queue with search "printer" & status "OPEN" | 200 OK; returns filtered ticket subset with pagination | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-07** | API | AC-06, FR-09 | IT Staff claims unassigned ticket ownership | 200 OK; ticket `ownerId` updated to staff ID | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-08** | API | AC-07, BR-10 | IT Staff posts Public Comment & Internal Note | 201 Created for both; saved in respective tables | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-09** | API | AC-08, BR-11 | Admin creates user with valid details / duplicate email | 201 Created for valid user; 400 Bad Request for duplicate email | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-10** | API | AC-09, BR-13 | Admin attempts self-deactivation or deactivating last Admin | 400 Bad Request / 403 Forbidden; operation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, FR-01 | Login form validation and busy submit state | Inline validation errors shown; button disabled while loading | `client/.../lab-03 tests/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-02, BR-02 | First-login password change screen requirements | Displays live password requirements checklist & form | `client/.../lab-03 tests/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | AC-05, FR-08 | IT Staff Queue search input & status filter interactivity | Queue table re-renders matching filtered items | `client/.../lab-03 tests/StaffTicketQueue.test.tsx` | Pass |
| **UI-04** | UI | AC-07, BR-10 | Visual distinction between Public Comments & Internal Notes | Comments styled in Indigo container; Notes in Amber warning container | `client/.../lab-03 tests/StaffTicketDetail.test.tsx` | Pass |
| **UI-05** | UI | AC-08, FR-14 | Admin User Management user list and creation drawer | Renders user list with role badges; drawer opens on click | `client/.../lab-03 tests/UserManagement.test.tsx` | Pass |
| **E2E-01**| E2E | AC-01, AC-02 | End-to-end first login, password change, and app entry flow | User logs in with initial password, changes password, enters app | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02**| E2E | AC-05, AC-07 | IT Staff queue search, claim ticket, and internal note workflow | IT Staff logs in, finds ticket, claims ownership, posts note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-03**| E2E | AC-08, AC-09 | Admin user creation, search, edit, and safety check workflow | Admin creates user, verifies duplicate check, verifies self-deactivation guard | `e2e/lab-03/user-administration.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| AC ID | Covered by Test IDs | Test File Paths |
| :--- | :--- | :--- |
| **AC-01** | API-01, API-02, UI-01, E2E-01 | `server/tests/lab-03/auth.api.test.ts`, `client/.../Login.test.tsx`, `e2e/lab-03/authentication.spec.ts` |
| **AC-02** | API-03, UI-02, E2E-01 | `server/tests/lab-03/auth.api.test.ts`, `client/.../ChangePassword.test.tsx`, `e2e/lab-03/authentication.spec.ts` |
| **AC-03** | API-04 | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-04** | API-05 | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-05** | API-06, UI-03, E2E-02 | `server/tests/lab-03/staff-queue.api.test.ts`, `client/.../StaffTicketQueue.test.tsx`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-06** | API-07, E2E-02 | `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-07** | API-08, UI-04, E2E-02 | `server/tests/lab-03/comments-notes.api.test.ts`, `client/.../StaffTicketDetail.test.tsx`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-08** | API-09, UI-05, E2E-03 | `server/tests/lab-03/users-admin.api.test.ts`, `client/.../UserManagement.test.tsx`, `e2e/lab-03/user-administration.spec.ts` |
| **AC-09** | API-10, E2E-03 | `server/tests/lab-03/users-admin.api.test.ts`, `e2e/lab-03/user-administration.spec.ts` |
| **AC-10** | API-01, API-04 | `server/tests/lab-03/auth.api.test.ts`, `server/tests/lab-03/authorization.api.test.ts` |
