# Test Plan, Strategy & Traceability Matrix

**Project:** TokTickIT Actions Taken, Dashboards, and Final Regression  
**Sprint:** Sprint 4 (Lab 4)  
**Status:** Planned before implementation. The **Final** column is updated with real results in the final Issue; until then every row is `Planned`.

---

## 1. Test Strategy

Tests are written from `specification.md` before the feature code (TDD): each test is first confirmed to fail for the expected reason, then the smallest correct implementation is added.

| Level | Tooling | Purpose |
| :--- | :--- | :--- |
| Unit | Vitest | Pure workflow functions (transition matrix, resolution gate decision) and validators |
| API / Integration | Vitest + Supertest on the real database with seed data | Endpoints, authorization, validation, persistence, conflicts, dashboards |
| Authorization / Security | Supertest | Role boundaries, Requester ownership, header-only requests rejected |
| UI component | Vitest + Testing Library | Screens, forms, states, busy buttons, drill-down callbacks |
| UI style | Vitest + Testing Library | Required CSS classes, badges, labels, asterisks, read-only vs editable |
| Responsive / Visual | Playwright viewports + screenshots | Desktop, tablet, mobile layouts without clipping or horizontal scroll |
| Migration / Regression | Supertest + script evidence | Lab 1-3 data preserved, legacy Tickets, idempotent seed, previous suites still green |
| Performance smoke | Supertest timing | Dashboard endpoints stay within 1000 ms on seed data |
| End-to-end | Playwright (Chromium) | Complete multi-role flows in a real browser |

Test accounts are the seeded local accounts documented in the README (Requester, IT Staff, Administrator).

---

