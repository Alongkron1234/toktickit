# Lab 2 Sprint Engineering Specification
**Project:** TokTickIT Requester Ticketing MVP with UI Foundation  
**Sprint:** Sprint 2 (Lab 2)  
**Author:** CPE334 Engineering Team  

---

## 1. Sprint Goal
Deliver a professional, responsive, and robust Requester-facing IT ticketing application with simulated multi-user identity switching, automated ticket number generation, paginated ticket listing with search/filtering, read-only ticket detail inspection, and secure attachment lifecycle management with soft removal, built strictly according to the Zen Green visual design system and verified by comprehensive automated tests.

---

## 2. Stakeholder Request Interpretation
The IT department requires a complete end-user experience for submitting and managing IT support tickets. Requesters must be able to describe IT problems, select categories and affected systems, specify requested priority, attach supporting files, and receive a unique official Ticket Number upon submission. Requesters must also be able to review their submitted tickets in "My Tickets" with search, filter, sort, and pagination capabilities, inspect detailed ticket views, add permitted attachments, and soft-remove their own attachments with a documented reason. 

Because full authentication will be introduced in Sprint 3 (Lab 3), Sprint 2 provides a temporary "Development Requester Selector" to simulate user identity context for testing multi-user ownership and data isolation.

---

## 3. Scope

### Included
- **Development Requester Selection:** Simulated identity selector displaying active Requesters loaded from PostgreSQL, with identity context switching and header identity display.
- **Create Ticket Workflow:** Ticket creation form with system-generated ticket number (`TKT-YYYY-XXXXXX`), initial status `NEW`, real-time validation, duplicate submission prevention, and error state form preservation.
- **My Tickets Workflow:** Requester-owned paginated ticket list supporting case-insensitive search, multi-criteria filtering (Category, Priority, Status), sorting, clear filters, and responsive views (Desktop table, Mobile cards).
- **Requester Ticket Detail Workflow:** Read-only ticket inspection enforcing strict ownership boundaries (`X-Dev-Requester-Id`).
- **Attachment Lifecycle:** Uploading permitted attachments (JPG, PNG, WEBP, PDF up to 5MB, max 5 active attachments per ticket), active attachment downloads, and soft-removal with a mandatory removal reason.
- **Zen Green Design System & Responsiveness:** Consistent UI design tokens, component states, and responsive layouts across Desktop (≥992px), Tablet (768–991px), and Mobile (<768px).
- **Automated Testing & Documentation:** Full test suite (Unit, API, UI, E2E) mapped to Acceptance Criteria, accompanied by Spec DD and Test DD artifacts.

### Excluded
- Real authentication, passwords, JWT tokens, user sessions, login/logout mechanisms (Deferred to Lab 3).
- IT Staff workflow, IT priority modification, ticket claiming or reassignment (Deferred to Lab 3).
- Ticket collaboration, public comments, internal notes, actions taken (Deferred to Lab 3).
- Ticket lifecycle status changes beyond the initial `NEW` status (Resolving, Closing, Reopening, Cancelling).
- Administrative functions for managing users, categories, or reference data.

---

## 4. Functional Requirements (FR)

- **FR-01 (Development Requester Selection):** The system shall allow selecting an active Development Requester from PostgreSQL to simulate user login context for testing.
- **FR-02 (Identity Context Management):** The system shall display the selected Requester identity in the application shell header and allow changing identity, instantly updating the data context across all screens.
- **FR-03 (Unselected Identity Guard):** The system shall block access to ticketing screens when no Requester is selected, automatically redirecting the user to the Requester Selection screen.
- **FR-04 (Create Ticket Form):** The system shall provide a form for Requesters to submit IT support tickets specifying Category, Related System, Summary, Requested Priority, Description, and Attachments.
- **FR-05 (Automatic Ticket Numbering):** The system shall automatically generate a unique, read-only official Ticket Number (`TKT-YYYY-XXXXXX`) upon ticket creation.
- **FR-06 (Form Field Validation & Inline Feedback):** The system shall validate required fields, string length constraints, and attachment rules, displaying field-level inline error messages.
- **FR-07 (My Tickets Ownership Scope):** The system shall display a list of tickets belonging strictly to the currently selected Requester ID (`X-Dev-Requester-Id`).
- **FR-08 (Search, Filter, Sort & Pagination):** The system shall support searching by Ticket Number/Summary, filtering by Category/Priority/Status, sorting by creation date, and paginating ticket lists.
- **FR-09 (UI States Presentation):** The system shall render distinct visual states for Loading, Empty List (user has no tickets), and No-Results (search/filters return 0 items) with a Clear Filters action.
- **FR-10 (Read-Only Ticket Detail View):** The system shall display detailed information of an owned ticket in a read-only layout while rejecting unauthorized access from other Requesters.
- **FR-11 (Attachment Upload & Download):** The system shall support uploading permitted files (JPG, PNG, WEBP, PDF up to 5MB, max 5 active files per ticket) and downloading active attachments.
- **FR-12 (Attachment Soft Removal & History):** The system shall support soft-removing an attachment with a mandatory removal reason, retaining metadata while permanently blocking file downloads.

