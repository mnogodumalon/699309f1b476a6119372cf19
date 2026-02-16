# Design Brief: Werkzeugverwaltung Elektrobetrieb

## 1. App Analysis

### What This App Does
This is a tool management system for an electrical installation company. It tracks the company's entire tool inventory — from power drills to safety ladders — along with which employee has which tool, which project it's assigned to, and when maintenance is due. It's the operational backbone that prevents tools from going missing, ensures safety inspections happen on time, and gives managers a bird's-eye view of asset utilization.

### Who Uses This
The primary user is a **Werkstattleiter (workshop manager)** or **Lagerverwalter (warehouse manager)** — someone who isn't a developer but needs to quickly see what's going on with the company's tools. They check this dashboard multiple times per day: "Who has the Fluke meter?", "What tools need maintenance this month?", "How much have we spent on repairs?"

### The ONE Thing Users Care About Most
**Tool availability and accountability** — at a glance, how many tools are currently checked out vs. available, and are any overdue for return or maintenance? The hero metric is **how many tools are currently ausgegeben (checked out)** versus the total inventory, because this answers the immediate daily question: "Do we have what we need?"

### Primary Actions (IMPORTANT!)
1. **Werkzeug ausgeben (Check out tool)** → Primary Action Button — this is what happens most frequently: an employee needs a tool, the manager logs it
2. **Wartung erfassen (Log maintenance)** — tools come back from service, need to be documented
3. **Werkzeug zurückbuchen (Return tool)** — marking a tool as returned

---

## 2. What Makes This Design Distinctive

### Visual Identity
The design channels the feeling of a **well-organized German workshop** — precise, no-nonsense, yet quietly satisfying. A cool slate-blue base with a bold amber/safety-orange accent creates an industrial-professional atmosphere. The amber accent intentionally evokes safety markings and high-visibility equipment, grounding the digital interface in the physical world of electrical work. The background carries a subtle cool undertone that feels like clean workshop lighting.

### Layout Strategy
The layout uses an **asymmetric two-column approach on desktop** with a dominant left column (65%) for the hero status panel and key charts, and a narrower right column (35%) for actionable lists (overdue returns, upcoming maintenance). This mirrors how managers think: "What's the big picture?" (left) then "What do I need to do right now?" (right).

On mobile, the hero status takes the full first viewport with a bold, oversized availability percentage, then actionable alerts stack below in order of urgency.

Size variation is key: the hero availability ring is dramatically larger than secondary KPIs. The maintenance cost chart spans the full width below the KPI row, creating a clear visual break. Lists use compact inline rows rather than cards to maximize information density.

### Unique Element
The **tool availability gauge** — a large semi-circular arc gauge showing the percentage of tools currently available. The arc uses a thick 10px stroke that transitions from amber (low availability) to a calm teal-green (high availability), creating an instant visual read of fleet health. The number inside is displayed at 56px bold, making it readable from across a room.

---

## 3. Theme & Colors

### Font
- **Family:** Space Grotesk
- **URL:** `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap`
- **Why this font:** Space Grotesk has a technical, engineered feel with slightly squared letterforms that suit a tool/equipment management context. Its wide weight range (300-700) allows strong hierarchy. It's distinctive without being decorative — exactly right for data-heavy industrial software.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(210 20% 97%)` | `--background` |
| Main text | `hsl(215 25% 15%)` | `--foreground` |
| Card background | `hsl(0 0% 100%)` | `--card` |
| Card text | `hsl(215 25% 15%)` | `--card-foreground` |
| Borders | `hsl(210 15% 89%)` | `--border` |
| Primary action | `hsl(28 90% 52%)` | `--primary` |
| Text on primary | `hsl(0 0% 100%)` | `--primary-foreground` |
| Accent highlight | `hsl(175 55% 40%)` | `--accent` |
| Muted background | `hsl(210 15% 93%)` | `--muted` |
| Muted text | `hsl(215 12% 50%)` | `--muted-foreground` |
| Success/positive | `hsl(155 60% 40%)` | (component use) |
| Error/negative | `hsl(0 72% 51%)` | `--destructive` |