## 2. Planned Tests

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | Unit | AC-08, BR-11, BR-12 | Transition matrix function for every status and role | Only matrix transitions are allowed | `server/tests/lab-04/workflow.unit.test.ts` | Implemented |
| UNIT-02 | Unit | AC-09, BR-09 | Resolution gate decision with open actions and missing summary | Returns failure reasons; passes when satisfied | `server/tests/lab-04/workflow.unit.test.ts` | Implemented |
| API-01 | API | AC-01, FR-01, BR-03 | IT Staff creates a valid action (client-sent performedBy ignored) | 201; saved under the Ticket with the authenticated creator | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-02 | API | AC-02, BR-04 | Create with follow-up required but empty note | 400 with field detail; nothing stored | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-03 | API | AC-01, BR-05, BR-06 | Description empty/too long, future action date | 400 validation errors | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-04 | API | AC-03, BR-07 | Assignee inactive, Requester, or unknown | 400 `INVALID_ASSIGNEE`; nothing stored | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-05 | API | AC-06, BR-02 | Staff B records an action on a Ticket owned by Staff A; list shows several actions | 201; list contains both authors | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-06 | API | AC-07, BR-08 | Complete (with/without result), cancel, edit/reassign after terminal state | 200 or 400; terminal edits return 409 `ACTION_NOT_EDITABLE` | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-07 | API | AC-04 | Requester calls create/edit/assign/complete/cancel directly | 403; no change | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-08 | API | AC-05, BR-21 | Requester B requests actions of Requester A's Ticket; Requester A requests own | 404 (identical to missing Ticket); own returns 200 read-only list | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| API-09 | API | AC-08, FR-07 | Each permitted transition per role, and illegal ones | Permitted 200; illegal 409 `ILLEGAL_STATUS_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-10 | API | AC-09, FR-08 | Resolve with an open action or no summary via direct API call, then fix and retry | 409 `RESOLUTION_GATE_FAILED` with reasons; succeeds after fix | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-11 | API | AC-10, BR-10 | Requester sets Resolved/Closed; Requester posts "appears resolved" | 403 for status; status unchanged after the indication | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-12 | API | AC-10, BR-11 | Requester reopens own RESOLVED/CLOSED Ticket; another Requester's Ticket | Own: 200 REOPENED; other's: rejected | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-13 | API | AC-11, BR-13 | Two actors with the same version: first succeeds, second stale | Second 409 `STALE_UPDATE`; first change preserved; version incremented once | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-14 | API | AC-12, FR-11 | Ticket detail returns `version`, `allowedTransitions`, `openActionsCount` | Values match the matrix and database | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented |
| API-15 | API | AC-13, BR-16 | Requester dashboard for A vs B | Only own metrics and Tickets | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| API-16 | API | AC-14, BR-15, BR-17 | Requester metrics equal direct database counts | Equal for every metric | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| API-17 | API | AC-15, BR-19 | Requester with no Tickets | All zeros, empty lists, 200 | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| API-18 | API | AC-14, BR-15 | Staff metrics (statuses, myAssigned, unassigned, priority, actions) equal direct database queries | Equal for every metric | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| API-19 | API | AC-14, FR-13 | Recent lists limited to 5 and ordered; Administrator gets `userCounts`, IT Staff gets `null` | As specified | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| API-20 | API | AC-15 | Staff user with no owned Tickets or actions | Zeros and empty lists | `server/tests/lab-04/dashboard.api.test.ts` (DASH-03c) | Implemented |
| API-21 | API | AC-16, FR-15 | Multi-status filter on both list endpoints equals dashboard card counts | Counts identical; invalid values ignored | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| SEC-01 | Security | AC-17 | Dashboard endpoints: no token, wrong role | 401 / 403; no metrics | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| SEC-02 | Security | AC-20, BR-20 | Protected endpoints with only `X-Dev-Requester-Id` | 401 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-03 | Security | AC-04, AC-05, BR-21 | Lab 2 endpoints (tickets, attachments) enforce token identity and ownership | Unauthenticated 401; other Requester's data rejected without existence leak | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| MIG-01 | Migration | AC-18 | Legacy Ticket without actions lists empty; existing Tickets, comments, notes, attachments unchanged | Empty action list; counts unchanged | `server/tests/lab-04/migration-regression.api.test.ts` | Implemented |
| MIG-02 | Migration | AC-19 | Seed run twice | Identical row counts; all statuses and 0/1/many actions present | `server/tests/lab-04/migration-regression.api.test.ts` | Implemented |
| MIG-03 | Migration | AC-18 | Migration and rollback on a copy of a populated database (scripted evidence) | No data loss; rollback restores Lab 3 state | `docs/lab-04/specification.md` section 8.5 (evidence recorded under Final Results) | Planned |
| REG-01 | Regression | AC-25, FR-19 | Complete Lab 1, Lab 2, and Lab 3 server suites | All pass | `server/tests/lab-01/`, `server/tests/lab-02/`, `server/tests/lab-03/` | Planned |
| REG-02 | Regression | AC-25, FR-19 | Complete client suites for Labs 1-3 | All pass | `client/src/tests/lab-01/`, `client/src/tests/lab-02/`, `client/src/tests/lab-03/` | Planned |
| PERF-01 | Performance smoke | AC-26 | Both dashboard endpoints on seed data | Each responds within 1000 ms | `server/tests/lab-04/dashboard.api.test.ts` | Implemented |
| UI-01 | UI | AC-01, AC-23 | Actions Taken list, empty state, create form success, busy state | Rows render; empty text shown; button disabled while saving; list refreshes | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| UI-02 | UI | AC-02, AC-03, AC-23 | Follow-up note appears and is required; field-level errors; invalid assignee error | Messages below fields; request not sent for client-detectable errors | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| UI-03 | UI | AC-07 | Edit, complete (result required), cancel confirmation | Controls only for `OPEN` actions; correct API calls | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| UI-04 | UI | AC-04 | Requester view of actions is read-only | No add/edit/complete/cancel controls | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| UI-05 | UI | AC-12 | Status control lists only `allowedTransitions` and refreshes summary after success | Options match; summary updates | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Implemented |
| UI-06 | UI | AC-09 | Resolution Summary field; open-action warning; gate reasons shown after 409 | Messages displayed; entered data kept | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Implemented |
| UI-07 | UI | AC-11, AC-23 | `STALE_UPDATE` shows conflict message with Reload | Message and Reload button shown | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Implemented |
| UI-08 | UI | AC-22 | Double click on submit/status buttons | API called once | `client/src/tests/lab-04/ActionsTaken.test.tsx`, `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Implemented |
| UI-09 | UI | AC-14, AC-16 | Staff dashboard renders cards and lists; card click calls drill-down with correct filter | Values shown; correct filter passed | `client/src/tests/lab-04/Dashboards.test.tsx` | Implemented |
| UI-10 | UI | AC-15, AC-23 | Staff dashboard loading, empty, forbidden, failure with Retry | Correct state for each | `client/src/tests/lab-04/Dashboards.test.tsx` | Implemented |
| UI-11 | UI | AC-13, AC-16 | Requester dashboard renders cards and lists; drill-down to My Tickets filter | Values shown; correct filter passed | `client/src/tests/lab-04/Dashboards.test.tsx` | Implemented |
| UI-12 | UI | AC-15, AC-23 | Requester dashboard loading, empty, failure | Correct state for each | `client/src/tests/lab-04/Dashboards.test.tsx` | Implemented |
| UI-13 | UI | AC-21 | No Development Requester selector, Change Requester action, or header usage | Absent from the rendered application | `client/src/tests/lab-04/StaffDashboard.test.tsx`, `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| STYLE-01 | UI style | AC-24 | Required classes: action/follow-up badges, metric cards, read-only vs editable fields, required asterisk, error placement, `aria-current` on active nav | Assertions pass | `client/src/tests/lab-04/ActionsTaken.test.tsx`, `client/src/tests/lab-04/StaffDashboard.test.tsx`, `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Implemented |
| RESP-01 | Responsive | AC-24 | Dashboards and Actions Taken at desktop, tablet, mobile: no horizontal scroll, no clipping, tap targets | `scrollWidth <= clientWidth`; checks pass; screenshots saved | `e2e/lab-04/dashboards.spec.ts`, `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-02, AC-06, AC-07 | IT Staff adds, assigns, edits, completes, and cancels actions; validation errors; Ticket with several authors' actions | Flow completes; list correct | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-04, AC-05 | Requester sees the same actions read-only; cannot reach staff controls | Read-only view only | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-08, AC-09, AC-10 | Open action blocks Resolved; after completion Resolved then Closed; Requester reopens; Requester cannot resolve | Blocked with reason, then succeeds | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-04 | E2E | AC-11, AC-23 | Two browser contexts change the same Ticket; second sees the conflict | Conflict message; first change kept | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-05 | E2E | AC-13, AC-15, AC-16 | Requester dashboard values, drill-down, no other Requester's Tickets, empty state | Matches seed; filtered list count equals card | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-06 | E2E | AC-14, AC-16, AC-17 | Staff dashboard values, drill-down to Queue, Administrator extras, Requester denied | Matches seed; denied for Requester | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-07 | E2E | AC-22, AC-23 | Repeated clicks create one record; backend failure keeps form data | One record; data preserved with safe message | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-08 | E2E | AC-25, AC-21 | Existing Lab 2 and Lab 3 E2E flows still pass and no selector/console errors | All pass | `e2e/lab-02/requester-ticket-flow.spec.ts`, `e2e/lab-03/authentication.spec.ts`, `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-03/user-administration.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| AC ID | Covered by Test IDs |
| :--- | :--- |
| AC-01 | API-01, API-03, UI-01, E2E-01 |
| AC-02 | API-02, UI-02, E2E-01 |
| AC-03 | API-04, UI-02 |
| AC-04 | API-07, UI-04, SEC-03, E2E-02 |
| AC-05 | API-08, SEC-03, E2E-02 |
| AC-06 | API-05, E2E-01 |
| AC-07 | API-06, UI-03, E2E-01 |
| AC-08 | UNIT-01, API-09, E2E-03 |
| AC-09 | UNIT-02, API-10, UI-06, E2E-03 |
| AC-10 | API-11, API-12, E2E-03 |
| AC-11 | API-13, UI-07, E2E-04 |
| AC-12 | API-14, UI-05 |
| AC-13 | API-15, UI-11, E2E-05 |
| AC-14 | API-16, API-18, API-19, UI-09, E2E-06 |
| AC-15 | API-17, API-20, UI-10, UI-12, E2E-05 |
| AC-16 | API-21, UI-09, UI-11, E2E-05, E2E-06 |
| AC-17 | SEC-01, E2E-06 |
| AC-18 | MIG-01, MIG-03 |
| AC-19 | MIG-02 |
| AC-20 | SEC-02 |
| AC-21 | UI-13, E2E-08 |
| AC-22 | UI-08, E2E-07 |
| AC-23 | UI-01, UI-02, UI-07, UI-10, UI-12, E2E-04, E2E-07 |
| AC-24 | STYLE-01, RESP-01 |
| AC-25 | REG-01, REG-02, E2E-08 |
| AC-26 | PERF-01 |

---

## 4. Responsive and Visual Checklist

Checked on the screenshots stored in `artifacts/lab-04/screenshots/` (desktop 1280x800, tablet 820x1180, mobile 390x844). The same checklist items appear in `ui-spec.md` section 11:

- No clipped labels, overlapping messages, hidden buttons, or unreadable text
- No unintended horizontal page scrolling
- Consistent editable vs read-only field styling and validation placement
- Consistent badges for status, priority, role, action status, and follow-up
- Dashboards, filters, lists, and Actions Taken forms remain usable at all sizes
- Visible keyboard focus

---

## 5. Test Commands (run from the documented final branch)

```bash
# Server (Vitest + Supertest, real database, seeded)
cd server && npm test

