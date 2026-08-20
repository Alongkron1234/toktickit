# REST API Specification
**Project:** TokTickIT Requester Ticketing MVP with UI Foundation  
**Sprint:** Sprint 2 (Lab 2)  
**Base URL:** `/api`  

---

## 1. Global Headers & Context

To simulate authentication in Sprint 2, all Requester endpoints require the client to supply the active Development Requester ID header:

```http
X-Dev-Requester-Id: <requester_id_integer>
Content-Type: application/json
```

If `X-Dev-Requester-Id` is missing, invalid, or belongs to an inactive Requester, the server responds with `403 Forbidden` or `401 Unauthorized`.

---

## 2. Standard Error Response Shape

All API errors return a consistent JSON payload structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "summary",
        "message": "Summary must be at least 5 characters long"
      }
    ]
  }
}
```

---

## 3. Endpoints Detail

### 3.1 `GET /api/requesters`
Retrieve all active Development Requesters for the simulated login selector.

- **Query Parameters:** None
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@example.com",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "michael.b@example.com",
      "isActive": true
    }
  ]
}
```

---

### 3.2 `GET /api/categories` & `GET /api/related-systems`
Retrieve active ticket reference categories and related systems.

- **Response `200 OK` (`/api/categories`):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
}
```

- **Response `200 OK` (`/api/related-systems`):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
}
```

---

### 3.3 `POST /api/tickets`
Create a new IT support ticket for the selected Development Requester.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Request Body:**
```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update."
}
```

- **Validation Rules:**
  - `categoryId`: Required integer (must exist in DB).
  - `relatedSystemId`: Required integer (must exist in DB).
  - `summary`: Required string, trimmed, 5 to 150 characters.
  - `requestedPriority`: Required enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `description`: Required string, trimmed, 10 to 2000 characters.

- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 7,
    "summary": "Laptop battery drains quickly",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "NEW",
    "description": "My laptop battery is draining much faster...",
    "createdAt": "2026-08-18T10:15:30.000Z",
    "updatedAt": "2026-08-18T10:15:30.000Z"
  }
}
```

- **Response `400 Bad Request`:** Missing or invalid fields.
- **Response `403 Forbidden`:** Missing or invalid `X-Dev-Requester-Id`.

---

### 3.4 `GET /api/tickets`
Retrieve paginated ticket listing owned by the selected Requester with search, filtering, and sorting.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Query Parameters:**
  - `search` (optional): Case-insensitive string match on `ticketNumber` or `summary`.
  - `categoryId` (optional): Integer category filter.
  - `requestedPriority` (optional): Enum filter (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `currentStatus` (optional): Enum filter (`NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - `sortBy` (optional): `createdAt` (default) or `ticketNumber`.
  - `sortOrder` (optional): `desc` (default) or `asc`.
  - `page` (optional): Integer (default: 1).
  - `pageSize` (optional): Integer (default: 10, max: 50).

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-18T10:15:30.000Z",
      "updatedAt": "2026-08-18T10:15:30.000Z",
      "_count": { "attachments": 2 }
    }
  ],
  "pagination": {
    "totalItems": 42,
    "totalPages": 5,
    "currentPage": 1,
    "pageSize": 10
  }
}
```

---

### 3.5 `GET /api/tickets/:id`
Retrieve detailed information of a single owned ticket.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Path Parameter:** `id` (integer Ticket ID or string `ticketNumber`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@example.com" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining much faster...",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "NEW",
    "createdAt": "2026-08-18T10:15:30.000Z",
    "updatedAt": "2026-08-18T10:15:30.000Z",
    "attachments": [
      {
        "id": 15,
        "originalName": "battery_diagnostic.png",
        "fileSize": 1048576,
        "mimeType": "image/png",
        "isRemoved": false,
        "createdAt": "2026-08-18T10:16:00.000Z"
      },
      {
        "id": 14,
        "originalName": "old_screenshot.png",
        "fileSize": 524288,
        "mimeType": "image/png",
        "isRemoved": true,
        "removalReason": "Uploaded incorrect file by mistake",
        "removedAt": "2026-08-18T10:20:00.000Z",
        "createdAt": "2026-08-18T10:15:30.000Z"
      }
    ]
  }
}
```
- **Response `403 Forbidden` / `404 Not Found`:** Ticket does not belong to the selected Requester.

---

### 3.6 `POST /api/tickets/:id/attachments`
Upload a supporting attachment file to an owned ticket.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (Binary file data).
- **Constraints:**
  - Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max File Size: `5,242,880 bytes` (5 MB).
  - Max Active Attachments: 5 per ticket.
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 16,
    "ticketId": 101,
    "originalName": "error_log.pdf",
    "fileSize": 204800,
    "mimeType": "application/pdf",
    "isRemoved": false,
    "createdAt": "2026-08-18T10:25:00.000Z"
  }
}
```
- **Response `400 Bad Request` / `422 Unprocessable Entity`:** Unsupported file type, oversized file, or active attachment limit exceeded.

---

### 3.7 `GET /api/attachments/:id/download`
Download an active attachment file.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Response `200 OK`:** File stream binary data with `Content-Disposition: attachment; filename="originalName"`.
- **Response `403 Forbidden` / `404 Not Found`:** Returned if the attachment belongs to another user's ticket OR if `isRemoved === true`.

---

### 3.8 `PATCH /api/attachments/:id/remove`
Soft-remove an attachment from an owned ticket.

- **Headers:** `X-Dev-Requester-Id: 1`
- **Request Body:**
```json
{
  "removalReason": "Uploaded outdated system screenshot"
}
```
- **Validation:** `removalReason` is required (string, trimmed, 3 to 200 characters).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "isRemoved": true,
    "removalReason": "Uploaded outdated system screenshot",
    "removedAt": "2026-08-18T10:30:00.000Z"
  }
}
```
