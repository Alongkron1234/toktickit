# Lab 4 Sprint Engineering Specification

**Project:** TokTickIT Actions Taken, Dashboards, and Final Regression  
**Sprint:** Sprint 4 (Lab 4)  
**Status:** Draft for owner review. Items marked **(Decision)** are proposals that the owner must confirm or change before implementation starts.

---

## 1. Sprint Goal

Complete the core TokTickIT service-desk workflow. IT Staff and Administrators record **Actions Taken** against a Ticket, the Ticket lifecycle is enforced end to end by the backend (transition matrix, resolution gate, and stale-update protection), Requesters and IT Staff get concise role-appropriate **dashboards** that link into the detailed screens, and the whole application built in Labs 1 to 3 is hardened so it behaves as one secure, consistent, responsive, and accessible product, verified by unit, API, UI, security, performance-smoke, and E2E tests.

---

## 2. Stakeholder Request Interpretation

The service desk can receive Tickets and IT Staff can talk to Requesters, but the actual work is not yet planned or tracked. The stakeholder asks for:

1. **Actions Taken** under each Ticket. Each action records when it happened, what was done, the result, who performed it (automatic), whether follow-up is required, a follow-up note (mandatory when follow-up is required), and notes about attachments (for example which file to look at).
2. A Ticket Owner who stays responsible for coordinating the whole Ticket, while other IT Staff members may perform and record actions.
3. A Requester who may keep saying "the problem appears resolved", while only IT Staff formally resolve or close the Ticket after reviewing the work.
4. Short dashboards for Requesters and IT Staff that summarize operational data and connect to the detailed screens instead of replacing them.
5. A final polish and hardening pass so earlier features still work consistently under the Zen Green design language.

---

## 3. Scope

### Included
- **Actions Taken:** model, migration, seed, REST API, and UI (IT Staff create/view/edit/assign/complete/cancel; Requester read-only for owned Tickets).
- **Ticket workflow completion:** a final transition matrix with permitted roles, a resolution gate enforced by the backend, stale-update (optimistic concurrency) protection, and UI that offers only permitted transitions.
- **Dashboards:** Requester Dashboard and IT Staff Dashboard (Administrator reuses the IT Staff Dashboard and adds concise user-account counts), calculated by the backend, with drill-down into My Tickets / Ticket Queue / Ticket Detail.
- **Multi-status filter** on the two existing list endpoints so that dashboard cards and their drill-down lists always show identical counts.
- **Final regression and hardening:** removal of the temporary Lab 2 identity mechanism (the `X-Dev-Requester-Id` header fallback, the Development Requester selector, and their client state), consistent feedback states, duplicate-submit protection, accessibility pass, console cleanliness, and current README.
- **Data migration and seed:** Prisma migration that preserves all Lab 1 to 3 data, documented rollback, and an idempotent seed with Tickets in every status.

### Excluded
- Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications.
- Email, SMS, LINE, push, or any external notification service.
- Inventory, spare parts, purchasing, or cost accounting; time-sheet billing, payroll, or labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- BI tools, custom report builders, exports, and trend comparisons such as "+3 from yesterday" shown in the instructor mockup **(Decision: excluded; the metric cards show current values only)**.
- Multi-tenant organizations and production-scale cloud operations.
- Any product feature not approved in this contract.

---

## 4. Functional Requirements (FR)

### Actions Taken
- **FR-01 (Create Action):** IT Staff and Administrators can create an Action Taken on any Ticket. The system stores Action Date/Time, Description, Result, Follow-Up Required, Follow-up Note, Attachment Notes, optional Assignee, and sets Performed By from the authenticated user.
- **FR-02 (List Actions):** IT Staff and Administrators can list all Actions Taken of a Ticket in a stable order (newest action date first, then newest id).
- **FR-03 (Edit and Assign):** IT Staff and Administrators can edit the fields of an action that is still `OPEN` and assign or reassign it to an active IT Staff or Administrator.
- **FR-04 (Complete Action):** IT Staff and Administrators can complete an `OPEN` action by providing its Result.
- **FR-05 (Cancel Action):** IT Staff and Administrators can cancel an `OPEN` action.
- **FR-06 (Requester View):** A Requester can view all Actions Taken of a Ticket they own, read-only. A Requester cannot create, edit, assign, complete, or cancel actions.

