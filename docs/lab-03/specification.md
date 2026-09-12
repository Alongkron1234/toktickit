# Lab 3 Sprint Engineering Specification

**Project:** TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Sprint:** Sprint 3 (Lab 3)  
**Author:** CPE334 Engineering Team  

---

## 1. Sprint Goal
Deliver an enterprise-grade multi-role IT ticketing platform replacing the simulated Development Requester selector with secure authentication, mandatory first-login password changes, server-side role-based access control (Requester, IT Staff, Administrator), an operational IT Staff Ticket Queue with lifecycle management, Public Comments, role-restricted Internal Notes, and a minimalist Administrator User Management interface, verified by automated unit, API, UI, security, and E2E tests.

---

## 2. Stakeholder Request Interpretation
The system must transition from simulated identity selection to real user accounts, credentials, and role-based access control. The application must support three distinct operational roles:
1. **Requester:** Authenticated users who submit, view, and manage their own tickets, post Public Comments, and indicate when reported problems appear resolved.
2. **IT Staff:** Operational staff who manage work via a shared IT Staff Ticket Queue (with search, filtering, sorting, and pagination), claim or reassign ticket ownership, adjust IT Priority, advance ticket lifecycle status, write Public Comments, and record confidential Internal Notes.
3. **Administrator:** System administrators who manage user accounts (viewing user lists, creating accounts with single role assignment, updating basic account details, toggling active/inactive status, and issuing initial passwords that require mandatory first-login change).

Every screen and REST API endpoint must strictly enforce authentication, role permissions, and ownership on the backend. Client-side control hiding is used strictly for UX convenience and never as a security boundary.

---

## 3. Scope

### Included
- **Authentication & Password Change:** Secure email/password login, active-state enforcement, logout session destruction, current-user payload retrieval, and mandatory first-login password change.
- **Role-Based Authorization:** Server-side role validation for `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR` across all REST endpoints and application navigation destinations.
- **Requester Continuation & Ownership Isolation:** Continued support for all Lab 2 Requester functions bound to authenticated identity, plus Public Comments posting and "Problem Appears Resolved" indication.
- **IT Staff Ticket Queue:** Paginated ticket queue featuring keyword search (Ticket Number, Summary), multi-criteria filters (Status, Priority, Ownership), column sorting, and responsive presentation.
- **IT Staff Ticket Detail & Workflow:** Ticket ownership claiming/reassignment, IT Priority management, permitted status transitions (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), Public Comments, and role-restricted Internal Notes.
- **Minimalist Administrator User Management:** User list retrieval with name/email search and role filter, user creation (with initial password), user edit (name, email, role, active state), initial password resetting, and enforced safety rules (no self-deactivation, no deactivation of the last active Admin, no user deletion).
- **Data Migration & Seed Data:** Schema evolution from Lab 2 to Lab 3 PostgreSQL/Prisma model, data migration preserving Lab 2 tickets/attachments, and idempotent seed scripts providing test accounts across all roles.
- **Zen Green Design System Extensions:** Unified badges for roles, status, and priorities, visually distinct Public Comments vs. Internal Notes, and responsive layouts across Desktop, Tablet, and Mobile viewports.

### Excluded
- Email delivery services (SMTP, password reset emails, activation links, MFA, OAuth/SSO).
- Self-registration of user accounts (accounts created exclusively by Administrators).
- Multiple roles per user (each user possesses exactly one active role).
- User deletion, bulk user operations, import/export, or historical audit logs.
- IT Staff "Actions Taken" sub-workflow (Deferred to Lab 4).
- SLA calculation, escalation rules, and complex KPI analytics dashboards.

---

## 4. Functional Requirements (FR)

