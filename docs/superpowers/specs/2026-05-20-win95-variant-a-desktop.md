# Variant A — Windows 95 Desktop OS Simulation

> Read `2026-05-20-win95-revamp-design.md` first (shared system + hard constraints).
> Worktree: `C:\Users\saite\pf-worktrees\desktop` · Branch: `win95-desktop` (from `win95-base`).

## Concept

The portfolio **is** a bootable Windows 95 desktop. Visitors land on a teal
desktop with icons; each portfolio section opens in a real, draggable window.
A taskbar with a working Start menu and live clock anchors the bottom.

## Layout & behavior

### Boot (optional, keep < 2s, skippable)
- Brief black "boot" or Win95 splash → fade to desktop. Honor
  `prefers-reduced-motion` (skip animation). Don't block content/SEO: the
  full DOM is present; boot is a CSS/JS overlay only.

### Desktop
- Full-viewport teal (`--w95-teal`) surface.
- Desktop icons (top-left column), 32px icon + label each:
  - **About Me** (My Computer) → About window
  - **My Work** (Folder) → Work window (project list)
  - **Journey** (Tree/Documents) → Journey window
  - **Visualizations** (Paint/Chart) → Visualizations window
  - **Skills** (Programs) → Skills window
  - **Certifications** (Help/Award) → Certifications window
  - **Contact** (Mail/Notepad) → Contact window
  - **Resume.pdf** (File) → opens resume modal/window (Google Drive iframe)
  - **Recycle Bin** (decorative, bottom)
- Single-click selects (dotted outline); double-click opens. On touch, single tap opens.
- Optional: a "welcome" window auto-opens on load (Home/hero content + intro).

### Window manager (vanilla JS, the core lift)
- Each section = a window: titlebar (16px icon + caption + min/max/close),
  raised frame, scrollable body, optional statusbar.
- **Drag** by titlebar (pointer events; clamp to viewport; no drag on controls).
- **Focus**: clicking a window raises it (z-index stack) + activates titlebar
  (navy); others go inactive (gray).
- **Minimize**: hide window, keep taskbar button (restore on click).
- **Maximize/restore**: toggle full-workspace (above taskbar) ↔ prior rect.
- **Close**: hide window, remove taskbar button.
- Open windows cascade (offset each new one). Remember nothing across reloads
  (keep it simple) — but a sensible default open state is fine.
- Keyboard: Esc closes focused window; Tab cycles controls within; icons
  focusable + Enter opens. Provide a visible focus ring.

### Taskbar (bottom, always on top)
- **Start button** (logo + "Start"); toggles Start menu; pressed-state while open.
- **Task buttons**: one per open window; pressed = focused; click to focus/restore
  or minimize if already focused.
- **Clock tray** (sunken): live `HH:MM AM/PM`, updates each minute.

### Start menu
- Raised panel above Start button with vertical "Sai Teja 95" sidebar banner.
- Items (icon + label) launch each window: About, Work, Journey, Visualizations,
  Skills, Certifications, Contact. Plus: **Resume**, and a divider, then external
  shortcuts (open new tab): LinkedIn, GitHub. Optional "Shut Down…" easter egg
  (fun dialog; no real action).
- Hover = navy highlight + white text. Click-outside closes.

## Section → window content mapping
Pull the real content from the current `index.html` (in this worktree). Reflow it
into window bodies; keep all copy, links, images, achievements, project cards,
Tableau links, skill logos, cert cards. Style inner controls with `win95.css`
(buttons, sunken inputs). The contact window form keeps the AWS fetch intact.

- **Work window** — render as a Win95 file/list view (folder of "project" items)
  OR cards inside the window; each project keeps its GitHub link + description +
  tech tags + writeup links (RAG chatbot, YouTube workflow docs).
- **Skills window** — desktop-icon-style grid of skill logos (or list view).
- **Visualizations window** — keep Tableau links/embeds; "open in new window".
- **Contact window** — form with sunken inputs + raised Send button; preserve
  loading/validation/success/error + endpoint.

## Files (in this worktree)
- `index.html` — desktop shell: `<head>` (preserve SEO/JSON-LD/meta), boot overlay,
  desktop + icons, hidden window templates (or build from JS), taskbar, start menu.
  All section content lives in the DOM (SEO) inside window containers.
- `assets/css/win95.css` — shared (from base; do not fork — extend via a separate
  `desktop.css` if needed).
- `assets/css/desktop.css` — variant-A-only layout (desktop, taskbar, window mgr
  visuals, start menu).
- `assets/js/win95-desktop.js` — window manager, icons, taskbar, start menu, clock.
- Keep `assets/js/script.js` only for what's still needed (contact form fetch,
  resume modal); prune dead effects (cursor follower, parallax, typing) if they
  conflict — note removals.
- Preserve `assets/images/`, `assets/win95/`, `sitemap.xml`, `robots.txt`, favicon.

## Success criteria
1. Loads to a teal desktop with icons + taskbar; no console errors.
2. Double-click each icon opens a draggable window with that section's real content.
3. Drag, focus/raise, minimize, maximize/restore, close all work.
4. Taskbar reflects open/focused windows; Start menu launches sections; clock ticks.
5. Contact form still submits to the AWS endpoint with working states.
6. All original content present (projects, links, journey, skills, certs).
7. SEO/meta/JSON-LD preserved; favicon loads.
8. Responsive/touch: on small screens, windows open maximized (mobile-friendly
   fallback) and icons/taskbar remain usable.
9. Runs via `python -m http.server` with no build step.

## Out of scope
Multi-window persistence across reloads, real file system, window resize handles
(nice-to-have, only if cheap), sound. Keep YAGNI.