---

## 5. Business Rules (BR)

### System-Generated Values & Defaults
- **BR-01 (Ticket Number Generation):** The official Ticket Number is generated by the backend upon successful creation using the format `TKT-YYYY-XXXXXX` (e.g., `TKT-2026-000001`). It is unique and read-only.
- **BR-02 (Initial Ticket Status):** All newly created tickets automatically begin with `currentStatus = NEW`.
- **BR-03 (Server Timestamps):** Creation (`createdAt`) and update (`updatedAt`) timestamps are generated automatically by the server and cannot be overridden by the client.

### Development Requester Context
- **BR-04 (Testing Identity Context):** Lab 2 uses a Development Requester selector instead of real authentication. The selected identity provides the testing context for creating and managing tickets.
- **BR-05 (Active Requester Filter):** Dropdowns must only display Requesters with `isActive = true`. Inactive Requesters must be excluded from selection.
- **BR-06 (Context Switching & Reset):** Switching the selected Requester resets client state and immediately reloads ticket lists and ownership contexts for the new user.
- **BR-07 (Unselected Identity Protection):** If no Requester is selected, access to Create Ticket, My Tickets, and Ticket Detail screens must be restricted, redirecting to the Requester Selection screen.

### Ownership & Data Isolation
- **BR-08 (Ticket Ownership Binding):** Every created ticket is permanently bound to the `requesterId` of the currently selected Requester.
- **BR-09 (Requester Data Isolation):** A Requester can only search, view, and open tickets that belong to their own `requesterId`.
- **BR-10 (Unauthorized Access Prevention):** Direct access attempts to a Ticket Detail or Attachment belonging to a different Requester must be rejected by the backend with HTTP `403 Forbidden` or `404 Not Found`.

### Form Validation & Safety
- **BR-11 (Input Trimming & Required Fields):** `Category`, `Related System`, `Requested Priority`, `Summary`, and `Description` are required. `Summary` and `Description` must be trimmed of leading and trailing whitespace before validation.
- **BR-12 (Length Constraints):**
  - `Summary`: Required, trimmed length between 5 and 150 characters.
  - `Description`: Required, trimmed length between 10 and 2,000 characters.
- **BR-13 (Duplicate Submission Prevention):** During ticket submission, the Submit button must enter a busy state and be disabled to prevent duplicate submissions.
- **BR-14 (Form Data Retention on Error):** If ticket submission fails due to server or network errors, user-entered values in the form fields and valid attachments must be preserved.

### Search, Filter, Sort & Pagination
- **BR-15 (Case-Insensitive Search):** Search matches partial case-insensitive text against `ticketNumber` or `summary`.
- **BR-16 (Multi-Criteria Filtering):** Filtering supports exact match by `Category`, `Requested Priority`, `IT Priority`, and `Current Status`. Multiple filters combine with `AND` logic.
- **BR-17 (Default Sorting Order):** Default sorting for ticket lists is by `createdAt` descending (newest first).
- **BR-18 (Paginated List Retrieval):** Ticket lists must be paginated with a default page size of 10 (selectable 5, 10, 20). Out-of-bound page requests return an empty dataset with valid pagination metadata.

### Attachment Lifecycle & Soft Removal
- **BR-19 (Allowed File Types & Size):** Attachments must be of MIME types `image/jpeg`, `image/png`, `image/webp`, or `application/pdf`, with a maximum size of 5 MB per file.
- **BR-20 (Active Attachment Limit):** A ticket can have at most 5 active (non-removed) attachments.
- **BR-21 (Soft Removal Protocol):** Attachment removal is implemented as a soft removal (`isRemoved = true`, recording `removedAt` and `removalReason`). Rows are never deleted from the database.
- **BR-22 (Removed File Access Restriction):** Soft-removed attachments remain visible as historical metadata (showing file name and removal reason), but download and preview links are permanently disabled.
- **BR-23 (Attachment Ownership Permission):** Only the owner of the ticket has permission to upload or soft-remove attachments on that ticket.
- **BR-24 (Attachment Failure Isolation):** If ticket creation succeeds but attachment upload fails, the ticket remains saved and valid, and the user is notified allowing retry on the Ticket Detail screen.

### UI States & Extensibility
- **BR-25 (Empty vs No-Results States):** If a Requester has no tickets, display the Empty State with a "Create Ticket" action. If filters return 0 items, display the No-Results State with a "Clear Filters" action.
- **BR-26 (Lab 3 Authentication Extensibility):** Identity context handling must be decoupled to allow seamless transition to real JWT/session authentication in Lab 3 without changing core business logic or database schemas.