- **FR-01 (User Authentication):** The system shall authenticate users using email address and password, validating active account status before granting session access.
- **FR-02 (Mandatory First-Login Password Change):** The system shall detect users with initial passwords (`requiresPasswordChange = true`) and restrict application access until a valid new password is saved.
- **FR-03 (Session Logout & Identity Retrieval):** The system shall allow authenticated users to retrieve their profile identity and destroy their session upon logging out.
- **FR-04 (Server-Side Role-Based Authorization):** The system shall enforce role-based access control on every protected REST API endpoint according to the defined Authorization Matrix.
- **FR-05 (Authenticated Requester Ownership):** The system shall automatically bind ticket submission, retrieval, and attachment operations to the authenticated user ID, rejecting client-supplied requester ID overrides.
- **FR-06 (Requester Resolution Indication):** The system shall allow Requesters to indicate that a reported problem appears resolved without permitting direct status changes to `RESOLVED` or `CLOSED`.
- **FR-07 (Public Comments Lifecycle):** The system shall support posting and viewing append-only Public Comments on tickets for Requesters, IT Staff, and Administrators.
- **FR-08 (IT Staff Ticket Queue Retrieval):** The system shall provide IT Staff and Administrators with a paginated ticket queue supporting keyword search, multi-criteria filtering, and sorting.
- **FR-09 (Ticket Ownership Claim & Reassignment):** The system shall allow IT Staff to claim unassigned tickets or reassign ticket ownership to active IT Staff or Administrator accounts.
- **FR-10 (IT Priority Management):** The system shall allow IT Staff and Administrators to update the IT Priority of a ticket while preserving the original Requested Priority.
- **FR-11 (Ticket Status Transitions):** The system shall enforce permitted lifecycle status transitions (`NEW` → `OPEN` → `IN_PROGRESS` → `WAITING_FOR_REQUESTER` → `RESOLVED` → `CLOSED` / `REOPENED` / `CANCELLED`).
- **FR-12 (Role-Restricted Internal Notes):** The system shall allow IT Staff and Administrators to append and view confidential Internal Notes on tickets, ensuring these notes are strictly hidden from Requesters.
- **FR-13 (Admin User Listing & Search):** The system shall allow Administrators to view user accounts with real-time keyword search (name/email) and role filtering.
- **FR-14 (Admin User Creation):** The system shall allow Administrators to create new user accounts with a name, unique email address, single permitted role, activation state, and initial password.
- **FR-15 (Admin User Edit & Password Reset):** The system shall allow Administrators to update user profiles (name, email, role, active state) and issue new initial passwords requiring change on next login.
- **FR-16 (Administrator Safety Guards):** The system shall prevent Administrators from deactivating their own account or deactivating the last remaining active Administrator in the system.

---

## 5. Business Rules (BR)

### Authentication & Account State
- **BR-01 (Active Account Authentication):** Only users with valid credentials and `isActive = true` may authenticate. Inactive users receive a safe authentication error.
- **BR-02 (Initial Password Boundary):** Users flagged with `requiresPasswordChange = true` cannot access normal application routes until a valid password meeting complexity rules is saved.
- **BR-03 (Password Security):** Passwords must be hashed using a secure algorithm (e.g., bcrypt) before storage. Plaintext passwords must never be stored or logged.

### Role & Ownership Boundaries
- **BR-04 (Role Assignment Limit):** Every user account is assigned exactly one primary role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`).
- **BR-05 (Requester Data Boundary):** Requesters can only access, view, and comment on tickets where `requesterId` matches their authenticated user ID.
- **BR-06 (IT Staff Queue Access):** IT Staff and Administrators can view all tickets across all Requesters in the system queue.
- **BR-07 (Ownership Authority):** Primary Ticket Ownership can only be assigned to active `IT_STAFF` or `ADMINISTRATOR` accounts. Unassigned tickets have `ownerId = null`.

### Priority & Workflow Transition Rules
- **BR-08 (Priority Separation):** `requestedPriority` is immutable after ticket creation. `itPriority` initially defaults to `requestedPriority` and can subsequently be updated only by IT Staff or Administrators.
- **BR-09 (Permitted Status Workflow):** Ticket statuses follow strict transition rules. Requesters may only trigger status changes indirectly via "Problem Appears Resolved" (updating status to `RESOLVED` via IT confirmation or designated workflow). IT Staff control formal transitions between `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-10 (Comments vs Internal Notes Isolation):**
  - **Public Comments:** Append-only, author-attributed, visible to Requester, IT Staff, and Administrator.
  - **Internal Notes:** Append-only, author-attributed, strictly visible to IT Staff and Administrator only. API requests from Requesters for Internal Notes return `403 Forbidden` without exposing note metadata.

