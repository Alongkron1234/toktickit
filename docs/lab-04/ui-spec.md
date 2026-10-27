# Zen Green UI & Responsive Specification

**Project:** TokTickIT Actions Taken, Dashboards, and Final Regression  
**Sprint:** Sprint 4 (Lab 4)  
**Status:** Draft for owner review.

---

## 1. Design System Reuse

Lab 4 reuses the Zen Green design language from Labs 2 and 3: color tokens, cards, badges, form conventions, validation placement, loading/empty/error patterns, and responsive rules. No second visual system is introduced. The final product must look and behave as one application.

### 1.1 Core tokens (unchanged)
Primary green `#006B3C` for the header, primary actions, and strong emphasis; secondary green `#0B7A46` for active tabs, focus accents, links, and hover; pale green `#EAF6EF` for selected, success, and subtle section emphasis; page background `#F5F7F6`; white cards with a subtle border and restrained shadow; dark charcoal-green text; read-only fields in soft gray-green; errors in dark red text and border with the message directly below the field; warnings in amber and never as ordinary decoration; success in green with readable text and never by color alone.

### 1.2 New badge rules
Existing role, ticket-status, and priority badges are reused as defined in `docs/lab-03/ui-spec.md`. Lab 4 adds:

| Badge | Value | Visual | Text/Icon cue |
| :--- | :--- | :--- | :--- |
| Action status | `OPEN` | Sky Blue pill (`#0284C7` on `#E0F2FE`) | label "Open" |
| | `COMPLETED` | Emerald pill (`#16A34A` on `#DCFCE7`) | label "Completed" with check icon |
| | `CANCELLED` | Neutral Slate pill (`#475569` on `#F1F5F9`) | label "Cancelled" |
| Follow-up | Follow-Up Required | Amber pill (`#D97706` on `#FEF3C7`) | label "Follow-up required" with flag icon |

Every badge carries its text label so status is never conveyed by color alone.

### 1.3 Metric card component (new, reusable)
A white card with a label (small, muted), a large value, and an optional action. Value and label are inside a single focusable control (`<a>` or `<button>`) whose accessible name reads "`<label>`: `<value>`, view list" when it drills down. Cards have a visible focus ring (secondary green), hover state, and a disabled/static variant when no drill-down exists.

---

## 2. Application Shell and Navigation

- The header shows the application identity, role-specific navigation, and the authenticated user's name and role badge with Profile and Logout actions. The Development Requester display and the Change Requester action no longer exist.
- Navigation per role, with the active page clearly indicated (underline plus bold text and `aria-current="page"`):
  - Requester: **Dashboard**, My Tickets, Create Ticket
  - IT Staff: **Dashboard**, Ticket Queue
  - Administrator: **Dashboard**, Ticket Queue, User Management
- The default landing page after login is the role's Dashboard. **(Decision)**
- Mobile: the navigation collapses into a menu button with a visible text label "Menu"; items have a 44 px minimum touch target.
- Unauthorized destinations are never listed; a direct attempt shows the Access Denied state (section 8).

---

## 3. IT Staff Dashboard

**Purpose:** a concise operational starting point; every actionable item opens the matching Ticket Queue, filtered list, or Ticket Detail.

**Layout (desktop >= 992 px):**
1. Greeting ("Welcome back, <first name>") with a **Refresh** button at the right.
2. Metric card row: **New**, **Open**, **In Progress**, **Waiting for Requester**, **My Assigned**, **Unassigned** (6 cards, wrapping to two rows if needed). Each card drills down as defined in `specification.md` section 8.4.
3. Two columns below:
   - Left: **My Recent Tickets** (up to 5: Ticket No., summary, status badge, last updated) with a "View all" link to the Ticket Queue; below it **My Actions Taken** (up to 5: action description, Ticket No., action status badge, date) and a small "Open actions assigned to me: N" line.
   - Right: **Quick Actions** (Ticket Queue, Search Tickets) and **Tickets by IT Priority** (four count rows with priority badges, each linking to the Queue filtered by that priority).