### Ticket Workflow
- **FR-07 (Transition Matrix):** The backend allows only the status transitions in section 6 (matrix), per role, and rejects every other transition.
- **FR-08 (Resolution Gate):** The backend refuses to move a Ticket to `RESOLVED` while the gate conditions in BR-09 are not met, regardless of the client used.
- **FR-09 (Requester Resolution Indication):** A Requester can still indicate that the problem appears resolved. This is advisory and never changes the Ticket status.
- **FR-10 (Stale Update Protection):** A status, ownership, or priority change based on out-of-date Ticket data is rejected with a conflict response and does not overwrite the newer change.
- **FR-11 (Allowed Transitions Feedback):** The Ticket detail response tells the UI which transitions the current user may perform, so the UI offers only those.

### Dashboards
- **FR-12 (Requester Dashboard):** The system returns metrics and short lists calculated only from the authenticated Requester's Tickets.
- **FR-13 (IT Staff Dashboard):** The system returns operational metrics, the current user's tickets and actions, and recent Tickets for IT Staff and Administrators; Administrators additionally receive concise user-account counts.
- **FR-14 (Drill-down):** Every actionable dashboard card or row opens the appropriate filtered list or Ticket Detail.
- **FR-15 (Multi-status Filter):** `GET /api/tickets` and `GET /api/staff/tickets` accept a comma-separated `status` filter.

### Hardening and Regression
- **FR-16 (Single Identity Source):** Every protected endpoint identifies the caller only from a valid token or session. A request carrying only `X-Dev-Requester-Id` is rejected with `401`.
- **FR-17 (Temporary UI Removal):** The Development Requester selector, its context, and the `/api/requesters` lookup are removed.
- **FR-18 (Duplicate Submission Safety):** Repeated clicks or retries on create/update actions do not create duplicate records.
- **FR-19 (Regression Continuity):** All Lab 1 to Lab 3 behavior (authentication, authorization, Requester tickets, attachments, comments, internal notes, staff queue and detail, user management) continues to work.

---

## 5. Business Rules (BR)

### Actions Taken
- **BR-01 (One Ticket per Action):** An Action Taken belongs to exactly one Ticket; a Ticket may have many actions, including none.
- **BR-02 (Owner Coordinates, Anyone Acts):** The Ticket Owner coordinates the Ticket as a whole, but an Action Taken may be recorded and performed by a different IT Staff member or Administrator.
- **BR-03 (Performed By Is Automatic):** `performedBy` is set by the backend from the authenticated user. Any value supplied by the client is ignored.
- **BR-04 (Follow-up Rule):** When `followUpRequired` is `true`, `followUpNote` is required (1 to 1000 characters after trimming). When it is `false`, `followUpNote` is stored as empty.
- **BR-05 (Field Limits):** After trimming, Description is 1 to 2000 characters; Result is at most 1000 characters; Attachment Notes are at most 500 characters. **(Decision)** Result is optional while the action is `OPEN` and required (1 to 1000 characters) to complete it.
- **BR-06 (Action Date/Time):** `actionAt` defaults to the server time. A client may supply an earlier date/time; a date/time more than 5 minutes in the future is rejected.
- **BR-07 (Valid Assignee):** An assignee, when provided, must be an active user with role `IT_STAFF` or `ADMINISTRATOR`. Inactive users, Requesters, and unknown ids are rejected.
- **BR-08 (Action Lifecycle):** **(Decision)** An action has status `OPEN`, `COMPLETED`, or `CANCELLED`. A new action is `OPEN`. `OPEN` can become `COMPLETED` or `CANCELLED`. `COMPLETED` and `CANCELLED` are terminal and the action can no longer be edited or reassigned (`409`).