---

## 6. UI Specification Summary
The application adheres strictly to the **Zen Green Design System**:
- **Primary Color:** `#006B3C` (Application Header, Primary buttons, strong emphasis)
- **Secondary Color:** `#0B7A46` (Active tabs, focus accents, hover states)
- **Pale Color:** `#EAF6EF` (Selected items, success callouts, subtle section shading)
- **Background Color:** `#F5F7F6` (Quiet near-white body background)
- **Card Surface:** `#FFFFFF` (White with subtle border and restrained shadow)
- **Text Color:** Dark charcoal-green for optimal readability.
- **Form Controls:** Labels positioned above inputs, required fields marked with a red asterisk (`*`), inline validation errors displayed in dark red immediately below fields.
- **Responsiveness:**
  - Desktop (≥992px): Multi-column centered layout.
  - Tablet (768–991px): Two-column responsive layout.
  - Mobile (<768px): Single-column stacked layout without horizontal scrolling.

*(See full details in `docs/lab-02/ui-spec.md`)*

---

## 7. Data Changes (Data Model & Schema)

### Models & Entities
1. **`DevelopmentRequester`**
   - `id`: Int (PK, Autoincrement)
   - `name`: String
   - `email`: String (Unique)
   - `isActive`: Boolean (Default: true)
   - `createdAt`, `updatedAt`: DateTime
2. **`Category`**
   - `id`: Int (PK, Autoincrement)
   - `name`: String (Unique)
   - `isActive`: Boolean (Default: true)
   - `createdAt`: DateTime
3. **`RelatedSystem`**
   - `id`: Int (PK, Autoincrement)
   - `name`: String (Unique)
   - `isActive`: Boolean (Default: true)
   - `createdAt`: DateTime