4. Administrators additionally see an **Accounts** card (active, inactive, and per-role counts) linking to User Management.

**Tablet (768-991 px):** cards in a 3-column grid; the two lower panels stack.
**Mobile (<768 px):** cards in a 2-column grid (touch targets >= 44 px); panels stack; rows are card-like with wrapped text and no horizontal scroll.

**States:** Loading (skeleton cards or spinner with visible "Loading dashboard..." text); Empty (all values 0 and empty lists display "No tickets to show yet" style messages, not an error); Forbidden (Access Denied panel); Failure (safe message "We couldn't load the dashboard" with a Retry button; no technical details).

---

## 4. Requester Dashboard

**Purpose:** let a Requester see what needs attention without duplicating the full My Tickets screen. Only the authenticated Requester's data is shown.

**Layout (desktop):**
1. Greeting with a **Refresh** button.
2. Metric card row: **Open**, **In Progress**, **Waiting for Requester**, **Resolved**, **Closed**. The "Waiting for Requester" card is highlighted with an amber "Needs your reply" text cue when its value is greater than 0.
3. Two columns: **Recently Updated** (up to 5) and **Recently Resolved** (up to 5, last 7 days); right column **Quick Actions** (Create Ticket, View My Tickets).

Cards open My Tickets with the matching multi-status filter; list rows open Ticket Detail. Tablet, mobile, and state behavior follow section 3.

---

## 5. Actions Taken on Ticket Detail

### 5.1 IT Staff Ticket Detail: Actions Taken tab
The tab sits with the existing tabs (Public Comments, Internal Notes, Attachments) and shows a count badge of actions.

- **List (view mode):** newest action first. Each row/card shows: action date/time, description, result (or "No result yet"), Performed By (name and role badge), assignee (or "Unassigned"), action status badge, Follow-up flag badge when required, and follow-up note and attachment notes when present. Desktop uses a table or structured rows; mobile uses cards. Rows for `OPEN` actions show **Edit**, **Complete**, **Cancel**; terminal actions show no edit controls.
- **Create mode:** an "Add Action Taken" panel (inline or drawer) with fields:
  - Action date/time (default now) — editable, label above, validation below
  - Description * (multiline, character counter, max 2000)
  - Result (multiline, max 1000)
  - Assignee (dropdown of active IT Staff and Administrators, optional)
  - Follow-up required (checkbox); when checked, **Follow-up note *** (multiline) appears and is required
  - Attachment notes (single-line/short text, max 500) with helper text "Tell the reader which attached file to look at"
  - Performed By shown as a read-only field with the current user (set automatically)
  - Buttons: **Save Action** (primary, busy state, disabled while saving) and **Cancel** (secondary)
- **Edit mode:** same form pre-filled for `OPEN` actions; Performed By remains read-only.
- **Complete:** a small form/dialog asking for Result (required) with **Complete Action** and **Cancel**.
- **Cancel action:** confirmation dialog ("Cancel this action? It can't be edited afterwards") with **Cancel Action** (destructive style) and **Keep Open**.
- **Required markers:** red asterisk plus the visible message below the field; the asterisk never replaces the validation message.
- **Read-only styling:** system-set fields (Performed By, created time) use the read-only field style.
- **States:** loading list; empty ("No actions have been recorded for this Ticket yet."); field validation errors; saving (busy button); success (inline confirmation and the list refreshes); API failure (safe message with the entered data preserved and a retry); forbidden; not found.

### 5.2 Requester Ticket Detail: Actions Taken (read-only)
A read-only list of the same fields in the same order, without Edit, Complete, Cancel, or Add controls. Empty state: "No actions have been recorded yet."

---

## 6. Ticket Workflow Controls