### Ticket Workflow
- **BR-09 (Resolution Gate):** **(Decision)** A Ticket may move to `RESOLVED` only when (a) it has no Action Taken with status `OPEN`, and (b) a non-empty Resolution Summary is provided with the request or already stored. Violations return `409 RESOLUTION_GATE_FAILED` listing the reasons. The rule is enforced by the backend for every client.
- **BR-10 (Requester Cannot Resolve):** A Requester can never set `RESOLVED` or `CLOSED`. "Problem Appears Resolved" only sets `appearsResolvedAt` (advisory) and does not change `currentStatus`.
- **BR-11 (Reopen):** The Ticket's Requester can reopen a `RESOLVED` or `CLOSED` Ticket (to `REOPENED`). IT Staff can reopen a `RESOLVED` Ticket.
- **BR-12 (Terminal States):** `CANCELLED` is terminal. `CLOSED` can only be reopened by its Requester.
- **BR-13 (Stale Update):** Every Ticket has a `version` that increases by 1 on each status, ownership, or priority change. A request that carries an `expectedVersion` different from the stored `version` is rejected with `409 STALE_UPDATE` and changes nothing. Status changes require `expectedVersion`; ownership and priority changes accept it optionally (the UI always sends it).
- **BR-14 (Ownership Unchanged):** Ownership rules from Lab 3 (BR-07 of Lab 3: owner must be an active IT Staff or Administrator) still apply.

### Dashboards
- **BR-15 (Backend Calculation):** All dashboard numbers are calculated by the backend from the database. The client never counts Tickets.
- **BR-16 (Requester Scope):** The Requester Dashboard uses only Tickets whose `requesterId` equals the authenticated user id. No client-supplied id is accepted.
- **BR-17 (Metric Definitions):** Exact metric formulas are in section 8.4. `CANCELLED` Tickets are never counted as open, active, or in the status cards.
- **BR-18 (Recent Window and Time Zone):** "Recent" lists contain at most 5 items. "Recently resolved" means status `RESOLVED` or `CLOSED` and `updatedAt` within the last 7 days, measured as a rolling window from the server's current time (so no calendar-day or time-zone boundary affects counts). Timestamps are stored in UTC and displayed in the browser's local time (Asia/Bangkok for the course).
- **BR-19 (Empty Data):** When no records match, counts are `0` and lists are empty; the UI shows an empty state, never an error.

### Identity and Security
- **BR-20 (Identity from Token Only):** Identity and role come only from a valid token/session. The `X-Dev-Requester-Id` header is not an authentication mechanism.
- **BR-21 (Safe Errors):** Responses for Tickets, actions, or notes the caller may not access do not reveal whether the resource exists (`404` for non-owned Requester access to Tickets and Actions).

---

## 6. Authorization Matrix and Status Transition Matrix

### 6.1 Operations

| Operation / Resource | Requester | IT Staff | Administrator |
| :--- | :---: | :---: | :---: |
| View Actions Taken of a Ticket | ✅ (Owned, read-only) | ✅ | ✅ |
| Create / Edit / Assign / Complete / Cancel Action | ❌ | ✅ | ✅ |
| Change Ticket status (staff transitions) | ❌ | ✅ | ✅ |
| Reopen Ticket | ✅ (Owned) | ✅ (`RESOLVED` only) | ✅ (`RESOLVED` only) |
| Indicate Problem Appears Resolved | ✅ (Owned) | ❌ | ❌ |
| Requester Dashboard | ✅ | ❌ | ❌ |
| IT Staff Dashboard | ❌ | ✅ | ✅ (plus user counts) |
| All Lab 3 operations | unchanged | unchanged | unchanged |

### 6.2 Status Transition Matrix

| From | To | Permitted by |
| :--- | :--- | :--- |
| `NEW` | `OPEN`, `CANCELLED` | IT Staff, Administrator |
| `OPEN` | `IN_PROGRESS`, `CANCELLED` | IT Staff, Administrator |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED` (gate), `CANCELLED` | IT Staff, Administrator |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED` (gate), `CANCELLED` | IT Staff, Administrator |
| `RESOLVED` | `CLOSED` | IT Staff, Administrator |
| `RESOLVED` | `REOPENED` | Ticket's Requester, IT Staff, Administrator |
| `CLOSED` | `REOPENED` | Ticket's Requester only |
| `REOPENED` | `IN_PROGRESS`, `OPEN`, `CANCELLED` | IT Staff, Administrator |
| `CANCELLED` | none | terminal |

Any pair not listed is rejected with `409 ILLEGAL_STATUS_TRANSITION`.

---

## 7. UI Specification Summary

Full detail is in `ui-spec.md`. Summary:

