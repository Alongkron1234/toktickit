# Test Plan, Strategy & Traceability Matrix
**Project:** TokTickIT Requester Ticketing MVP with UI Foundation  
**Sprint:** Sprint 2 (Lab 2)  

---

## 1. Test Strategy & Coverage Levels

The testing strategy follows **Test-Driven Development (TDD)** and **Test-Driven Design (Test DD)**. Automated tests are written across four complementary testing levels to guarantee quality and full AC compliance:

1. **Unit Tests:** Verify isolated helper functions, Ticket Number generators, input trimmers, and validation rules.
2. **API Integration Tests:** Verify HTTP REST endpoints, request validation, error responses, database persistence, and multi-requester ownership boundaries.
3. **UI Component Tests:** Verify React UI components, Zen Green theme styling tokens, form interactivity, busy submit states, field-level error messages, and state switching.
4. **End-to-End (E2E) Tests:** Verify complete user flows in real headless browser viewports (Desktop, Tablet, Mobile) using Playwright.

---

## 2. Planned Test Table

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-05 | Create valid ticket with required fields | 201 Created; saved in DB; unique `ticketNumber` returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| **API-02** | API | AC-02, BR-11 | Submit ticket with missing required fields or short summary | 400 Bad Request; field-level validation errors returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| **API-03** | API | AC-05, BR-07 | Request ticket creation without `X-Dev-Requester-Id` header | 403 Forbidden; error response returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| **API-04** | API | AC-08, BR-09 | Fetch ticket list for selected Requester A | 200 OK; returns only tickets belonging to Requester A | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| **API-05** | API | AC-09, AC-10 | Search ticket by keyword "laptop" and filter by Category | 200 OK; returns filtered subset matching both criteria | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| **API-06** | API | AC-12, BR-18 | Request paginated tickets (`page=1, pageSize=10`) | 200 OK; returns 10 items with correct pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| **API-07** | API | AC-14, BR-10 | Access Requester A's ticket detail using Requester B's ID header | 403 Forbidden or 404 Not Found; access rejected | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| **API-08** | API | AC-15, BR-19 | Upload valid PDF file attachment (2MB) | 201 Created; attachment metadata saved in DB | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| **API-09** | API | AC-16, BR-19 | Upload invalid file type (.exe) or oversized file (>5MB) | 400 Bad Request / 422 Unprocessable Entity | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| **API-10** | API | AC-17, BR-21 | Soft-remove attachment with removal reason | 200 OK; `isRemoved = true`, reason saved | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| **API-11** | API | AC-18, BR-22 | Attempt to download a soft-removed attachment | 404 Not Found / 403 Forbidden; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| **UI-01** | UI | AC-06, BR-05 | Requester Selection dropdown renders active users | Dropdown displays active users; inactive user hidden | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| **UI-02** | UI | AC-02, BR-12 | Submit Create Ticket form with empty summary | Field error "Summary is required" displayed below input | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| **UI-03** | UI | AC-03, BR-13 | Submit button busy state during API request | Button displays spinner, text "Submitting...", disabled | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| **UI-04** | UI | AC-04, BR-14 | Backend failure during ticket creation submission | Error alert displayed; form field inputs preserved | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| **UI-05** | UI | AC-07, BR-06 | Switch Requester in header while on My Tickets | Previous user's tickets clear; new user's list loaded | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| **UI-06** | UI | AC-11, BR-25 | Click "Clear Filters" button in No-Results state | Filters reset; full list of user's tickets re-rendered | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| **UI-07** | UI | AC-13, BR-25 | Render My Tickets for user with 0 tickets | Empty State illustration and "Create Ticket" button shown | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| **UI-08** | UI | AC-17, BR-22 | Render soft-removed attachment in Ticket Detail | Shows "Removed" badge and reason; download link disabled | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| **E2E-01**| E2E | AC-01, AC-08 | Full Create Ticket flow to My Tickets list verification | Ticket created, number returned, appears in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| **E2E-02**| E2E | AC-07, AC-14 | Requester switching and ownership isolation flow | Requester A tickets disappear when switching to Requester B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| **E2E-03**| E2E | AC-15, AC-17 | Attachment upload, soft removal, and blocked download flow | Uploads file, soft-removes with reason, verifies blocked link | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |

---

## 3. Acceptance-Criterion Traceability Matrix

| AC ID | Covered by Test IDs | Test File Paths |
| :--- | :--- | :--- |
| **AC-01** | API-01, E2E-01 | `server/tests/lab-02/create-ticket.api.test.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-02** | API-02, UI-02 | `server/tests/lab-02/create-ticket.api.test.ts`, `client/src/tests/lab-02/CreateTicket.test.tsx` |
| **AC-03** | UI-03 | `client/src/tests/lab-02/CreateTicket.test.tsx` |
| **AC-04** | UI-04 | `client/src/tests/lab-02/CreateTicket.test.tsx` |
| **AC-05** | API-03 | `server/tests/lab-02/create-ticket.api.test.ts` |
| **AC-06** | UI-01 | `client/src/tests/lab-02/RequesterSelector.test.tsx` |
| **AC-07** | UI-05, E2E-02 | `client/src/tests/lab-02/MyTickets.test.tsx`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-08** | API-04, E2E-01 | `server/tests/lab-02/my-tickets.api.test.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-09** | API-05 | `server/tests/lab-02/my-tickets.api.test.ts` |
| **AC-10** | API-05 | `server/tests/lab-02/my-tickets.api.test.ts` |
| **AC-11** | UI-06 | `client/src/tests/lab-02/MyTickets.test.tsx` |
| **AC-12** | API-06 | `server/tests/lab-02/my-tickets.api.test.ts` |
| **AC-13** | UI-07 | `client/src/tests/lab-02/MyTickets.test.tsx` |
| **AC-14** | API-07, E2E-02 | `server/tests/lab-02/ticket-detail.api.test.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-15** | API-08, E2E-03 | `server/tests/lab-02/attachments.api.test.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-16** | API-09 | `server/tests/lab-02/attachments.api.test.ts` |
| **AC-17** | API-10, UI-08, E2E-03 | `server/tests/lab-02/attachments.api.test.ts`, `client/src/tests/lab-02/AttachmentSection.test.tsx` |
| **AC-18** | API-11, E2E-03 | `server/tests/lab-02/attachments.api.test.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-19** | UI-08, E2E-03 | `client/src/tests/lab-02/AttachmentSection.test.tsx`, `e2e/lab-02/requester-ticket-flow.spec.ts` |

---

## 4. Responsive and Visual Checklist

- [ ] Desktop Viewport (1280x800): Verified no text clipping, multi-column centered alignment.
- [ ] Tablet Viewport (768x1024): Verified 2-column layout and form button touch sizing.
- [ ] Mobile Viewport (375x812): Verified single-column vertical stack, card list layout for My Tickets, zero horizontal page scrollbar.
- [ ] Visual Tokens: Primary green `#006B3C`, Secondary green `#0B7A46`, Pale green `#EAF6EF` badges verified.

---

## 5. Test Commands

```bash
# Run Server API Tests
npm --prefix server test

# Run Client Unit & Component Tests
npm --prefix client test

# Run Playwright E2E Tests
npx playwright test e2e/lab-02/
```

---

## 6. Final Results Summary
All planned automated tests (Unit, API, UI, and E2E) pass cleanly without any skipped or flaky tests on the `main` branch.
