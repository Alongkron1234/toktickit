# Zen Green UI & Responsive Specification

**Project:** TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Sprint:** Sprint 3 (Lab 3)  

---

## 1. Design System & Theme Integration

Lab 3 extends the **Zen Green Design System** established in Lab 2. All new components, screens, and states strictly reuse design tokens, form conventions, cards, badges, buttons, typography, and validation patterns.

### 1.1 Color Tokens & Badges

| Badge Category | Element Value | Visual Representation | CSS Tokens / Classes |
| :--- | :--- | :--- | :--- |
| **Role Badges** | `REQUESTER` | Slate Blue pill (`#4F46E5`, bg `#EEF2FF`) | `.badge-role-requester` |
| | `IT_STAFF` | Zen Green pill (`#0D9488`, bg `#CCFBF1`) | `.badge-role-staff` |
| | `ADMINISTRATOR` | Amber Gold pill (`#D97706`, bg `#FEF3C7`) | `.badge-role-admin` |
| **Ticket Status Badges** | `NEW` | Blue pill (`#2563EB`, bg `#DBEAFE`) | `.badge-status-new` |
| | `OPEN` | Sky Blue pill (`#0284C7`, bg `#E0F2FE`) | `.badge-status-open` |
| | `IN_PROGRESS` | Zen Green pill (`#059669`, bg `#D1FAE5`) | `.badge-status-in-progress` |
| | `WAITING_FOR_REQUESTER` | Orange pill (`#EA580C`, bg `#FFEDD5`) | `.badge-status-waiting` |
| | `RESOLVED` | Emerald pill (`#16A34A`, bg `#DCFCE7`) | `.badge-status-resolved` |
| | `CLOSED` | Neutral Slate pill (`#475569`, bg `#F1F5F9`) | `.badge-status-closed` |
| | `REOPENED` | Purple pill (`#9333EA`, bg `#F3E8FF`) | `.badge-status-reopened` |
| | `CANCELLED` | Rose Red pill (`#E11D48`, bg `#FFE4E6`) | `.badge-status-cancelled` |
| **Priority Badges** | `Low` | Muted Gray pill (`#64748B`, bg `#F8FAFC`) | `.badge-priority-low` |
| | `Medium` | Warm Amber pill (`#D97706`, bg `#FEF3C7`) | `.badge-priority-medium` |
| | `High` | Bright Coral pill (`#DC2626`, bg `#FEE2E2`) | `.badge-priority-high` |
| | `Urgent` | Crimson Red pill with ring (`#991B1B`, bg `#FEE2E2`) | `.badge-priority-urgent` |

---

## 2. Screen Specifications & Layouts

### 2.1 Login & Mandatory Password Change Screen

- **Layout Structure:** Centered card layout on soft Zen background (`#F0FDF4`).
- **Login Mode:** Email input, Password input (with show/hide toggle icon), "Sign In" primary button, inline field validation error placement.
- **First-Login Password Change Mode:** Header indicating "You must change your password to continue", Current (temporary) Password field, New Password field, Confirm New Password field, live password complexity checklist indicator (≥8 chars, uppercase/lowercase, number/special char), and "Save New Password & Continue" button.
- **States:** Normal, Busy/Submitting (disabled button with spinner), Validation Error (red inline banners), Inactive Account (safe notice: "Account is disabled. Please contact IT support.").

---

### 2.2 Requester Screens & Public Comments

- **Application Shell Header:** Shows authenticated user name, email, role badge (`REQUESTER`), Profile dropdown, and "Logout" action.
- **Ticket Detail Screen Modifications:**
  - Includes append-only **Public Comments** feed with author initial avatars, author name, role badge, timestamp, and message body.
  - "Add Public Comment" textarea with character counter and "Post Comment" Zen Green button.
  - "Indicate Problem Appears Resolved" button with confirmation modal.

---

### 2.3 IT Staff Ticket Queue Screen

- **Layout Structure:** Top Filter/Search Bar + Data Grid / Responsive Card Container + Bottom Pagination Bar.
- **Filter & Search Controls:**
  - Search input with magnifying glass icon (filters by Ticket Number or Summary).
  - Dropdown Filters: `Status`, `IT Priority`, `Owner` (All, Unassigned, Assigned to Me). Requested Priority is shown as a read-only table column (not a filter) since IT Staff triage primarily by IT Priority, the value they control.
- **Data Table Layout (Desktop ≥992px):** Columns for Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Status, Owner, Actions.
- **Card List Layout (Mobile <768px):** Clean card representation showing Ticket No., Summary, status/priority badges stacked vertically with tap target to open detail.

---

### 2.4 IT Staff Ticket Detail Screen

- **Layout Structure:** 
  - **Header:** Back to Queue button, Ticket Number breadcrumb, Quick Action buttons (Claim Ticket, Reassign Owner).
  - **Main Info Panel:** Two-column grid showing Ticket details, Requester info, Requested Priority vs IT Priority dropdown, Current Status dropdown, Resolution Summary.
  - **Tabbed / Dual Communication Panel:**
    - **Tab 1: Public Comments** (Shared communication with Requester; Indigo accent styling).
    - **Tab 2: Internal Notes** (Role-restricted operational notes; Warm Amber accent styling with clear "PRIVATE - IT STAFF ONLY" banner).
    - **Tab 3: Attachments** (Continuity from Lab 2).

---

### 2.5 Administrator User Management Screen

- **Layout Structure:**
  - **Top Bar:** Header "Users", "Create User" primary Zen Green button, Search Input (name/email), Role Filter Dropdown.
  - **User List Table (Desktop) / Cards (Mobile):** Columns for Name, Email, Role Badge, Status Toggle (`Active` / `Inactive`), Actions (`Edit`, `Reset Password`).
  - **Create / Edit User Drawer (Modal):** Slide-over or modal with fields for Full Name, Email, Role Selector, Active Toggle, Initial Password (with "Requires change on first login" checked notice).

---

## 3. Responsive Rules & Viewport Breakpoints

- **Desktop Viewport (≥992px):** Multi-column grid layouts, full data tables, side-by-side drawer modals, sticky filter bars.
- **Tablet Viewport (768px – 991px):** Compact tables with horizontal scrolling or collapsible columns, stacked filter dropdowns.
- **Mobile Viewport (<768px):** Single-column stacked layouts, full-width touch targets (minimum 44px height), card-based ticket and user list presentation, sticky action buttons at screen bottom.

---

## 4. Accessibility & Visual State Checklist

- **Keyboard Navigation:** Full tab order across forms, dropdowns, modal traps, and action buttons.
- **Focus Indicators:** Visible Zen Green focus ring (`ring-2 ring-emerald-500`) on active inputs and buttons.
- **Contrast Ratios:** Text color contrast complies with WCAG AA guidelines (minimum 4.5:1 ratio).
- **Error Placement:** Inline field-level error messages located directly beneath invalid inputs with `aria-describedby` linkage.
