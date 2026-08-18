# Zen Green Theme UI Specification
**Project:** TokTickIT Requester Ticketing MVP with UI Foundation  
**Sprint:** Sprint 2 (Lab 2)  

---

## 1. Design Tokens & Color Palette

The TokTickIT application uses the **Zen Green** visual design system to establish a calm, professional, and readable interface.

| Token Name | Hex Code | Usage & Placement |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | Application Header background, Primary Action buttons (`Submit`, `Create Ticket`), Strong branding emphasis. |
| **Secondary Green** | `#0B7A46` | Active tab indicators, focus outlines, hover states, interactive links, secondary accents. |
| **Pale Green** | `#EAF6EF` | Selected card/table row background, success callouts, subtle section highlights. |
| **Page Background** | `#F5F7F6` | Quiet near-white background for main app body. |
| **Surface / Card** | `#FFFFFF` | Card surfaces, container panels, white background with `#E2E8F0` border and light box shadow. |
| **Text Primary** | `#1A2E26` | Dark charcoal-green for high contrast reading text (not pure `#000000`). |
| **Text Muted** | `#4A6358` | Secondary labels, timestamps, metadata, help text. |
| **Editable Field** | `#FFFFFF` | White background with clear neutral border (`#CBD5E1`). |
| **Read-Only Field** | `#F1F5F3` | Soft gray-green shading to distinguish non-editable fields clearly. |
| **Error / Destructive** | `#B91C1C` | Dark red text and border; field-level inline error messages. |
| **Warning Accent** | `#D97706` | Amber callout badge for medium priority or pending attention (not ordinary decoration). |
| **Success Accent** | `#15803D` | Green confirmation banner, success state badges. |

---

## 2. Typography & Spacing System

- **Font Family:** System Font Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`).
- **Heading 1 (`h1`):** 24px (1.5rem), SemiBold (600), `#1A2E26`.
- **Heading 2 (`h2`):** 18px (1.125rem), SemiBold (600), `#1A2E26`.
- **Body Text:** 14px (0.875rem), Regular (400), `#1A2E26`, Line-height 1.5.
- **Caption / Help:** 12px (0.75rem), Regular (400), `#4A6358`.
- **Spacing Scale:** Baseline 4px grid (4px, 8px, 12px, 16px, 24px, 32px).
- **Form Control Height:** Standard input/select height 40px with 8px internal vertical padding.

---

## 3. Component & State Rules

### Form Controls & Validation
- **Labels:** Positioned directly above input controls in SemiBold (600) font weight.
- **Required Fields:** Marked with a red asterisk (`*`) immediately after the label text. The asterisk does not replace validation messages.
- **Field States:**
  - *Default:* White background, `#CBD5E1` border.
  - *Focus:* `#0B7A46` border with 2px `#EAF6EF` focus ring.
  - *Invalid:* Dark red border (`#B91C1C`) with dark red error text placed directly below the field.
  - *Disabled:* `#E2E8F0` background, muted text, `cursor: not-allowed`.
  - *Read-Only:* `#F1F5F3` background, distinct neutral border, clear readability.

### Buttons & Interactivity
- **Primary Button:** Solid `#006B3C` background, white text, 6px border radius. Hover: `#0B7A46`.
- **Secondary Button:** White background with `#006B3C` border and text. Hover: `#EAF6EF`.
- **Destructive Button:** White background with `#B91C1C` border and text, or solid `#B91C1C` for dangerous actions (e.g. soft removal confirmation).
- **Busy / Loading State:** Submit button displays a spinning loader indicator and text "Submitting...", while remaining disabled (`pointer-events: none`).
- **Icon Controls:** Every icon-only button must include an accessible `aria-label` and tooltip.

### Badges & Status Indicators
- **Requested Priority Badges:**
  - `LOW`: Gray-green pill badge.
  - `MEDIUM`: Amber/Yellow pill badge.
  - `HIGH`: Orange pill badge.
  - `CRITICAL`: Red pill badge.
- **Current Status Badges:**
  - `NEW`: Pale green background (`#EAF6EF`) with dark green text (`#006B3C`).
  - `OPEN` / `IN_PROGRESS`: Blue-green pill badge.
  - `RESOLVED` / `CLOSED`: Neutral gray pill badge.

---

## 4. Screen Layouts & Specifications

### 4.1 Development Requester Selection Screen
- **Header:** TokTickIT logo with app title.
- **Card Container:** Centered white card with subtle shadow.
- **Banner:** Informational callout box with icon explaining: *"Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication will be introduced in Lab 3."*
- **Controls:**
  - Development Requester Dropdown (populated with active requesters).
  - "Continue" Primary Action Button.
