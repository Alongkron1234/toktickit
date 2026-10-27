# REST API Specification

**Project:** TokTickIT Actions Taken, Dashboards, and Final Regression  
**Sprint:** Sprint 4 (Lab 4)  
**Base URL:** `/api`  
**Status:** Draft for owner review.

This document extends the Lab 2 and Lab 3 API specifications. Every endpoint defined there continues to work unless changed in section 8.

---

## 1. Authentication and Headers

Every protected request carries the session credentials issued by `POST /api/auth/login`, either as the `session_token` cookie or as `Authorization: Bearer <token>`. Identity and role come only from this credential. The legacy `X-Dev-Requester-Id` header is **not** an authentication mechanism and is ignored; a request with only that header returns `401`.

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## 2. Response Shapes

Success: `{ "success": true, "data": ... }`  
Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [ ... ] } }`

`details` is optional and, for validation errors, lists `{ "field": "...", "message": "..." }` items.

## 3. Status Codes and Error Codes

| Status | Use | Error code examples |
| :--- | :--- | :--- |
| 200 | Successful retrieval or update | |
| 201 | Resource created | |
| 400 | Invalid input | `VALIDATION_ERROR`, `INVALID_ASSIGNEE`, `INVALID_TICKET_ID` |
| 401 | Missing or invalid credentials | `UNAUTHORIZED` |
| 403 | Authenticated but role not permitted | `FORBIDDEN_ACCESS` |
| 404 | Missing resource, or a Requester accessing a Ticket they do not own (masked) | `TICKET_NOT_FOUND`, `ACTION_NOT_FOUND` |
| 409 | State conflict | `ILLEGAL_STATUS_TRANSITION`, `RESOLUTION_GATE_FAILED`, `STALE_UPDATE`, `ACTION_NOT_EDITABLE` |
| 500 | Unexpected server error with a safe message | `INTERNAL_ERROR` |

Unexpected-error messages never include stack traces, SQL, or internal ids.

---

## 4. Actions Taken (IT Staff / Administrator)

All endpoints below require `requireAuth` and role `IT_STAFF` or `ADMINISTRATOR`. `:id` is the Ticket id (a Ticket number is also accepted, as in existing staff endpoints).

### 4.1 Action object

```json
{
  "id": 12,
  "ticketId": 7,
  "actionAt": "2026-10-20T09:30:00.000Z",
  "description": "Replaced the faulty battery",
  "result": "Battery now holds charge",
  "performedBy": { "id": 5, "name": "Alex Thompson", "role": "IT_STAFF" },
  "assignee": { "id": 6, "name": "Sarah Johnson", "role": "IT_STAFF" },
  "followUpRequired": true,
  "followUpNote": "Check battery health again next week",
  "attachmentNotes": "See photo battery-label.jpg in Attachments",
  "status": "COMPLETED",
  "createdAt": "2026-10-20T09:31:00.000Z",
  "updatedAt": "2026-10-20T10:02:00.000Z"
}
```

`assignee` is `null` when unassigned; `result`, `followUpNote`, and `attachmentNotes` are `null` or empty strings when not provided.

### 4.2 `GET /api/staff/tickets/:id/actions`

List all actions of a Ticket, ordered by `actionAt` descending, then `id` descending.

- **Response `200`:** `{ "success": true, "data": { "actions": [ <Action> ] } }` (empty array when none)
- **Errors:** `401`, `403`, `404 TICKET_NOT_FOUND`

### 4.3 `POST /api/staff/tickets/:id/actions`

Create an action. `performedBy` is always the authenticated user; any `performedBy`/`performedById` in the body is ignored.

- **Request body:**
```json
{
  "actionAt": "2026-10-20T09:30:00.000Z",
  "description": "Replaced the faulty battery",
  "result": "",
  "followUpRequired": true,
  "followUpNote": "Check battery health again next week",
  "attachmentNotes": "See photo battery-label.jpg in Attachments",
  "assigneeId": 6
}
```
- **Validation:**
  - `description`: required, trimmed, 1-2000 characters
  - `result`: optional, at most 1000 characters
  - `actionAt`: optional (defaults to now); ISO date-time; more than 5 minutes in the future is rejected
  - `followUpRequired`: optional boolean, default `false`; when `true`, `followUpNote` is required (1-1000 characters)
  - `attachmentNotes`: optional, at most 500 characters
  - `assigneeId`: optional; must be an active `IT_STAFF` or `ADMINISTRATOR` user
- **Response `201`:** `{ "success": true, "data": <Action> }` (`status` is `OPEN`)
- **Errors:** `400 VALIDATION_ERROR` (with field `details`), `400 INVALID_ASSIGNEE`, `401`, `403`, `404 TICKET_NOT_FOUND`

### 4.4 `PATCH /api/staff/tickets/:id/actions/:actionId`

Edit fields or (re)assign an `OPEN` action. Only the fields present in the body are changed; the same validation as creation applies, including the follow-up rule on the resulting state. `assigneeId: null` clears the assignee.

- **Response `200`:** `{ "success": true, "data": <Action> }`
- **Errors:** `400 VALIDATION_ERROR`, `400 INVALID_ASSIGNEE`, `401`, `403`, `404 ACTION_NOT_FOUND` (also when the action belongs to a different Ticket), `409 ACTION_NOT_EDITABLE` (action is `COMPLETED` or `CANCELLED`)

### 4.5 `POST /api/staff/tickets/:id/actions/:actionId/complete`

Complete an `OPEN` action.

- **Request body:** `{ "result": "Battery now holds charge" }` (`result` required, 1-1000 characters after trimming, unless already stored)
- **Response `200`:** `{ "success": true, "data": <Action> }` with `status: "COMPLETED"`
- **Errors:** `400 VALIDATION_ERROR`, `401`, `403`, `404`, `409 ACTION_NOT_EDITABLE`

### 4.6 `POST /api/staff/tickets/:id/actions/:actionId/cancel`

Cancel an `OPEN` action (no body required).

- **Response `200`:** `{ "success": true, "data": <Action> }` with `status: "CANCELLED"`
- **Errors:** `401`, `403`, `404`, `409 ACTION_NOT_EDITABLE`

---

## 5. Actions Taken (Requester, read-only)

### 5.1 `GET /api/tickets/:id/actions`

Return all actions of a Ticket owned by the authenticated Requester, in the same order and shape as 4.2. IT Staff and Administrators may also call it.

- **Response `200`:** `{ "success": true, "data": { "actions": [ <Action> ] } }`
- **Errors:** `401`, `404 TICKET_NOT_FOUND` (Ticket does not exist **or** is not owned by the Requester; the responses are identical)

Requesters have no create, edit, assign, complete, or cancel endpoint; calling the staff endpoints returns `403 FORBIDDEN_ACCESS`.

---

## 6. Ticket Workflow

### 6.1 `GET /api/staff/tickets/:id` (changed)

The response `data` additionally contains:

```json
{
  "version": 3,
  "allowedTransitions": ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  "openActionsCount": 1
}
```

`allowedTransitions` is calculated by the backend from the transition matrix for the current status and caller's role. It lists transitions that are permitted by the matrix; whether `RESOLVED` currently passes the gate is reported by the status endpoint (and `openActionsCount` lets the UI warn in advance).

### 6.2 `PATCH /api/staff/tickets/:id/status` (changed)

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request body:**
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Battery replaced and verified",
  "expectedVersion": 3
}
```
  - `status`: required, a valid status
  - `expectedVersion`: required integer
  - `resolutionSummary`: optional text (trimmed, at most 2000 characters); required for `RESOLVED` unless already stored on the Ticket
