# Variant A — Desktop Tweaks Spec (5 features)

> Worktree: `C:\Users\saite\...\Portfolio\.claude\worktrees\desktop` · Branch: `win95-desktop`
> Files to edit: `index.html`, `assets/css/desktop.css`, `assets/js/win95-desktop.js`.
> Vanilla HTML/CSS/JS only. Preserve all content, the contact-form AWS fetch, SEO/JSON-LD.
> Commit messages must NOT include a Co-Authored-By trailer.

## Existing architecture (reuse it — do not rewrite)
- **Window manager** `window.WM` in `win95-desktop.js`: `WM.open(id)`, `close`, `minimize`,
  `toggleMax`, `focus`. State registry `windows[id] = {el,x,y,w,h,minimized,maximized,prevRect,taskBtn}`.
  `getDefaultRect(winId)` has a `SIZE_OVERRIDE` map. `iconMap`/`labelMap` map window id → icon class / taskbar label.
- **Windows** are `<article id="win-X" class="w95-window desk-window" role="dialog" style="display:none">`
  with `<header class="w95-titlebar" data-win="win-X">` (icon + caption + min/max/close `w95-ctrl` buttons
  calling `WM.minimize/toggleMax/close`) and a `<div class="w95-window__body win-body">`.
- Existing windows: win-about, win-work, win-journey, win-viz, win-skills, win-certs, win-contact,
  win-resume, win-recycle, win-display. Desktop = `#desktop`; icons in `#desktop-icons.desktop-icon-grid`
  as `<button class="w95-deskicon" data-win="..." ondblclick="WM.open('...')">`. Taskbar `#taskbar`,
  Start menu `#startmenu`, clock, power-on intro `#power-screen`.
- Components in `assets/css/win95.css`: `.w95-window`, `.w95-titlebar(.is-inactive)`, `.w95-ctrl`,
  `.w95-btn`, `.w95-menubar(__item)`, `.w95-ico--* .w95-ico-16/32`, `.w95-statusfield`, `.w95-sunken`.
  Variant layout lives in `desktop.css` (extend there, never edit win95.css).

---

## Feature 1 — Draggable desktop icons (persist positions)
- Make `.w95-deskicon` draggable: switch `.desktop-icon-grid` to free positioning (absolute icons
  inside `#desktop`). Default layout = current top-left column (compute initial x/y).
- Pointer drag (mouse + touch) repositions an icon; clamp within the desktop area.
- **Drag vs click threshold:** only treat as a drag if pointer moves > 5px; otherwise it's a
  click/dblclick (keep existing single-click select + double-click open). Don't open a window at drag end.
- Persist `{ winId: {x,y} }` to `localStorage` key `w95.iconPos`; restore on load.
- Keyboard/focus behavior unchanged. Mobile (≤700px): keep the simple wrap layout, dragging optional.

## Feature 2 — Resizable windows
- Add a resize grip (bottom-right corner) to every `.desk-window` (append via JS or markup).
  Optionally edge handles too; corner is the minimum.
- Drag the grip resizes the window: update `windows[id].w/h` + element `width/height`. Clamp to
  min 300×200 and to viewport. Disable while `maximized` and on mobile (≤700px, windows are full-screen).
- Resizing must not trigger drag-move or focus loss. Keep `.win-body` scroll working.

## Feature 3 — Internet Explorer window (shared) + link interception
Build a reusable IE browser window and route links through it.
- **Window** `#win-ie` (a `.desk-window`) styled as Internet Explorer:
  - Titlebar: IE icon (`w95-ico--internet`) + caption (page title) + min/max/close.
  - Menu bar (`w95-menubar`): File Edit View Favorites Tools Help (decorative).
  - Toolbar: Back, Forward, Stop, Refresh, Home buttons (Back/Forward navigate IE history;
    Refresh reloads; others can be inert) + an **Address** bar (text input showing the URL) + Go.
  - Content: an `<iframe id="ie-frame">` filling the body, plus a hidden "cannot display" panel.
- **API** `window.openIE(url, title)`: opens/focuses `#win-ie`, sets address bar + caption, loads url.
  Maintain a simple history array for Back/Forward. Register win-ie in iconMap (`w95-ico--internet`)
  and labelMap ("Internet Explorer").
- **Framable vs not:**
  - Framable (set `iframe.src`): relative/local paths (`docs/...`, `assets/...`), same-origin,
    `drive.google.com/.../preview`, `public.tableau.com` embeds.
  - Not framable (most absolute external: linkedin, github, youtube, x/twitter, jetir, etc.):
    show the authentic **"This page cannot be displayed"** panel (classic IE styling) with the URL
    and an **"Open in a new tab"** button (`window.open(url, '_blank')`). Do NOT iframe these.
  - Decide via a small helper `isFramable(url)` (relative URL, or host in an allowlist). Default
    external → not framable.