- **Application shell:** role-based navigation gains a **Dashboard** destination for each role with a clear active-page indicator; the Development Requester display and Change Requester action no longer exist.
- **IT Staff Dashboard:** metric cards (New, Open, In Progress, Waiting for Requester, My Assigned, Unassigned), My Recent Tickets, My Actions Taken, Quick Actions, Refresh. Administrators also see account counts.
- **Requester Dashboard:** metric cards (Open, In Progress, Waiting for Requester, Resolved, Closed), Recently Updated, Recently Resolved, Quick Actions.
- **Actions Taken:** a tab on the IT Staff Ticket Detail with list, create mode, and edit/view mode; a read-only list on the Requester Ticket Detail.
- **Workflow controls:** the status control lists only the transitions returned by the backend, shows gate and conflict messages, and refreshes the Ticket summary after success.
- **States:** loading, empty, no-results, validation, success, forbidden, not-found, conflict, and safe API-failure feedback, in all screens.
- **Responsive and accessible:** desktop (>=992px), tablet (768-991px), mobile (<768px); no horizontal page scrolling; visible keyboard focus; labels for icon-only controls; status never conveyed by color alone.

---

## 8. Data Changes

### 8.1 New enum and model
- Enum `ActionStatus { OPEN, COMPLETED, CANCELLED }`.
- Model `ActionTaken`:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | Int, PK, autoincrement | |
| `ticketId` | Int, FK to `Ticket`, `onDelete: Cascade` | required |
| `actionAt` | DateTime | default `now()`; BR-06 |
| `description` | String | required, 1-2000 |
| `result` | String? | optional while `OPEN`; required on completion |
| `performedById` | Int, FK to `User` | set by backend |
| `assigneeId` | Int?, FK to `User` | optional; BR-07 |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | String? | required when `followUpRequired` |
| `attachmentNotes` | String? | optional, max 500 |
| `status` | `ActionStatus` | default `OPEN` |
| `createdAt`, `updatedAt` | DateTime | |

- `Ticket` gains `version Int @default(0)` and the relation `actions ActionTaken[]`. `User` gains relations for performed and assigned actions.

### 8.2 Indexes and relationships
- `@@index([ticketId, actionAt])` for ordered per-Ticket listing.
- `@@index([assigneeId, status])` for "actions assigned to me" and open-action counts.
- `@@index([performedById, actionAt])` for "my recent actions".
- `@@index([requesterId, currentStatus])` and `@@index([currentStatus, updatedAt])` on `Ticket` for dashboard counts and recent lists.

### 8.3 Database design decisions (justified)
1. **Separate child table with cascade:** Actions are a parent-child structure (one Ticket, many actions). A child table keeps Ticket rows small, lets actions be paged and ordered independently, and `onDelete: Cascade` mirrors the existing Attachment, comment, and note models. Users are never deleted (Lab 3 BR-12), so the user foreign keys keep the default restrictive behavior and history is preserved.
2. **Integer `version` instead of comparing `updatedAt`:** timestamps can collide at the same millisecond and depend on clock precision, so two quick writes could look identical. An integer incremented in the same `UPDATE ... WHERE id = ? AND version = ?` statement is deterministic and atomic, which makes stale updates reliably detectable without extra locking.
3. **Status as an enum on the action row:** open-action counts (resolution gate and dashboards) become an indexed equality check instead of inferring state from nullable columns.
4. **Indexes follow the access patterns** listed in 8.2; each corresponds to one planned query (per-Ticket list, assignee workload, dashboard counts, recent lists).

### 8.4 Dashboard metric definitions (`active` = `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`)