- **States:** Loading state during fetch, Empty state if no active requesters exist, API failure alert banner.

### 4.2 Create Ticket Screen (Form Layout)
- **Top Section:** System-generated read-only fields (Ticket Date).
- **Classification Section:** Category dropdown (2-column layout), Related System dropdown (2-column layout), Requested Priority selector.
- **Content Section:**
  - Ticket Summary (Full width, single line input).
  - Description (Full width, multiline resizable textarea, min-height 120px).
- **Attachment Section:** Drag-and-drop file picker supporting `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` up to 5MB, listing selected files with file size and remove button.
- **Action Bar:** Bottom aligned "Cancel" (Secondary) and "Submit Ticket" (Primary) buttons.
- **Success State:** Banner displaying generated Ticket Number (e.g. `TKT-2026-000001`) with links to "View in My Tickets" or "Create Another Ticket".

### 4.3 My Tickets Screen (Listing Layout)
- **Header Bar:** Title "My Tickets", "Create Ticket" Primary Action Button, "Change Requester" indicator.
- **Filter Bar:**
  - Search Input (placeholder: "Search ticket number or summary...").
  - Category Dropdown Filter ("All Categories").
  - Requested Priority Dropdown Filter ("All Priorities").
  - Status Dropdown Filter ("All Statuses").
  - "Clear Filters" Secondary Button.
- **Data Presentation:**
  - **Desktop (≥992px):** Data table with columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `Current Status`, `Last Updated`.
  - **Mobile (<768px):** Card list view displaying Ticket No., Date, Summary, Category, Priority Badge, Status Badge in stacked cards.
- **Pagination Bar:** Displaying total item count (e.g., "Showing 1 to 10 of 42 tickets"), Previous/Next buttons, page number buttons.
- **Special States:**
  - *Empty State:* Displayed when user has 0 tickets. Shows illustration, text "No tickets yet", and "Create Ticket" button.
  - *No-Results State:* Displayed when filter matches 0 tickets. Shows "No matching tickets found" and "Clear Filters" button.

### 4.4 Requester Ticket Detail Screen (Read-Only Layout)
- **Header:** Navigation breadcrumb `My Tickets > Ticket Details`, "Back to My Tickets" button.
- **Ticket Summary Panel:** Read-only fields for Ticket No., Ticket Date, Category, Related System, Requester Name, Priority Badge, Status Badge.
- **Description Panel:** Read-only description box.
- **Attachment Section:**
  - *Active Attachments List:* Displaying original filename, file size, download action link.
  - *Soft-Removed Attachments List:* Displaying original filename, "Removed" badge, removal reason, removed timestamp, with download link disabled.
  - *Upload Action:* "Add Attachment" button opening file upload modal.
  - *Soft Removal Action:* Trash icon button opening confirmation modal requiring removal reason text input.

---

## 5. Responsive Viewport Rules

| Viewport Width | Layout Behavior |
| :--- | :--- |
| **Desktop (≥ 992 px)** | Multi-column layout; form controls side-by-side where logical; table view for My Tickets; max container width 1200px centered. |
| **Tablet (768 - 991 px)** | Two-column form layout; Summary and Description take full width; table adapts with scroll or stacked columns. |
| **Mobile (< 768 px)** | Single-column stacked layout; form fields stack vertically; My Tickets renders as responsive cards; buttons remain touch-friendly (min 44px touch target); zero horizontal overflow. |

---

## 6. Accessibility & Visual Checklist

- [ ] High text contrast ratio (minimum 4.5:1 for normal text).
- [ ] Visible focus ring (`#0B7A46`) on all interactive controls during keyboard navigation (`Tab`).
- [ ] Status indicators use readable text and badges, never relying on color alone.
- [ ] Form inputs have associated `<label>` elements and `aria-required` attributes.
- [ ] Buttons display visible text labels alongside icons.
- [ ] Zero horizontal page scrollbar at 320px, 375px, 768px, 1024px, and 1440px viewports.

---

## 7. Screenshot Artifact Paths

Screenshots captured during visual inspection and automated E2E tests are stored in:
- `artifacts/lab-02/screenshots/create-ticket/` (Desktop, Tablet, Mobile)
- `artifacts/lab-02/screenshots/my-tickets/` (Desktop, Tablet, Mobile, Empty state, No-results state)
- `artifacts/lab-02/screenshots/ticket-detail/` (Desktop, Tablet, Mobile, Attachments, Soft removal modal)