- **Processing order:** validate input -> find Ticket -> check transition matrix -> check resolution gate (for `RESOLVED`) -> compare `expectedVersion` -> update the Ticket and increment `version` in one atomic conditional update.
- **Response `200`:** `{ "success": true, "data": <Ticket including new version and allowedTransitions> }`
- **Errors:**
  - `400 VALIDATION_ERROR` (invalid status, missing `expectedVersion`)
  - `404 TICKET_NOT_FOUND`
  - `409 ILLEGAL_STATUS_TRANSITION`
  - `409 RESOLUTION_GATE_FAILED`:
```json
{
  "success": false,
  "error": {
    "code": "RESOLUTION_GATE_FAILED",
    "message": "The Ticket cannot be resolved yet.",
    "details": [
      { "reason": "OPEN_ACTIONS", "count": 2 },
      { "reason": "MISSING_RESOLUTION_SUMMARY" }
    ]
  }
}
```
  - `409 STALE_UPDATE`: `expectedVersion` differs from the stored `version`; nothing is changed. The response includes the current version so the client can reload.

### 6.3 `PATCH /api/staff/tickets/:id/ownership` and `/priority` (changed)

Behavior is unchanged from Lab 3, with these additions: an optional integer `expectedVersion` in the body (a mismatch returns `409 STALE_UPDATE` and changes nothing), and every successful change increments `version`.

### 6.4 `PATCH /api/tickets/:id/status` (Requester reopen, changed)