# Client (Vitest + Testing Library)
cd client && npm test

# End-to-end (Playwright) from the repository root; backend (port 5001) and frontend (port 5173) must be running on a seeded database
npx playwright test
```

---

## 6. Final Results

To be completed in the final Issue with the real output of each command above, run from the final `main` branch, the migration and rollback evidence for MIG-03, and updated `Final` values per test.

### 6.1 MIG-03 evidence (Issue: Actions Taken, run on the populated development database)

The development database was built with `prisma db push`, so it had no migration history. It was baselined instead of reset: the three earlier migrations (including `20260921000000_lab3_catchup_users_roles_comments`) were marked applied with `prisma migrate resolve --applied`, then `20260921010000_add_actions_taken` was applied with `prisma migrate deploy`.

| Table | Before | After Lab 4 migration | After rollback + re-apply + seed |
| :--- | ---: | ---: | ---: |
| User | 20 | 20 | 25 (rows added by earlier test runs) |
| Ticket | 97 | 97 | 106 (rows added by earlier test runs) |
| PublicComment | 131 | 131 | 136 |
| InternalNote | 47 | 47 | 49 |
| Attachment | 35 | 35 | 36 |
| Category / RelatedSystem | 4 / 7 | 4 / 7 | 4 / 7 |
| ActionTaken | (absent) | 0 | 4 (seed) |

- Before vs after the Lab 4 migration, every existing row count and the content fingerprint of the Ticket table (`13cbe798d7b425279c365eb2f6be60f4`) were identical: the migration only adds an enum, a table, indexes and foreign keys.
- Rollback: `DROP TABLE "ActionTaken"; DROP TYPE "ActionStatus";` and removal of its `_prisma_migrations` row. All other table counts were unchanged afterwards; `prisma migrate deploy` then re-applied the migration and the seed restored the sample actions. The Ticket fingerprint changes after a seed run only because the seed upserts sample Tickets (`updatedAt`).
- The first `migrate deploy` attempt failed because tool log lines were written into the generated SQL file; no schema change was made, the attempt was marked rolled back and the file was corrected.

### 6.2 Ticket workflow migration and Lab 3 test changes (Issue: Ticket Workflow)

- Migration `20260922000000_add_ticket_version` runs `ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;`. Row counts of every table were identical before and after (existing Tickets receive `version = 0`).
- Intentional change to existing tests: `PATCH /api/staff/tickets/:id/status` now requires `expectedVersion` (BR-13), so the status-workflow cases in `server/tests/lab-03/staff-ticket-detail.api.test.ts` read the current version first and send it. No expected result of those tests changed. The staff transition matrix additionally allows `RESOLVED -> REOPENED` (BR-11).

### 6.3 Dashboards (Issue: Dashboards)

- Migration `20260923000000_add_dashboard_indexes` creates `Ticket(requesterId, currentStatus)` and `Ticket(currentStatus, updatedAt)`. Row counts of every table were identical before and after; only `_prisma_migrations` gained one row.
- Dashboard server tests are in one file (`dashboard.api.test.ts`, DASH-01..09 and FILTER-01/02) and dashboard UI tests in one file (`Dashboards.test.tsx`, DUI-01..09); the planned per-role file split was merged. Metric tests compare each value with a direct `prisma` count computed in the test.
- UI-13 (no Development Requester selector) belongs to the hardening Issue and stays `Planned`.
- Finding fixed on the way: the Requester list endpoint (`GET /api/tickets`) accepted `status` but never applied it to its SQL query. It now filters (single value or comma-separated list), so a card value and the drill-down list count match.
- Intentional change to existing tests: the default landing page is now the Dashboard (spec 2), so the Lab 2 `CreateTicket.test.tsx` helper opens My Tickets before its flows. No Lab 2 expectation changed.
- Manual check in the browser on the seed database: the Unassigned card (152) opened the Ticket Queue showing "152 tickets"; the Requester Open card opened My Tickets with the combined status filter.

### 6.4 Seed coverage follow-up (Issue: Dashboard follow-up)

- `seed.ts` now adds five Tickets (`TKT-2026-001225` to `001229`) so that all eight statuses exist, and an active Requester without Tickets (`emma.wilson@example.com`) for the Requester Dashboard zero state. Test: `SEED-01` (all eight statuses) and `DASH-03b` (Emma's zero state) in `dashboard.api.test.ts`.
- The numbers `001225` to `001229` were chosen on purpose: `001235` to `001239` were already used by older test-created Tickets on the development database, and the app generates numbers as `max + 1`, so it can never produce a number below `001234`.
- Seed run twice on the populated development database: the first run added exactly 5 Tickets and 1 User; the second run left every table count unchanged (Ticket 233, User 52, ActionTaken 62, Attachment 41, PublicComment 177, InternalNote 61, Category 4, RelatedSystem 7). No migration was needed.
- The Dashboard API test now deletes the accounts it creates, so repeated runs no longer leave `dash.*` users behind. One older leftover account that already owns a Ticket was not removed.
- Card accessibility: the "Needs your reply" cue is linked to the card with `aria-describedby`.

## 7. Known Limitations or Deferred Tests

To be completed at the end of the sprint. Any skipped or deferred test must be listed here with its reason; none are planned at this time.