### Why These Colors
The cool slate-blue base (`hsl(210 20% 97%)`) creates a professional, calm workspace feel — like clean workshop lighting. The amber primary (`hsl(28 90% 52%)`) is the signature color: it draws from safety/high-vis equipment and immediately communicates "action needed" or "important." The teal accent (`hsl(175 55% 40%)`) provides a calming counterpoint for positive states (available tools, completed maintenance). Together they create an industrial-professional palette that feels purpose-built for this domain.

### Background Treatment
The page background uses a subtle cool-tinted off-white (`hsl(210 20% 97%)`). Cards sit on pure white, creating gentle depth through contrast alone — no gradients or patterns needed. The slight blue undertone in the background prevents the sterile feeling of pure white while maintaining a clean, professional appearance.

---

## 4. Mobile Layout (Phone)

### Layout Approach
Mobile is a focused, action-first experience. The hero availability gauge dominates the first viewport, answering "what's the status?" instantly. Below it, urgent action items (overdue returns, upcoming maintenance) appear as compact, tappable list items. The primary action button is fixed at the bottom for constant thumb-reach access.

Visual interest comes from the dramatic size difference between the hero gauge (taking ~40% of viewport height) and the compact secondary KPIs below it (small inline badges).

### What Users See (Top to Bottom)

**Header:**
A clean top bar with the title "Werkzeugverwaltung" in Space Grotesk 600 weight, 18px. No subtitle. Right side: a small gear/settings icon for navigating to data management views (Mitarbeiter, Projekte, etc.).

**Hero Section (The FIRST thing users see):**
The tool availability gauge — a large semi-circular arc showing "X% verfügbar" (available). Below the arc: the actual numbers "42 von 58 Werkzeuge verfügbar" in 14px muted text. The arc is 200px wide, the percentage number inside is 48px bold. The gauge color shifts: teal-green when >70% available, amber when 40-70%, red when <40%.

Why hero: This answers the #1 daily question without any interaction.

**Section 2: Alert Badges (Inline, not cards)**
A horizontal row of 3 compact status badges directly below the hero:
- "5 überfällig" (overdue) — destructive/red badge
- "3 Wartung fällig" (maintenance due) — amber badge
- "12 ausgegeben" (checked out) — muted badge

These are small (12px text), tightly spaced, and give a quick status pulse without taking much space.

**Section 3: Dringende Aktionen (Urgent Actions)**
A list of the most urgent items, sorted by priority:
1. Overdue tool returns (tools past their geplante_rueckgabe date)
2. Upcoming maintenance (tools with naechste_wartung in the next 14 days)

Each item is a compact row: tool name on left, days overdue/until due on right, colored by urgency. Tapping opens a detail sheet.

Limit: 5 items, with "Alle anzeigen" link.

**Section 4: Letzte Aktivitäten (Recent Activity)**
A simple timeline of the last 5 tool checkouts/returns, showing "Werkzeug X → Mitarbeiter Y" with relative timestamps ("vor 2 Stunden").

**Bottom Navigation / Action:**
Fixed bottom bar with the primary action button: "Werkzeug ausgeben" (Check out tool) — full-width amber button, 48px tall, bold text. Always visible, always accessible.

### Mobile-Specific Adaptations
- Charts are hidden on mobile (replaced by the alert badges which convey the same info more efficiently)
- Lists are simplified to single-line items
- The data management tabs (for CRUD on all 6 apps) are accessible through the gear icon in the header, opening a full-screen navigation sheet

### Touch Targets
- All list items: minimum 44px tap height
- Primary action button: 48px height, full width
- Badge items: 36px height with generous padding

### Interactive Elements
- Tapping an urgent action item opens a bottom sheet with full details and action buttons (mark as returned, log maintenance)
- Tapping the hero gauge opens the full Werkzeuge list view

---

## 5. Desktop Layout

### Overall Structure
A two-column asymmetric layout inside a max-width container (1280px), centered on screen.

**Left column (65%):** Hero gauge + KPI row + maintenance cost chart
**Right column (35%):** Urgent actions list + recent activity feed

The eye flows: Hero gauge (top-left, largest element) → KPI badges (below hero) → Urgent actions (top-right) → Chart (bottom-left) → Activity feed (bottom-right).

### Section Layout

**Top area (full width):**
Header bar with "Werkzeugverwaltung Elektrobetrieb" title (Space Grotesk 700, 24px) on the left, and primary action button "Werkzeug ausgeben" on the right. Below the title: a row of navigation tabs for data management views: "Dashboard | Werkzeuge | Mitarbeiter | Projekte | Zuweisungen | Wartung | Ausgaben".

