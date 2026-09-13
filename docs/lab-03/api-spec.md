# REST API Specification

**Project:** TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Sprint:** Sprint 3 (Lab 3)  
**Base URL:** `/api`  

---

## 1. Global Session & Authorization Headers

Lab 3 replaces the simulated `X-Dev-Requester-Id` header with real HTTP session cookies / Authorization Tokens. Every protected API request must include the session credentials:

```http
Cookie: session_token=<jwt_or_session_id>
Content-Type: application/json
```

---

## 2. Standard Response & Error Shapes

### 2.1 Success Response Shape
```json
{
  "success": true,
  "data": { ... }
}
```

### 2.2 Standard Error Response Shape
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_ACCESS",
    "message": "You do not have permission to perform this action",
    "details": []
  }
}
```

---

## 3. Authentication Endpoints

### 3.1 `POST /api/auth/login`
Authenticate user with email and password.

- **Request Body:**
```json
{
  "email": "jennifer.a@toktickit.com",
  "password": "InitialPassword123!"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@toktickit.com",
      "role": "REQUESTER",
      "requiresPasswordChange": true
    }
  }
}
```
- **Error Responses:**
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account is inactive (`isActive = false`).

---

### 3.2 `POST /api/auth/logout`
Invalidate authenticated session.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### 3.3 `GET /api/auth/me`
Retrieve currently authenticated user profile.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@toktickit.com",
      "role": "REQUESTER",
      "requiresPasswordChange": false
    }
  }
}
```
- **Error Response `401 Unauthorized`:** Session expired or missing.

---

### 3.4 `POST /api/auth/change-password`
Mandatory first-login password change.

- **Request Body:**
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "SecureNewPassword123!",
  "confirmPassword": "SecureNewPassword123!"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (passwords do not match or weak password).
  - `401 Unauthorized`: Incorrect current password.

---

## 4. Requester Ticket & Comment Endpoints

### 4.1 `GET /api/tickets` (Requester Scope)
Retrieve tickets belonging to the authenticated Requester.

- **Query Parameters:** `page`, `limit`, `search`, `category`, `priority`, `status`
- **Response `200 OK`:** Return paginated list of tickets owned by logged-in user.

---

### 4.2 `POST /api/tickets/:id/comments` (Public Comment)
Add a Public Comment to a ticket.

- **Permitted Roles:** `REQUESTER` (Owner only), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
```json
{
  "content": "Thank you for the update. Please let me know if you need additional logs."
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "ticketId": 1,
    "authorId": 1,
    "authorName": "Jennifer Anderson",
    "authorRole": "REQUESTER",
    "content": "Thank you for the update...",
    "createdAt": "2026-09-12T10:30:00Z"
  }
}
```

---

### 4.3 `PATCH /api/tickets/:id/indicate-resolved`
Requester indicates problem appears resolved.

- **Permitted Roles:** `REQUESTER` (Owner only)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "ticketId": 1,
    "requesterIndicatedResolved": true
  }
}
```

---

## 5. IT Staff Queue & Operations Endpoints

### 5.1 `GET /api/staff/tickets` (Ticket Queue)
Retrieve shared Ticket Queue with search, filters, sorting, and pagination.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters:**
  - `search` (string): Partial match against Ticket Number or Summary
  - `status` (string): Filter by status (`NEW`, `OPEN`, `IN_PROGRESS`, etc.)
  - `priority` (string): Filter by `itPriority`
  - `ownerId` (integer | "unassigned"): Filter by owner
  - `page` (default 1), `limit` (default 10)
  - `sortBy` (default `createdAt`), `sortOrder` (`asc` | `desc`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": 1,
        "ticketNumber": "TKT-2026-001234",
        "createdAt": "2026-05-12T09:14:00Z",
        "summary": "Laptop battery drains quickly",
        "category": "Hardware",
        "requestedPriority": "Medium",
        "itPriority": "Medium",
        "currentStatus": "IN_PROGRESS",
        "owner": { "id": 5, "name": "Michael Brown" }
      }
    ],
    "pagination": { "total": 87, "page": 1, "totalPages": 9, "limit": 10 }
  }
}
```

---

### 5.2 `PATCH /api/staff/tickets/:id/ownership`
Claim or reassign ticket ownership.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
```json
{
  "ownerId": 5
}
```
- **Response `200 OK`:** Returns updated ticket with new owner details.

---

### 5.3 `PATCH /api/staff/tickets/:id/priority`
Update IT Priority.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
```json
{
  "itPriority": "High"
}
```
- **Response `200 OK`:** Returns updated ticket with new IT Priority.

---

### 5.4 `PATCH /api/staff/tickets/:id/status`
Update Ticket Lifecycle Status.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced laptop battery under warranty."
}
```
- **Response `200 OK`:** Returns updated ticket status.

---

### 5.5 `POST /api/staff/tickets/:id/internal-notes`
Create a role-restricted Internal Note.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
```json
{
  "content": "Hardware diagnostic confirmed battery cell failure. Part ordered."
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 501,
    "ticketId": 1,
    "authorId": 5,
    "authorName": "Michael Brown",
    "authorRole": "IT_STAFF",
    "content": "Hardware diagnostic confirmed...",
    "createdAt": "2026-05-12T10:15:00Z"
  }
}
```
- **Error Response `403 Forbidden`:** If requested by a Requester account.

---

### 5.6 `GET /api/staff/tickets/:id/internal-notes`
Retrieve Internal Notes for a ticket.

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Response `200 OK`:** Returns list of Internal Notes.
- **Error Response `403 Forbidden`:** If requested by a Requester account (strictly blocked without leaking note content).

---

## 6. Administrator User Management Endpoints

### 6.1 `GET /api/admin/users`
List user accounts with search and filter.

- **Permitted Roles:** `ADMINISTRATOR`
- **Query Parameters:** `search` (name or email), `role` (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@toktickit.com",
      "role": "REQUESTER",
      "isActive": true,
      "requiresPasswordChange": false
    }
  ]
}
```

---

### 6.2 `POST /api/admin/users`
Create a new user account.

- **Permitted Roles:** `ADMINISTRATOR`
- **Request Body:**
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
- **Response `201 Created`:** User created with `requiresPasswordChange = true`.
- **Error Response `400 Bad Request`:** Duplicate email address or invalid payload.

---

### 6.3 `PATCH /api/admin/users/:id`
Update basic user account details and activation state.

- **Permitted Roles:** `ADMINISTRATOR`
- **Request Body:**
```json
{
  "name": "Alex Thompson Updated",
  "email": "alex.t@toktickit.com",
  "role": "IT_STAFF",
  "isActive": false
}
```
- **Response `200 OK`:** Updated user object.
- **Error Response `400 Bad Request`:** Self-deactivation attempt or deactivating last active Administrator.

---

### 6.4 `POST /api/admin/users/:id/reset-password`
Issue a new initial password for a user.

- **Permitted Roles:** `ADMINISTRATOR`
- **Request Body:**
```json
{
  "newInitialPassword": "NewTempPassword123!"
}
```
- **Response `200 OK`:** Password reset; sets `requiresPasswordChange = true`.
