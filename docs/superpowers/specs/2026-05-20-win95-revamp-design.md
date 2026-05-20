# Windows 95 Portfolio Revamp — Design Spec

> Date: 2026-05-20 · Status: approved · Owner: Sai Teja Mothukuri

## Goal

Revamp the portfolio (saitejamothukuri.com) with a Windows 95 aesthetic sourced
from the Figma "Windows 95 UI Kit". Build **two independent variants in parallel
git worktrees**, then pick a winner (or ship both).

- **Variant A** — Full Windows 95 desktop OS simulation (draggable windows).
- **Variant B** — Windows 95-themed scrolling layout (sections as window frames).

Both share a common foundation (`win95.css` + assets) built once in Phase 0.

## Hard constraints (apply to BOTH variants)

- **Vanilla only** — HTML + CSS + JS. No React, no Tailwind, no build step, no
  package manager. Site must run by opening `index.html` or `python -m http.server`.
- **Preserve all content** — every section, every project, every link, all copy.
  This is a reskin/restructure, not a content rewrite.
- **Preserve contact form** — the form POSTs JSON `{name,email,subject,message}`
  to `https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact`.
  Keep this fetch logic working (loading/validation/success/error states).
- **Preserve SEO** — keep `<title>`, canonical, JSON-LD (Person + WebSite),
  Open Graph + Twitter meta, `sitemap.xml`, `robots.txt`, favicon.
- **Self-host the theme** — bundle the Win95 webfont + icons + cursors locally;
  do NOT depend on a CDN for the Win95 look (Font Awesome may stay for misc icons).
- **Accessibility floor** — keyboard-navigable, focus states, alt text, semantic
  landmarks where feasible (even in the desktop sim).

## Design system (the Win95 kit, extracted from Figma)

File: `https://www.figma.com/design/0CeknIYfTElGQfiALkaDsH/Windows-95-UI-Kit`

### Color tokens

| Token | Hex | Use |
|---|---|---|
| `--w95-teal` | `#008080` | Desktop background |
| `--w95-silver` | `#C0C0C0` | Window/element body, button face |
| `--w95-navy` | `#000080` | Active titlebar background |
| `--w95-gray-dark` | `#7F7F7F` | Bevel shadow (mid) |
| `--w95-gray-light` | `#DFDFDF` | Bevel highlight (mid) |
| `--w95-white` | `#FFFFFF` | Bevel highlight (outer), input wells |
| `--w95-black` | `#000000` | Bevel shadow (outer), text |
| `--w95-titlebar-inactive` | `#7F7F7F` | Inactive titlebar |

### Bevel system (THE signature look)

Recreate via layered borders/box-shadows. Two primitives:

- **Raised** (buttons, window bodies, taskbar): outer = white top/left + black
  bottom/right; inner = light-gray top/left + dark-gray bottom/right.
  ```
  border: 2px solid;
  border-color: #FFFFFF #000000 #000000 #FFFFFF;
  box-shadow: inset 1px 1px 0 #DFDFDF, inset -1px -1px 0 #7F7F7F;
  ```
- **Sunken** (inputs, content wells, statusbar fields): inverse of raised.
  ```
  border: 2px solid;
  border-color: #7F7F7F #FFFFFF #FFFFFF #7F7F7F;
  box-shadow: inset 1px 1px 0 #000000, inset -1px -1px 0 #DFDFDF;
  ```
- **Pressed button**: swap to sunken + 1px content offset (text nudges down-right).

### Typography

- Self-host a pixel-accurate MS Sans Serif clone (e.g. **W95FA** or
  "Pixelated MS Sans Serif"). Body text 11–12px, titlebars bold 11px.
- Keep JetBrains Mono available for any code/mono snippets if needed.
- Disable font smoothing where possible for crisp pixels.

### Components (available in kit; build as CSS classes)

- **Window frame** — outer raised border, navy titlebar (icon + caption + control
  buttons: minimize `_`, maximize `□`, close `✕`), silver body, optional sunken
  statusbar footer. Inactive state uses gray titlebar.