- The **Current Status** control on the IT Staff Ticket Detail lists only the transitions returned in `allowedTransitions`; if none exist (for example `CANCELLED`), the control is read-only with an explanatory note.
- Choosing `RESOLVED` shows a **Resolution Summary** field (required) in the same panel. If `openActionsCount > 0`, a warning callout (amber, with an icon and text) reads "N action(s) are still open. Complete or cancel them before resolving." and the Save button is still enabled (the backend is the authority and returns the reasons if it refuses).
- **Gate failure:** the reasons from `RESOLUTION_GATE_FAILED` are listed under the control.
- **Conflict:** `STALE_UPDATE` shows "This Ticket was changed by someone else. Reload to see the latest version." with a **Reload** button; entered values are not discarded silently.
- After a successful change the Ticket summary (status badge, version, allowed transitions) refreshes.
- The Requester view offers **Reopen** (for `RESOLVED`/`CLOSED`) and **Problem Appears Resolved**; it never offers Resolved or Closed.

---

## 7. Feedback States (all screens)

| State | Presentation |
| :--- | :--- |
| Loading | Spinner or skeleton with visible/`aria-live` text |
| Empty (no data yet) | Friendly message and a next-step action where meaningful |
| No results (filter/search) | "No results match your filters" with **Clear filters** |
| Validation | Message directly below the field, linked with `aria-describedby`, field border dark red |
| Success | Green confirmation with text (and icon), not color alone |
| Forbidden | Access Denied page/panel; no data leaked |
| Not found | Not Found page/panel with a way back |
| Conflict | Amber callout with a Reload action |
| Safe failure | Short message, Retry button, entered form data preserved, no technical details |

---

## 8. Access Denied and Not Found

Both are full-width centered cards inside the application shell with a title, one sentence of explanation, and a button back to the user's Dashboard.

---

## 9. Responsive Rules

| Viewport | Required behavior |
| :--- | :--- |
| Desktop >= 992 px | Multi-column layouts, tables for lists, content centered with a sensible maximum width |
| Tablet 768-991 px | Two-column or compact layouts; Summary/Description and action forms keep enough width; cards in 3 columns |
| Mobile < 768 px | Fields and panels stack vertically; lists become cards; buttons are touch-friendly (>= 44 px); no horizontal page scrolling |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable text; long summaries and file names wrap |

---

## 10. Accessibility

- Every control is operable by keyboard with a visible focus indicator; tab order follows visual order.
- Icon-only controls have an accessible name and tooltip; dialogs trap focus, close with Esc, and return focus to the trigger.
- Status, priority, and action state always include text (not color alone).
- Form fields have visible labels above the control; errors are announced (`aria-live="polite"` or linked by `aria-describedby`).
- Metric cards are real links/buttons with descriptive accessible names.
- Text contrast meets WCAG AA (4.5:1) and touch targets are at least 44 px on mobile.

---

## 11. Visual Inspection Checklist

To be completed with the screenshots (viewport sizes: desktop 1280x800, tablet 820x1180, mobile 390x844):

- [ ] Colors and tokens match section 1 on every Lab 4 screen
- [ ] Editable and read-only fields are clearly distinct
- [ ] Required markers and validation messages are placed correctly (message below the field)
- [ ] Button hierarchy is clear (one primary action; destructive style only for destructive actions)
- [ ] Badges are consistent for status, priority, role, action status, and follow-up
- [ ] Dashboards show cards, recent lists, quick actions, and empty/failure states correctly
- [ ] Actions Taken list, create, edit, complete, cancel, and read-only views are correct
- [ ] Keyboard focus is visible on every interactive element
- [ ] No clipping, overlap, or unintended horizontal scrolling at any of the three sizes
- [ ] No console errors, placeholder text, or unfinished controls

## 12. Screenshot Paths

Screenshots are stored under `artifacts/lab-04/screenshots/`:

- `staff-dashboard/` (desktop, tablet, mobile; normal, empty, failure)
- `requester-dashboard/` (desktop, tablet, mobile; normal, empty, failure)
- `actions-taken/` (list, create validation, edit, complete, cancel, read-only Requester view, mobile)

File names follow `<screen>-<state>-<viewport>.png`, for example `staff-dashboard-normal-desktop.png`.