**Left column — Row 1: Hero + KPIs**
The availability gauge (280px wide semi-circle) sits left, with 4 secondary KPI cards stacked in a 2x2 grid to its right:
- Gesamtwert (total tool value in EUR)
- Wartungskosten (maintenance costs this year)
- Durchschnittl. Ausleihdauer (average checkout duration in days)
- Werkzeuge in Reparatur (tools in repair)

Each KPI card: compact, 140px height, showing label (12px muted), value (28px bold), and a subtle trend indicator.

**Left column — Row 2: Chart**
Full left-column width bar chart: "Werkzeuge nach Kategorie" showing tool count per category (Handwerkzeuge, Elektrowerkzeuge, Messgeräte, etc.) with bars colored by condition (stacked: green=gut, amber=befriedigend, red=reparaturbedürftig/defekt).

**Right column — Section 1: Dringende Aktionen**
Card with "Dringende Aktionen" header. List of overdue returns and upcoming maintenance items, sorted by urgency. Each row: icon (warning/clock), tool name, assignee, days info. Max 8 items with "Alle anzeigen" link.

**Right column — Section 2: Letzte Aktivitäten**
Card with "Letzte Aktivitäten" header. Timeline of recent checkouts/returns with relative timestamps. Max 6 items.

### What Appears on Hover
- KPI cards: subtle shadow lift + background brightens slightly
- List items in urgent actions: background highlight, edit/return action icons appear on the right
- Chart bars: tooltip with exact count and percentage
- Tab items: underline animation

### Clickable/Interactive Areas
- Each navigation tab switches the main content area to a full CRUD view for that app
- KPI cards: clicking "Werkzeuge in Reparatur" filters the Werkzeuge list to only show repair-needed items
- Urgent action items: clicking opens an inline detail panel or dialog for that specific record
- Chart category bars: clicking filters the tool list to that category

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** Werkzeug-Verfügbarkeit
- **Data source:** Werkzeuge (total count) cross-referenced with Werkzeugausgabe (currently checked out, i.e., records with ausgabedatum but no matching tatsaechliche_rueckgabe in Werkzeugzuweisung)
- **Calculation:** Count of available tools / total tools. A tool is "checked out" if it appears in Werkzeugausgabe with an ausgabedatum and the geplante_rueckgabe is in the future or past (not yet returned). Available = total - checked out.
- **Display:** Semi-circular arc gauge, 280px on desktop / 200px on mobile. Percentage in center at 48px/56px bold. Below: "X von Y Werkzeuge verfügbar" in muted text.
- **Context shown:** Color shifts by availability level: teal (>70%), amber (40-70%), red (<40%)
- **Why this is the hero:** Every manager's first question is "What's available?" This answers it in under 1 second.

### Secondary KPIs

**Gesamtwert (Total Inventory Value)**
- Source: Werkzeuge
- Calculation: Sum of all kaufpreis values
- Format: Currency (EUR)
- Display: Compact card, 28px bold value

**Wartungskosten (Maintenance Costs This Year)**
- Source: Wartung
- Calculation: Sum of kosten where wartungsdatum is in the current year
- Format: Currency (EUR)
- Display: Compact card, 28px bold value

**Durchschn. Ausleihdauer (Average Checkout Duration)**
- Source: Werkzeugzuweisung
- Calculation: Average days between zuweisungsdatum and tatsaechliche_rueckgabe (for completed assignments)
- Format: Number + "Tage"
- Display: Compact card, 28px bold value

**In Reparatur (Tools Needing Repair)**
- Source: Werkzeuge
- Calculation: Count where zustand is 'reparaturbeduerftig' or 'defekt'
- Format: Number
- Display: Compact card with destructive/red accent if > 0

### Chart
- **Type:** Bar chart (horizontal) — best for comparing categories with German-length labels
- **Title:** Werkzeuge nach Kategorie
- **What question it answers:** "How is our tool inventory distributed across categories?" Helps identify gaps or over-investment.
- **Data source:** Werkzeuge
- **X-axis:** Category name (from lookup_data: Handwerkzeuge, Elektrowerkzeuge, Messgeräte, etc.)
- **Y-axis:** Count of tools in each category
- **Bar color:** Primary amber for total, with stacked segments by zustand if data permits
- **Mobile simplification:** Hidden on mobile; replaced by the badge summary. Visible when user taps into the "Dashboard" tab in desktop-like view.

