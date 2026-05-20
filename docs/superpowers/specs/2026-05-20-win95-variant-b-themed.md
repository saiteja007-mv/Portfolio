# Variant B — Windows 95-Themed Scrolling Layout

> Read `2026-05-20-win95-revamp-design.md` first (shared system + hard constraints).
> Worktree: `C:\Users\saite\pf-worktrees\themed` · Branch: `win95-themed` (from `win95-base`).

## Concept

Keep the familiar single-page **vertical scroll** UX, but reskin everything as
Windows 95. Each section is a Win95 **window frame**; navigation is a menu
bar + taskbar; controls are Win95 buttons/inputs. Recruiter-friendly: no
drag-to-discover, everything visible by scrolling.

## Layout & behavior

### Top chrome (sticky)
- **Menu bar** — File / Edit / View / Help (classic). At least one real use:
  "View" lists sections (jump links); "Help → About" opens a small Win95 dialog
  with bio. Hover highlight; keyboard accessible.
- **Nav** — section jump links rendered as menu items or a row of raised tabs
  (Home, About, Journey, Work, Visualizations, Skills, Certifications, Contact).
  Smooth-scroll to sections. Active section highlighted.
- Mobile: collapses to a Start-style menu button that opens the section list.

### Sections as windows
Each `<section>` becomes a Win95 window frame:
- Titlebar: 16px section icon + section name (e.g. "About Me — Notepad") + decorative
  min/max/close buttons (close can scroll-to-top or be inert; keep honest — prefer
  inert/decorative with `aria-hidden`, or wire min/max to collapse/expand the
  section body for a real touch).
- Body: the section's real content, styled with `win95.css`.
- Optional statusbar footer (e.g. "8 items", "Ready").
- Windows are static in flow (not draggable) — the scroll IS the navigation.

### Section treatments
- **Home/Hero** — a "welcome" desktop greeting or a large window: name, title
  ("Data Analyst & AI Enthusiast"), CTAs as Win95 buttons (Get In Touch, View
  Resume → keep Google Drive link/modal). Optional teal desktop strip behind.
- **About** — Notepad-style window with bio + profile image.
- **Journey** — timeline as a vertical list inside a window; each role = an item
  row (logo + company + dates + achievements). Could style as an "Explorer" tree.
- **Work** — "My Documents"/Explorer **file-list view**: each project a row or
  icon-tile (icon + name + GitHub link + tech tags + writeup links). Preserve all
  6 projects + links.
- **Visualizations** — windows embedding/linking the Tableau dashboards (IPL,
  Sales Performance); "Open in Tableau Public" buttons.
- **Skills** — **desktop-icon grid** of skill logos with labels (Python, SQL,
  PySpark, Airflow, PostgreSQL, R, Informatica, Tableau, AWS, …).
- **Certifications** — credential cards as small windows or icon tiles linking the
  PDFs/JPGs in `docs/Certifications/`.
- **Contact** — Win95 form window: sunken inputs (name/email/subject/message) +
  raised "Send" button. Preserve AWS fetch + loading/validation/success/error.

### Footer = taskbar
- Bottom bar (sticky or page-end): Start button (opens the section menu / "About"
  dialog), social shortcuts (LinkedIn, GitHub icons), live clock tray.

## Files (in this worktree)
- `index.html` — restructured: preserve `<head>` (SEO/JSON-LD/meta), wrap each
  section in window-frame markup, menu bar + taskbar. Keep all content.
- `assets/css/win95.css` — shared (from base; do not fork — add a `themed.css` for
  variant-B-only layout rules).
- `assets/css/themed.css` — section/window layout, menu bar, taskbar, responsive.
- `assets/js/script.js` — keep contact fetch + resume modal + smooth scroll +
  active-section highlight + menu interactions; prune effects that clash with the
  retro look (cursor follower, parallax, typing) — note removals.
- Preserve `assets/images/`, `assets/win95/`, `sitemap.xml`, `robots.txt`, favicon.

## Success criteria
1. Page scrolls top→bottom showing every section as a Win95 window; no console errors.
2. Menu bar + nav jump to sections (smooth scroll); active section highlighted.
3. Skills render as a desktop-icon grid; Work renders as a file/Explorer list.
4. Contact form still submits to the AWS endpoint with working states.
5. All original content present (projects, links, journey, skills, certs, viz).
6. SEO/meta/JSON-LD preserved; favicon loads.
7. Fully responsive (mobile menu, single-column windows); touch-friendly.
8. Runs via `python -m http.server` with no build step.

## Out of scope
Draggable windows, window manager, multi-window state. (That's Variant A.)
Keep it a clean themed reskin. YAGNI.