4. **`Ticket`**
   - `id`: Int (PK, Autoincrement)
   - `ticketNumber`: String (Unique, Indexed)
   - `requesterId`: Int (FK -> DevelopmentRequester.id)
   - `categoryId`: Int (FK -> Category.id)
   - `relatedSystemId`: Int (FK -> RelatedSystem.id)
   - `summary`: String
   - `description`: String
   - `requestedPriority`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - `itPriority`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) (Default: `MEDIUM`)
   - `currentStatus`: Enum (`NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) (Default: `NEW`)
   - `createdAt`, `updatedAt`: DateTime
5. **`Attachment`**
   - `id`: Int (PK, Autoincrement)
   - `ticketId`: Int (FK -> Ticket.id)
   - `originalName`: String
   - `storedName`: String (Unique UUID)
   - `mimeType`: String
   - `fileSize`: Int
   - `isRemoved`: Boolean (Default: false)
   - `removalReason`: String (Nullable)
   - `removedAt`: DateTime (Nullable)
   - `createdAt`: DateTime

### Database Indexes
- `Ticket(requesterId, createdAt)` - Fast ticket listing by requester.
- `Ticket(ticketNumber)` - Unique lookup by Ticket Number.
- `Attachment(ticketId, isRemoved)` - Efficient active attachment retrieval.

---

## 8. API Contract Summary

Base URL: `/api`  
Identity Header: `X-Dev-Requester-Id: <requester_id>`

| Endpoint | Method | Purpose | Key Parameters / Body | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `/api/requesters` | `GET` | Retrieve active Requesters | None | 200 |
| `/api/categories` | `GET` | Retrieve active Categories | None | 200 |
| `/api/related-systems` | `GET` | Retrieve active Systems | None | 200 |
| `/api/tickets` | `POST` | Create a new Ticket | `categoryId`, `relatedSystemId`, `summary`, `requestedPriority`, `description` | 201, 400, 403 |
| `/api/tickets` | `GET` | List owned tickets | `search`, `categoryId`, `requestedPriority`, `currentStatus`, `sortBy`, `page`, `pageSize` | 200, 403 |
| `/api/tickets/:id` | `GET` | Get Ticket Detail | Ticket ID or Ticket Number | 200, 403, 404 |
| `/api/tickets/:id/attachments` | `POST` | Upload Attachment | Multipart file (`file`) | 201, 400, 403, 404, 422 |
| `/api/attachments/:id/download` | `GET` | Download Attachment | Attachment ID | 200, 403, 404 |
| `/api/attachments/:id/remove` | `PATCH` | Soft-remove Attachment | `removalReason` | 200, 400, 403, 404 |

*(See complete request/response JSON schemas in `docs/lab-02/api-spec.md`)*

---

## 9. Acceptance Criteria (AC)

- **AC-01:** Given valid form inputs and selected Requester A, when the Requester submits the Create Ticket form, then one ticket is saved in the database with status `NEW` and the official Ticket Number is displayed in a success confirmation banner.
- **AC-02:** Given missing required fields or invalid summary length (<5 chars), when the Requester submits the form, then submission is blocked and field-level inline error messages are displayed below affected fields.
- **AC-03:** Given a valid ticket creation request, when the user clicks Submit, then the Submit button enters a busy state and is disabled until the request completes.
- **AC-04:** Given the backend API is unreachable or returns a 500 error, when the user submits a ticket form, then a safe error message is displayed and the user's entered form data is preserved.
- **AC-05:** Given no Development Requester is selected, when the user attempts to navigate to My Tickets or Create Ticket, then the system redirects the user to the Requester Selection screen.
- **AC-06:** Given 4 active and 1 inactive Requesters in DB, when the user opens the Requester Selection dropdown, then only the 4 active Requesters are shown.
- **AC-07:** Given Requester A is selected and viewing My Tickets, when the user switches to Requester B, then Requester A's tickets disappear and Requester B's ticket list is loaded.
- **AC-08:** Given Requester A has 3 tickets and Requester B has 2 tickets, when Requester A views My Tickets, then exactly 3 tickets belonging to Requester A are returned.
- **AC-09:** Given tickets with summary "Laptop battery issue" and "VPN connection", when the user searches "laptop", then only the "Laptop battery issue" ticket is displayed.
- **AC-10:** Given tickets across multiple categories and priorities, when the user filters by Category "Hardware" and Priority "HIGH", then only tickets matching both criteria are displayed.
- **AC-11:** Given filter dropdowns set to "Hardware" yielding 0 results, when the user clicks "Clear Filters", then all filter dropdowns reset to default and the full ticket list is displayed.
- **AC-12:** Given a Requester with 15 tickets, when viewing My Tickets with page size 10, then 10 tickets are shown on page 1 and 5 tickets are shown on page 2.
- **AC-13:** Given a newly seeded Requester with 0 tickets, when opening My Tickets, then an Empty State illustration with a "Create Ticket" action button is displayed.
- **AC-14:** Given Requester B attempts to open the Ticket Detail URL of Ticket #101 belonging to Requester A, then access is denied with HTTP 403 Forbidden / 404 Not Found.
- **AC-15:** Given a valid PDF file under 5MB and a ticket with 0 attachments, when the owner uploads the file, then the file is saved and listed under active attachments.
- **AC-16:** Given an executable file (.exe) or a 10MB JPG file, when the user attempts to upload it, then the upload is rejected with a clear error message.
- **AC-17:** Given an active attachment on Ticket #101, when the owner submits a soft removal with reason "Uploaded outdated document", then `isRemoved` is set to true, the removal reason is stored, and the download link is permanently disabled.
- **AC-18:** Given an attachment that has been soft-removed, when any user attempts to trigger its download URL directly, then the request returns HTTP 404 Not Found / 403 Forbidden.

---

## 10. Definition of Done (DoD)

### Part 1: Product Completion
- [ ] All functional requirements (FR-01 to FR-12) and business rules (BR-01 to BR-26) are fully implemented.
- [ ] All 18 Acceptance Criteria (AC-01 to AC-18) pass with automated test evidence.
- [ ] Automated tests cover Unit, API, UI Component, and E2E scenarios without skipped or flaky tests.
- [ ] Zen Green design system guidelines, color tokens, typography, and responsive layouts are visually verified.
- [ ] Data model migrations and idempotent seed scripts run cleanly on PostgreSQL.
- [ ] README setup, environment variables, and execution commands are up to date.

### Part 2: Course Delivery Requirements
- [ ] Feature branches developed off `lab2-staging` and integrated via peer-reviewed Pull Requests.
- [ ] `docs/lab-02/reviewer.md` complete with reviewer identity, PR links, comments, and approvals.
- [ ] `docs/lab-02/ai-use.md` complete with prompt log table and reflection.
- [ ] Release PR merged from `lab2-staging` to `main` with 100% passing tests on `main`.
- [ ] PDF submission compiled in exact 9-part structure (Answer Part 1 to Part 9).

---

## 11. Assumptions and Decisions

1. **Identity Context Mechanism:** Since authentication is out of scope for Sprint 2, the client passes `X-Dev-Requester-Id` in HTTP headers to simulate authenticated user context.
2. **Ticket Number Format:** Generated as `TKT-YYYY-XXXXXX` where `YYYY` is current year and `XXXXXX` is a zero-padded auto-incrementing number per year.
3. **File Storage Strategy:** Uploaded attachment files are stored on local server disk under `uploads/lab-02/` using a UUID filename to prevent collisions, while storing original filenames and MIME types in PostgreSQL.
4. **Soft Removal Data Model:** Attachments are soft-removed by setting `isRemoved = true` and recording `removedAt` and `removalReason`. Rows are never deleted to preserve audit trails.