### Lists/Tables

**Dringende Aktionen (Urgent Actions)**
- Purpose: Surface items that need immediate attention
- Source: Werkzeugzuweisung (overdue returns where geplante_rueckgabe < today and tatsaechliche_rueckgabe is null) + Wartung (where naechste_wartung is within 14 days of today)
- Fields shown: Tool name (via werkzeug lookup), person/type, days overdue or days until due
- Mobile style: Compact list items
- Desktop style: Card with list rows, action icons on hover
- Sort: Most overdue first
- Limit: 5 on mobile, 8 on desktop

**Letzte Aktivitäten (Recent Activity)**
- Purpose: Show what's been happening recently for awareness
- Source: Werkzeugausgabe (sorted by ausgabedatum desc)
- Fields shown: Tool name, employee name, date (relative), action type
- Mobile style: Simple timeline list
- Desktop style: Card with timeline entries
- Sort: Most recent first
- Limit: 5 on mobile, 6 on desktop

### Primary Action Button (REQUIRED!)

- **Label:** "Werkzeug ausgeben" (Check out tool)
- **Action:** add_record
- **Target app:** Werkzeugausgabe
- **What data:** mitarbeiter (select from Mitarbeiter records), werkzeuge (select from Werkzeuge records), ausgabedatum (default today), geplante_rueckgabe (date picker), projekt (optional, select from Projekte), notizen (optional textarea)
- **Mobile position:** bottom_fixed — full-width amber button, always visible
- **Desktop position:** header — right-aligned button in the top header bar
- **Why this action:** Checking out a tool is the most frequent daily operation. Every morning, employees pick up tools; the manager needs to log this instantly.

### CRUD Operations Per App (REQUIRED!)

**Werkzeuge CRUD Operations**

- **Create:** "+" button in Werkzeuge tab header opens Dialog. Fields: werkzeugname (text, required), kategorie (select from 8 options), hersteller (text), modellnummer (text), seriennummer (text), kaufdatum (date, default today), kaufpreis (number), zustand (select from 6 options, default "neu"), lagerort (text), bemerkungen (textarea).
- **Read:** Table view sorted by werkzeugname. Columns: Werkzeugname, Kategorie, Hersteller, Zustand, Lagerort. Click row → Detail Dialog showing all fields.
- **Update:** Edit icon (pencil) in detail view → Same dialog as Create, pre-filled. All fields editable.
- **Delete:** Trash icon in detail view → Confirmation: "Werkzeug '{werkzeugname}' wirklich löschen?"

**Mitarbeiter CRUD Operations**

- **Create:** "+" button opens Dialog. Fields: vorname (text, required), nachname (text, required), personalnummer (text), abteilung (select from 5 options), telefon (tel), email (email).
- **Read:** Table view sorted by nachname. Columns: Name (vorname + nachname), Personalnr., Abteilung, Telefon. Click → Detail Dialog.
- **Update:** Edit icon in detail → Same dialog, pre-filled.
- **Delete:** Trash icon → Confirmation: "Mitarbeiter '{vorname} {nachname}' wirklich löschen?"

**Projekte CRUD Operations**

- **Create:** "+" button opens Dialog. Fields: projektname (text, required), projektnummer (text), kundenname (text), strasse (text), hausnummer (text), postleitzahl (text), stadt (text), startdatum (date), enddatum (date), projektleiter (text).
- **Read:** Table view sorted by startdatum desc. Columns: Projektname, Projektnr., Kunde, Zeitraum (start-end), Projektleiter. Click → Detail Dialog.
- **Update:** Edit icon → Same dialog, pre-filled.
- **Delete:** Trash icon → Confirmation: "Projekt '{projektname}' wirklich löschen?"

**Werkzeugzuweisung CRUD Operations**