**Requester Dashboard** (only the caller's Tickets)

| Metric | Formula | Drill-down |
| :--- | :--- | :--- |
| `open` | status in `NEW`, `OPEN`, `REOPENED` | My Tickets, `status=NEW,OPEN,REOPENED` |
| `inProgress` | status `IN_PROGRESS` | My Tickets, `status=IN_PROGRESS` |
| `waitingForRequester` | status `WAITING_FOR_REQUESTER` | My Tickets, `status=WAITING_FOR_REQUESTER` |
| `resolved` | status `RESOLVED` | My Tickets, `status=RESOLVED` |
| `closed` | status `CLOSED` | My Tickets, `status=CLOSED` |
| `recentlyUpdated` | 5 Tickets, `updatedAt` descending | Ticket Detail |
| `recentlyResolved` | up to 5 with status `RESOLVED` or `CLOSED` and `updatedAt` in last 7 days | Ticket Detail |

**IT Staff Dashboard** (all Tickets unless stated)

| Metric | Formula | Drill-down |
| :--- | :--- | :--- |
| `new` | status `NEW` | Queue, `status=NEW` |
| `open` | status `OPEN` or `REOPENED` | Queue, `status=OPEN,REOPENED` |
| `inProgress` | status `IN_PROGRESS` | Queue, `status=IN_PROGRESS` |
| `waitingForRequester` | status `WAITING_FOR_REQUESTER` | Queue, `status=WAITING_FOR_REQUESTER` |
| `myAssigned` | `ownerId` = current user and status active | Queue, `ownerId=<me>` + active statuses |
| `unassigned` | `ownerId` is null and status active | Queue, `ownerId=unassigned` + active statuses |
| `byItPriority` | counts of active Tickets per `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) | Queue, `priority=<value>` |
| `myRecentTickets` | 5 Tickets owned by current user, `updatedAt` descending | Ticket Detail |
| `myOpenActions` | count of actions with `assigneeId` = current user and status `OPEN` | (informational) |
| `myRecentActions` | 5 actions with `performedById` = current user, `actionAt` descending | Ticket Detail |
| `userCounts` (Administrator only) | active and inactive users, and active users per role | User Management |

### 8.5 Migration, backfill, and rollback
- **Additive migration:** creates `ActionStatus`, `ActionTaken`, `Ticket.version` (default `0`), and the indexes. It drops and alters nothing else, so all Users, Tickets, Attachments, Public Comments, and Internal Notes remain valid.
- **Legacy Tickets:** Tickets created before this sprint have zero actions. They list as empty, never as an error, and dashboards count them by Ticket status only (not by actions). Existing rows get `version = 0` from the column default; no data backfill is required.
- **Lab 3 migration gap:** the repository currently contains migrations only up to Lab 2 while `schema.prisma` already contains the Lab 3 models. Before adding the Lab 4 migration, a catch-up migration for the Lab 3 schema must be created and marked as applied on databases that already have those tables. **(Decision)** the exact procedure is recorded when the Actions Taken Issue is implemented, and tested on a copy of a populated database.
- **Rollback / recovery:** Prisma has no automatic down migration, so the documented rollback is `DROP TABLE "ActionTaken"; DROP TYPE "ActionStatus"; ALTER TABLE "Ticket" DROP COLUMN "version";` (and dropping the added indexes), preceded by a `pg_dump` backup. The rollback is run on a copy and verified to leave Lab 3 data intact.

### 8.6 Seed data (idempotent)
Running the seed repeatedly produces no duplicates. It includes Tickets in all eight statuses with different priorities and both assigned and unassigned ownership; Tickets with zero, one, and several Actions Taken (several authored by different IT Staff); an inactive assignee candidate; and a Requester with no Tickets, so zero and non-zero dashboard values can both be demonstrated.

---

## 9. API Contract

Endpoint paths, request and response shapes, statuses, and errors are specified in `api-spec.md`. New or changed endpoints:

- `GET /api/staff/tickets/:id/actions`, `POST /api/staff/tickets/:id/actions`, `PATCH /api/staff/tickets/:id/actions/:actionId`, `POST /api/staff/tickets/:id/actions/:actionId/complete`, `POST /api/staff/tickets/:id/actions/:actionId/cancel`
- `GET /api/tickets/:id/actions` (Requester, read-only)
- `GET /api/dashboard/requester`, `GET /api/dashboard/staff`
- Changed: `PATCH /api/staff/tickets/:id/status` (matrix, gate, `expectedVersion`), `PATCH /api/staff/tickets/:id/ownership` and `/priority` (optional `expectedVersion`), `PATCH /api/tickets/:id/status` (Requester reopen increments `version`), `GET /api/staff/tickets/:id` (adds `version`, `allowedTransitions`, `openActionsCount`), list endpoints (comma-separated `status`).
- Removed: `GET /api/requesters` and the `X-Dev-Requester-Id` fallback.

---

## 10. Acceptance Criteria (AC)

### Actions Taken
- **AC-01 (Create Action):** Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated creator as Performed By and the approved assignee.
- **AC-02 (Follow-up Note):** Given Follow-Up Required is true and the note is empty, when the action is saved, then the request is rejected with a field-level error and nothing is stored.
- **AC-03 (Assignee Validation):** Given an inactive user, a Requester, or an unknown id as assignee, when the action is created or assigned, then the request is rejected and the action is not saved or changed.
- **AC-04 (Requester Read-only):** Given an authenticated Requester, when they call any create, edit, assign, complete, or cancel action endpoint directly, then the backend rejects it with `403` and changes nothing; the Requester UI shows no such controls.
- **AC-05 (Requester Ownership of Actions):** Given Requester B, when the actions of Requester A's Ticket are requested, then the response is `404` and no action data is returned.
- **AC-06 (Owner Coordinates, Others Act):** Given a Ticket owned by IT Staff A, when IT Staff B records an action, then the action is saved with B as Performed By, and the Ticket shows several actions by different staff.
- **AC-07 (Action Lifecycle):** Given an `OPEN` action, when it is completed with a Result it becomes `COMPLETED`; completing without a Result is rejected; completed or cancelled actions cannot be edited or reassigned (`409`).

### Ticket Workflow
- **AC-08 (Transition Matrix):** Given any Ticket status and role, when a transition is requested, then only the transitions in section 6.2 succeed and every other one returns `409 ILLEGAL_STATUS_TRANSITION`.
- **AC-09 (Resolution Gate):** Given a Ticket with an `OPEN` action or without a Resolution Summary, when `RESOLVED` is requested, including by calling the API directly, then the request is rejected with `409 RESOLUTION_GATE_FAILED`; once the conditions are met the same request succeeds.
- **AC-10 (Requester Cannot Resolve):** Given a Requester, when they try to set `RESOLVED` or `CLOSED`, or indicate that the problem appears resolved, then the Ticket status does not change.
- **AC-11 (Stale Update):** Given two users who loaded the same Ticket version, when the first changes the status and the second then submits a change with the old `expectedVersion`, then the second receives `409 STALE_UPDATE` and the first change is preserved.
- **AC-12 (Allowed Transitions in UI):** Given a Ticket detail, when the status control is shown, then it lists only the transitions returned by the backend and refreshes the Ticket summary after a successful change.

### Dashboards
- **AC-13 (Requester Dashboard Scope):** Given an authenticated Requester, when dashboard data is retrieved, then only metrics and Tickets owned by that Requester are returned.
- **AC-14 (Staff Dashboard Accuracy):** Given the seed data, when the IT Staff Dashboard is retrieved, then each metric equals the result of the defined database query.
- **AC-15 (Empty Dashboards):** Given a user with no matching Tickets or actions, when dashboards are shown, then counts are `0`, lists are empty, and an empty state (not an error) is displayed.
- **AC-16 (Drill-down):** Given a dashboard card or recent row, when the user activates it, then the matching Ticket Queue or My Tickets list (or Ticket Detail) opens with a result count equal to the card value.
- **AC-17 (Dashboard Authorization):** Given an unauthenticated caller or a role that is not permitted, when a dashboard endpoint is called, then the backend returns `401` or `403` and no metrics.

### Data, Security, and Hardening
- **AC-18 (Migration Preserves Data):** Given a database populated by Labs 1 to 3, when the Lab 4 migration is applied, then all existing records and counts are unchanged and legacy Tickets list zero actions without error.
- **AC-19 (Idempotent Seed):** Given the seed is run twice, when row counts are compared, then they are identical, and the seed data covers every status, zero/one/many actions, and zero and non-zero dashboard values.
- **AC-20 (Identity from Token Only):** Given a request that has only an `X-Dev-Requester-Id` header and no valid token, when any protected endpoint is called, then the response is `401`.
- **AC-21 (Temporary UI Removed):** Given the final application, when the client is inspected, then no Development Requester selector, Change Requester action, or `/api/requesters` call exists.
- **AC-22 (Duplicate Submission Safety):** Given a double click or retry on a create/update action, when it is submitted, then exactly one record is created or one change applied.
- **AC-23 (Consistent Feedback States):** Given any Lab 4 screen, when data is loading, empty, invalid, forbidden, not found, conflicting, or unavailable, then clear feedback is shown and entered form data is preserved after recoverable failures.
- **AC-24 (Responsive and Accessible):** Given desktop, tablet, and mobile viewports, when Lab 4 screens are used, then there is no clipping, overlap, or horizontal page scroll, all controls are keyboard operable with visible focus, and status is not conveyed by color alone.
- **AC-25 (Lab 1 to 3 Regression):** Given the final application, when the Lab 1 to Lab 3 test suites and representative E2E flows run, then they pass.
- **AC-26 (Dashboard Performance Smoke):** Given the seed data, when dashboard endpoints are called, then each responds within 1000 ms on the development machine.

---

## 11. Definition of Done (DoD)

1. [ ] `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md` exist in `docs/lab-04/` and are complete and mutually consistent. (All exist; the `reviewer.md` rows for the last Issue and the release Pull Request are still to be filled after review.)
2. [x] The specification existed in `lab4-staging` before the implementation PRs were merged (PR #63 was merged before PR #64 to #69).
3. [x] The Prisma migration is additive, tested on a populated database without data loss, with a documented and tested rollback; the seed is idempotent (`tests.md` 6.1, 6.4).
4. [x] Actions Taken (API and UI), the transition matrix, resolution gate, and stale-update protection are implemented and enforced by the backend.
5. [x] Requester and IT Staff dashboards are implemented with backend-calculated metrics, drill-down, and empty/forbidden/failure states.
6. [x] The `X-Dev-Requester-Id` fallback, Development Requester selector, and `/api/requesters` are removed.
7. [ ] Every Acceptance Criterion maps to at least one automated test in `tests.md` (done); all suites pass with none skipped (server 139, client 71, Playwright 29 on the feature branch). Still to do: run the same commands on the final `main` branch. E2E-07 is covered at UI level only (`tests.md` section 7).
8. [ ] Screenshots at desktop, tablet, and mobile sizes exist under `artifacts/lab-04/screenshots/` (done, 57 files); the visual and accessibility checklist is complete except keyboard focus visibility, focus trapping in dialogs, and the 44 px touch target (`ui-spec.md` section 11).
9. [ ] No console errors, broken links, placeholder text, or unfinished controls remain; README setup, seed, migration, test, and demo instructions are current (README done; console errors were checked by hand only for the Requester and Administrator screens).
10. [ ] Every feature branch was reviewed by a peer, merged into `lab4-staging`, and `lab4-staging` was merged into `main` through one release Pull Request; all GitHub Issues are in Done. (PRs #63 to #69 are reviewed and merged; the final Issue and the release PR are pending.)

---

## 12. Assumptions and Decisions

1. **(Decision)** Actions have a status (`OPEN`, `COMPLETED`, `CANCELLED`) and an optional assignee, because the sprint evidence requires demonstrating assign, complete, and cancel.
2. **(Decision)** The resolution gate is: no `OPEN` action and a non-empty Resolution Summary. The Lab 3 specification deferred "block resolution while Actions Taken remain incomplete" to this sprint; this is its definition.
3. **(Decision)** Optimistic concurrency uses an integer `version` on Ticket and `409 STALE_UPDATE`.
4. **(Decision)** Dashboards show current values only (no "vs yesterday" trend); "recent" uses a rolling 7-day window and 5-item lists.
5. **(Decision)** A comma-separated `status` filter is added to the two list endpoints so card counts and drill-down lists match exactly.
6. **(Decision)** Only IT Staff or Administrator can cancel Tickets; a Requester cannot cancel.
7. Cancelling an action does not require a reason.
8. The Priority enum values are `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; labels follow the existing badge helper.
9. The Lab 3 migration gap (section 8.5) is resolved as part of the Actions Taken Issue, before the Lab 4 migration is created.
10. Removing the header fallback requires updating Lab 2 and Lab 3 tests that relied on it; their intent is unchanged because Lab 3 already requires authenticated identity.
11. **(Decision)** `requireAuth` answers `401 INVALID_TOKEN` only when the token is invalid or expired; a database error returns `500 INTERNAL_ERROR`, so a temporary database problem no longer logs the user out. An optional `DB_POOL_MAX` limits the connection pool (needed for the local `prisma dev` database).
12. **(Decision)** The Ticket Queue and My Tickets screens apply only the newest list response, so an older, slower search cannot overwrite a newer result.
13. **(Decision)** Known limitations accepted for this sprint, with reasons in `tests.md` section 7: the Resolution Summary hint wording, `ILLEGAL_STATUS_TRANSITION` answered before `STALE_UPDATE`, attachment endpoints answering 403 to non-owners, and no focus trap in dialogs.