### Administrator Operations & Safety Rules
- **BR-11 (Email Uniqueness):** User email addresses must be unique across the system (case-insensitive). Duplicate email creation/edit requests must be rejected.
- **BR-12 (No User Deletion):** User accounts cannot be permanently deleted from the database. Account removal is performed exclusively via deactivation (`isActive = false`).
- **BR-13 (Self-Deactivation Guard):** An Administrator cannot deactivate their own active account (`userId !== targetUserId`).
- **BR-14 (Last Administrator Guard):** The system must block any deactivation or role change operation that would leave the system with zero active `ADMINISTRATOR` accounts.
- **BR-15 (Password Reset Flag):** When an Administrator sets a new initial password for a user, `requiresPasswordChange` must be set to `true`.

---

## 6. Required Roles and Authorization Matrix

| Operation / Resource | Requester | IT Staff | Administrator |
| :--- | :---: | :---: | :---: |
| **Authenticate / Change First Password** | ✅ | ✅ | ✅ |
| **Create Ticket / View Owned Tickets** | ✅ | ❌ | ❌ |
| **View All Tickets Queue (Search/Filter/Paginate)** | ❌ | ✅ | ✅ |
| **Claim / Reassign Ticket Ownership** | ❌ | ✅ | ✅ |
| **Update IT Priority** | ❌ | ✅ | ✅ |
| **Update Ticket Lifecycle Status** | ❌ | ✅ | ✅ |
| **Indicate Problem Appears Resolved** | ✅ (Owned) | ❌ | ❌ |
| **Post / View Public Comments** | ✅ (Owned) | ✅ | ✅ |
| **Create / View Internal Notes** | ❌ | ✅ | ✅ |
| **Manage Users (List/Create/Edit/Deactivate/Reset Pass)** | ❌ | ❌ | ✅ |

---

## 7. Acceptance Criteria (AC)

- **AC-01 (Successful Authentication):** Given an active user with valid credentials, when they submit the login form, then the server grants session access and returns the authenticated profile and role.
- **AC-02 (First-Login Password Change Enforcement):** Given a user with `requiresPasswordChange = true`, when login succeeds, then normal application routes remain inaccessible until a valid new password is saved.
- **AC-03 (Requester Ownership Boundary):** Given an authenticated Requester, when accessing ticket endpoints with another user's ticket ID, then the backend rejects the request with `403 Forbidden` or `404 Not Found`.
- **AC-04 (Internal Notes Isolation):** Given a Requester account, when an Internal Notes endpoint is requested, then the request is rejected with `403 Forbidden` without leaking note existence or content.
- **AC-05 (IT Queue Filtering & Search):** Given an IT Staff user, when searching by "printer" and filtering by status "OPEN", then the queue API returns only matching tickets with valid pagination metadata.
- **AC-06 (Ticket Ownership Claim & Reassignment):** Given an IT Staff user, when claiming an unassigned ticket, then the ticket owner is updated to the staff member's ID and reflected in the queue and detail views.
- **AC-07 (Public Comments & Internal Notes Distinction):** Given an IT Staff user on Ticket Detail, when posting a Public Comment and an Internal Note, then both are saved with author attribution and rendered in visually distinct UI containers.
- **AC-08 (Admin User Creation & Validation):** Given an Administrator, when creating a user with valid details, then the account is saved, assigned a single role, and seeded with an initial password. Duplicate emails are rejected.
- **AC-09 (Admin Safety Guards):** Given an Administrator, when attempting to deactivate their own account or the last active Administrator account, then the server blocks the action with a descriptive error.
- **AC-10 (Lab 2 Regression Continuity):** Given existing Lab 2 tickets and attachments, when migrated to Lab 3, then ownership and file retrieval remain fully intact under authenticated user accounts.

---

## 8. Definition of Done (DoD)

1. All Sprint 3 specifications (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `ai-use.md`, `reviewer.md`) exist and are complete.
2. PostgreSQL database schema is evolved via Prisma migrations without data loss from Lab 2.
3. Idempotent seed script populates required test accounts and sample tickets across all roles.
4. Server-side authentication and role-based authorization are fully implemented and verified.
5. Frontend UI screens (Login, Password Change, IT Queue, IT Detail, User Management) are implemented according to Zen Green design guidelines and responsive viewports.
6. All planned Unit, API Integration, UI Component, Security, and E2E Playwright tests pass 100%.
7. Feature branches are reviewed, approved, and merged via PRs into `lab3-staging` and finally `main`.