- **Button** — raised; states Default / Hover / Pressed (sunken) / Focus (dotted
  outline) / Disabled (grayed, embossed text) / Preferred (extra 1px black border).
- **Inputs** — sunken white well; text, textarea, number (with up/down spinners),
  dropdown (select with classic arrow button).
- **Checkbox / Radio** — sunken square / circle indicators, pixel check/dot.
- **Taskbar** — raised bar; Start button (logo + "Start", pressed when menu open);
  task buttons (pressed = focused window); sunken clock tray.
- **Start menu** — raised panel, vertical sidebar banner, menu items w/ icons,
  hover = navy highlight + white text.
- **Menu bar** — File / Edit / View / Help; hover highlight; (Variant B nav).
- **Desktop icon** — 32px icon + label; selected = dotted outline + navy label bg.
- **Icons** — export from kit at 32px (desktop/window) + 16px (titlebar/taskbar/menu):
  My Computer, Internet Explorer, Folder (open/closed), Documents, Programs,
  Settings, HardDrive, Search, Notepad, File(s), Help, Recycle Bin (full/empty),
  Tree, Paint, Start logo. Map to portfolio concepts (see variant specs).
- **Cursors** — Win95 arrow + hourglass (busy).

## Portfolio content inventory (preserve all)

- **Nav/sections:** Home, About, Journey, Work, Visualizations, Skills,
  Certifications, Contact (+ footer).
- **Journey (timeline):** CVS Health (Aug 2025–Present), UCM, Coforge, etc. —
  each w/ logo, role, company, dates, description, achievements.
- **Work (6 projects, GitHub links):** AI RAG Chatbot using AWS; YouTube Content
  Generation Workflow; Employee Retention Analysis; Target Brazil Ecommerce SQL
  Analysis; Cyberbully Detection (Text/Image/Audio); LinkedIn Job Application
  Automation (Make.com + Apify + OpenAI).
- **Visualizations (Tableau Public):** IPL Analysis; Sales Performance.
- **Skills:** logo grid (Python, SQL, PySpark, Airflow, PostgreSQL, R, Informatica,
  Tableau, AWS, etc. — see `assets/images/`).
- **Certifications:** credential cards (PDF/JPG in `docs/Certifications/`).
- **Contact:** form (name/email/subject/message) → AWS endpoint above.
- **Social:** LinkedIn `linkedin.com/in/venkatasaitejam`, GitHub
  `github.com/saiteja007-mv`, Resume (Google Drive).
- **Resume:** Google Drive link + existing modal (`#resume-modal` iframe).

## Execution plan

### Phase 0 — Shared base (sequential, branch `win95-base`)
Built by lead in a worktree outside OneDrive. Deliverables:
1. `assets/win95/fonts/` — self-hosted webfont(s) + `@font-face`.
2. `assets/win95/icons/` — exported PNG icons (32px + 16px).
3. `assets/win95/cursors/` — arrow + hourglass.
4. `assets/css/win95.css` — full component library (tokens, bevels, all
   components above), documented, framework-free.
5. `win95-components.html` — preview page exercising every component (verification).
Commit. This branch is the base for both variants.

### Phase 1 — Variants (parallel, worktrees branched from `win95-base`)
- `C:\Users\saite\pf-worktrees\desktop` → branch `win95-desktop` → Variant A
  (see `2026-05-20-win95-variant-a-desktop.md`).
- `C:\Users\saite\pf-worktrees\themed` → branch `win95-themed` → Variant B
  (see `2026-05-20-win95-variant-b-themed.md`).
Two background agents, one per worktree, build complete working portfolios on top
of `win95.css`.

### Phase 2 — Review & choose
Lead verifies both render, content + form + SEO intact, summarizes diffs, gives
the user preview instructions. User picks winner (or ship B live + A at `/95`).

## Worktree locations (outside OneDrive — avoids sync churn)

```
C:\Users\saite\pf-worktrees\base      (win95-base)
C:\Users\saite\pf-worktrees\desktop   (win95-desktop, from win95-base)
C:\Users\saite\pf-worktrees\themed    (win95-themed, from win95-base)
```

Main repo stays on `main` (live-site checkout undisturbed).