- **Link interception:** one delegated `click` handler on `document` — if the clicked anchor has
  `target="_blank"` (or is external http(s)), `preventDefault()` and call `openIE(href, text)`.
  This covers all existing links (GitHub, LinkedIn, Tableau, YouTube, JETIR, cert files, project md).
  Internal `WM`/desktop buttons are unaffected (they aren't anchors with target=_blank).

## Feature 4 — Resume → local PDF in IE window
- The real resume file is **`docs/Sai Teja Mothukuri - Resume.pdf`** (URL-encode the spaces).
- Resume desktop icon (`data-win="win-resume"`) + the Start-menu "Resume.pdf" item should open the
  PDF in an IE window: `openIE('docs/Sai%20Teja%20Mothukuri%20-%20Resume.pdf', 'Resume — Sai Teja Mothukuri')`.
  (Local PDF iframes fine, so it renders inside IE.)
- **Remove** the old `win-resume` window's Google Drive `<a href="https://drive.google.com/...">` link
  AND the Drive `<iframe src=".../preview">`. You may delete the `win-resume` article entirely and
  repoint the icon/start-menu to `openIE(...)`, OR keep `win-resume` but swap its iframe to the local
  PDF and drop the Drive link. Simplest: repoint to `openIE` and remove `win-resume`. Update `iconMap`/
  `labelMap`/`SIZE_OVERRIDE` accordingly if you remove it.

## Feature 5 — File Explorer (My Computer → Disk (C:) → folders → files)
- New window `#win-explorer` styled as Win95 Explorer:
  - Titlebar: hard-drive icon (`w95-ico--hard-drive`) + caption reflecting current path
    ("My Computer", "C:\\", "C:\\Certificates", …) + min/max/close.
  - Menu bar (decorative) + toolbar with **Up** and **Back** buttons + an Address bar showing the path.
  - Content: icon view of the current folder's entries (folders first, then files), each a
    double-clickable tile (icon + name). Optional left tree pane (bonus).
  - Status bar: "N object(s)".
- **Virtual filesystem** (JS data object). Disk **C:** contains folders:
  - **Certificates** → files (open via IE window, local paths):
    - `docs/Certifications/Microsoft PowerBI - Data Analysis Associate.pdf`
    - `docs/Certifications/DataBricks Data Analysis.pdf`
    - `docs/Certifications/Accenture Data Analysis Simulation.pdf`
    - `docs/Certifications/Udemy Data Analyst Bootcamp.pdf`
    - `docs/Certifications/NPTEL_data analytics with python.jpg`
    - `docs/Certifications/Udemy Data Analyst Bootcamp.jpg`
  - **Resume** → `docs/Sai Teja Mothukuri - Resume.pdf`
  - **Research Papers** → "Cyberbullying Detection (JETIR)" → external link
    `https://www.jetir.org/view?paper=JETIR2304580` (opens in IE → "cannot display" + open-external).
  - **Projects** → `docs/AI_RagChatbot_using_AWS.md`, `docs/Youtube_content_generation_workflow.md`
    (open in IE; md renders as text — fine).
  - (URL-encode spaces in all local paths.)
- Navigation: double-click folder → into it (update content + address + title); **Up**/**Back** navigate.
  Double-click file → `openIE(path, name)`.
- Entry points: a desktop icon **"My Computer"** (hard-drive icon) + a Start-menu **"My Computer"** item
  (open `win-explorer` at root). Use file/folder icons: folders `w95-ico--folder`, PDFs `w95-ico--file`,
  images `w95-ico--paint` or `w95-ico--file`, links `w95-ico--internet`.

> Note: the existing "About Me" icon uses the my-computer icon; for the explorer entry use the
> **hard-drive** icon and label "My Computer" to avoid confusion (or pick a distinct name like "My PC").

## Verify (functional; gstack browse binary is shared — prefer non-browser checks)
- `node --check assets/js/win95-desktop.js`.
- Serve `python -m http.server 8096`; `curl` index + assets → 200; resume PDF + a cert PDF → 200.
- No console errors. All original content preserved; contact form endpoint intact; SEO intact.

## Commit (no push, no co-author trailer)
`git -C "<worktree>" add -A && git -C "<worktree>" commit -m "Desktop tweaks: draggable icons, resizable windows, IE browser window, local resume PDF, file explorer"`