Behavior unchanged: a Requester may only request `REOPENED` for an owned Ticket currently `RESOLVED` or `CLOSED`; any other status returns `403 FORBIDDEN_STATUS_TRANSITION`; a non-owned Ticket is rejected. A successful reopen increments `version`. An optional `expectedVersion` is honored with `409 STALE_UPDATE`.

### 6.5 `POST /api/tickets/:id/comments` with `appearsResolved: true` (unchanged)

Remains advisory: it sets `appearsResolvedAt` for Requesters and never changes `currentStatus` or `version`.

---

## 7. Dashboards

Metrics are calculated by the backend using the definitions in `specification.md` section 8.4. Responses are small summaries, not Ticket collections. Each list item contains only the fields shown below.

### 7.1 `GET /api/dashboard/requester`

- **Permitted Roles:** `REQUESTER`. The Requester is the authenticated user; no id parameter exists.
- **Response `200`:**
```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-10-27T03:00:00.000Z",
    "metrics": {
      "open": 3,
      "inProgress": 2,
      "waitingForRequester": 1,
      "resolved": 5,
      "closed": 12
    },
    "recentlyUpdated": [
      {
        "id": 7,
        "ticketNumber": "TKT-2026-000007",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "updatedAt": "2026-10-26T09:00:00.000Z"
      }
    ],
    "recentlyResolved": []
  }
}
```
- **Empty behavior:** a Requester without Tickets receives all metric values `0` and empty lists with status `200`.
- **Errors:** `401`, `403` (other roles)

### 7.2 `GET /api/dashboard/staff`

- **Permitted Roles:** `IT_STAFF`, `ADMINISTRATOR`.
- **Response `200`:**
```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-10-27T03:00:00.000Z",
    "metrics": {
      "new": 14,
      "open": 23,
      "inProgress": 18,
      "waitingForRequester": 7,
      "myAssigned": 16,
      "unassigned": 9,
      "myOpenActions": 4,
      "byItPriority": { "LOW": 10, "MEDIUM": 30, "HIGH": 15, "CRITICAL": 3 }
    },
    "myRecentTickets": [
      { "id": 7, "ticketNumber": "TKT-2026-000007", "summary": "Laptop battery drains quickly", "currentStatus": "IN_PROGRESS", "updatedAt": "2026-10-26T09:00:00.000Z" }
    ],
    "myRecentActions": [
      { "id": 12, "ticketId": 7, "ticketNumber": "TKT-2026-000007", "description": "Replaced the faulty battery", "status": "COMPLETED", "actionAt": "2026-10-20T09:30:00.000Z" }
    ],
    "userCounts": null
  }
}
```
- `userCounts` is `null` for IT Staff. For Administrators it is `{ "active": 10, "inactive": 2, "activeByRole": { "REQUESTER": 5, "IT_STAFF": 4, "ADMINISTRATOR": 1 } }`.
- **Errors:** `401`, `403` (Requester)

### 7.3 Time zone and boundaries
"Recent" windows are rolling (`now - 7 days`) calculated on the server; timestamps are returned as UTC ISO-8601 strings, so no time-zone boundary affects the numbers.

---

## 8. Other Changes

### 8.1 Multi-status filter on list endpoints
`GET /api/tickets` (Requester) and `GET /api/staff/tickets` (IT Staff) accept `status` as a single value or a comma-separated list, for example `status=NEW,OPEN,REOPENED`. Matching is case-insensitive. Unrecognized values in the list are ignored (consistent with the existing "invalid filter is ignored" rule); if no value is valid, no status filter is applied.

### 8.2 Removed
- `GET /api/requesters` (Development Requester lookup)
- The `X-Dev-Requester-Id` authentication fallback

### 8.3 Lab 2 endpoints and authentication
`POST/GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, and `PATCH /api/attachments/:id/remove` continue to behave as in Lab 2, but identify the Requester only from the authenticated token and reject non-Requester roles with `403`.

### 8.4 Health
`GET /api/health` still returns `200` with `{ "status": "ok", "service": "TokTickIT API" }` without authentication.

---

## 9. Authorization Summary

| Endpoint | Requester | IT Staff | Administrator | No credentials |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/tickets/:id/actions` | owned only | ✅ | ✅ | 401 |
| `GET/POST /api/staff/tickets/:id/actions` | 403 | ✅ | ✅ | 401 |
| `PATCH .../actions/:actionId`, `.../complete`, `.../cancel` | 403 | ✅ | ✅ | 401 |
| `PATCH /api/staff/tickets/:id/status` | 403 | ✅ | ✅ | 401 |
| `GET /api/dashboard/requester` | ✅ | 403 | 403 | 401 |
| `GET /api/dashboard/staff` | 403 | ✅ | ✅ | 401 |