- **Create:** "+" button opens Dialog. Fields: werkzeug (select from Werkzeuge records, required), mitarbeiter (select from Mitarbeiter records, required), projekt (select from Projekte, optional), zuweisungsdatum (date, default today), geplante_rueckgabe (date), tatsaechliche_rueckgabe (date), notizen (textarea).
- **Read:** Table view sorted by zuweisungsdatum desc. Columns: Werkzeug (resolved name), Mitarbeiter (resolved name), Projekt, Zuweisungsdatum, Status (returned vs outstanding). Click → Detail Dialog.
- **Update:** Edit icon → Same dialog, pre-filled. Important: marking tatsaechliche_rueckgabe effectively "returns" the tool.
- **Delete:** Trash icon → Confirmation: "Zuweisung wirklich löschen?"

**Wartung CRUD Operations**

- **Create:** "+" button opens Dialog. Fields: werkzeug (select from Werkzeuge, required), wartungsart (select from 6 types, required), wartungsdatum (date, default today), beschreibung (textarea), kosten (number), durchgefuehrt_von (select: intern/extern), naechste_wartung (date).
- **Read:** Table view sorted by wartungsdatum desc. Columns: Werkzeug (resolved), Wartungsart, Datum, Kosten, Nächste Wartung. Click → Detail Dialog.
- **Update:** Edit icon → Same dialog, pre-filled.
- **Delete:** Trash icon → Confirmation: "Wartungseintrag wirklich löschen?"

**Werkzeugausgabe CRUD Operations**

- **Create:** Primary action button / "+" button opens Dialog. Fields: mitarbeiter (select from Mitarbeiter, required), werkzeuge (select from Werkzeuge, required), ausgabedatum (date, default today), geplante_rueckgabe (date), projekt (select from Projekte, optional), notizen (textarea).
- **Read:** Table view sorted by ausgabedatum desc. Columns: Werkzeug (resolved), Mitarbeiter (resolved), Ausgabedatum, Geplante Rückgabe, Projekt. Click → Detail Dialog.
- **Update:** Edit icon → Same dialog, pre-filled.
- **Delete:** Trash icon → Confirmation: "Ausgabe wirklich löschen?"

---

## 7. Visual Details

### Border Radius
Rounded (8px) — `--radius: 0.5rem`. Professional without being sharp, approachable without being bubbly. Matches the industrial-but-modern feel.

### Shadows
Subtle — cards use `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)) at rest, `shadow-md` on hover. No heavy drop shadows. Depth comes from the background/card color contrast.

### Spacing
Normal to spacious — 24px between major sections, 16px between cards, 12px inside compact list items. The hero section gets extra breathing room (32px padding).

### Animations
- **Page load:** Subtle fade-in (opacity 0→1, 300ms) for the main content
- **Hover effects:** Cards: translateY(-1px) + shadow increase. List items: background color shift to muted. Buttons: slight darken.
- **Tap feedback:** Scale(0.98) on press for buttons

---

## 8. CSS Variables (Copy Exactly!)

```css
:root {
  --radius: 0.5rem;
  --background: hsl(210 20% 97%);
  --foreground: hsl(215 25% 15%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(215 25% 15%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(215 25% 15%);
  --primary: hsl(28 90% 52%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(210 15% 93%);
  --secondary-foreground: hsl(215 25% 20%);
  --muted: hsl(210 15% 93%);
  --muted-foreground: hsl(215 12% 50%);
  --accent: hsl(175 55% 40%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 72% 51%);
  --border: hsl(210 15% 89%);
  --input: hsl(210 15% 89%);
  --ring: hsl(28 90% 52%);
  --chart-1: hsl(28 90% 52%);
  --chart-2: hsl(175 55% 40%);
  --chart-3: hsl(215 25% 45%);
  --chart-4: hsl(45 85% 55%);
  --chart-5: hsl(0 72% 51%);
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Font loaded from URL above (Space Grotesk, weights 300-700)
- [ ] Font-family set to 'Space Grotesk', sans-serif
- [ ] All CSS variables copied exactly from Section 8
- [ ] Mobile layout matches Section 4
- [ ] Desktop layout matches Section 5
- [ ] Hero availability gauge is prominent as described
- [ ] Amber/teal color scheme creates industrial-professional mood
- [ ] All 6 apps have full CRUD operations
- [ ] Delete confirmations are in place for all apps
- [ ] Tab navigation works for switching between dashboard and CRUD views
- [ ] Toast notifications for all CRUD operations
- [ ] Loading skeletons for all data-dependent sections
