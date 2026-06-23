# CONTRACT.md — iOS 26 "Liquid Glass" Portfolio (Foundation)

> Source of truth for the Shell, Static-Apps, and Functional-Apps agents.
> Authored by the Foundation agent. Everything below is already wired into
> `index.html`, `tokens.css`, `content.js`, and `apps.config.js`.

**Hard isolation:** all work lives under `IOS - portfolio/`. Never touch repo-root files.

---

## 0. File responsibilities

| File | Owner | State |
|---|---|---|
| `assets/css/tokens.css` | Foundation | DONE — design system (vars + utilities) |
| `assets/js/content.js` | Foundation | DONE — `window.PORTFOLIO` |
| `assets/js/apps.config.js` | Foundation | DONE — `window.APPS` |
| `index.html` | Foundation | DONE — full DOM, all sheets, functional markup |
| `assets/css/shell.css` | **Shell** | placeholder — fill |
| `assets/js/ios.js` | **Shell** | placeholder — implement `window.iOS` + events |
| `assets/css/apps.css` | **Static-Apps** | placeholder — fill |
| `assets/js/render.js` | **Static-Apps** | placeholder — render static sheets from `content.js` |
| `assets/css/{ai-chat,rag,semcache,textsql}.css` | **Functional-Apps** | placeholders — fill |
| `assets/js/apps/{ai-chat,rag,semcache,textsql}.js` | **Functional-Apps** | exist (copies) — rewire WM→events |

---

## 1. CSS custom properties (set in `tokens.css`)

All on `:root` (= dark) and `:root[data-theme="light"]`. **Never hardcode colors** — use these.

### Wallpaper
`--wp-1`, `--wp-2`, `--wp-3`, `--wp-4`

### Backgrounds / text
`--bg-base`, `--bg-elev`,
`--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-accent`

### Accent + system colors
`--accent`, `--accent-press`,
`--sys-red`, `--sys-orange`, `--sys-yellow`, `--sys-green`, `--sys-teal`,
`--sys-blue`, `--sys-indigo`, `--sys-purple`, `--sys-pink`,
`--sys-gray`, `--sys-gray2`, `--sys-gray3`

### Glass materials
`--glass-fill`, `--glass-fill-thick`, `--glass-fill-solid`, `--glass-fill-thick-solid`,
`--glass-border`, `--glass-hairline`, `--glass-highlight`, `--glass-shadow`,
`--glass-blur` (24px), `--glass-sat` (180%)

### Controls / inputs / chips
`--control-fill`, `--control-fill-strong`, `--control-border`, `--chip-fill`

### Per-app icon gradients
`--grad-blue`, `--grad-orange`, `--grad-purple`, `--grad-green`, `--grad-teal`,
`--grad-yellow`, `--grad-indigo`, `--grad-red`, `--grad-gold`, `--grad-gray`,
`--grad-siri`, `--grad-multi`

### Radii
`--r-icon` (22%), `--r-card` (22px), `--r-sheet` (38px), `--r-control` (16px), `--r-pill` (999px)

### Spacing
`--sp-1`..`--sp-10` (4,8,12,16,20,24,32,40 px)

### Type scale
`--fs-largetitle`/`--fw-largetitle` (34/700), `--fs-title2`/`--fw-title2` (22/700),
`--fs-headline`/`--fw-headline` (17/600), `--fs-body`/`--fw-body` (17/400),
`--fs-callout` (16), `--fs-subhead` (15), `--fs-footnote` (13), `--fs-caption` (12)

### Motion
`--spring` (`cubic-bezier(.32,.72,0,1)`), `--t-fast` (180ms), `--t-med` (260ms), `--t-app` (420ms)

### Layout
`--statusbar-h` (44px), `--dock-h` (92px), `--safe-top`, `--safe-bottom`,
`--font-sans`, `--font-mono`

---

## 2. Reusable utility classes (provided by `tokens.css`)

| Class | What it is | Required HTML shape |
|---|---|---|
| `.glass` | Frosted translucent surface (blur + saturate, hairline border, top highlight, shadow). Has `@supports-not` solid fallback. | any block: `<div class="glass">…</div>` |
| `.glass-thick` | Heavier glass fill. | `<div class="glass-thick">…</div>` |
| `.glass--sheen` | Opt-in specular sheen overlay (add alongside `.glass`). | `<div class="glass glass--sheen">…</div>` |
| `.squircle` | Large continuous-ish corner radius + clip. | `<div class="glass squircle">…</div>` |
| `.ios-card` | Card padding + card radius (combine with `.glass`). | `<div class="glass ios-card">…</div>` |
| `.ios-btn` | Glass pill button; `:active` scales 0.96. | `<button class="ios-btn">Label</button>` |
| `.ios-btn--primary` | Accent-filled button. | `<button class="ios-btn ios-btn--primary">Send</button>` |
| `.ios-input` | Glass text field (full width). | `<input class="ios-input">` |
| `.ios-textarea` | Glass multiline field. | `<textarea class="ios-textarea"></textarea>` |
| `.ios-chip` | Static glass tag (skills/tech pills). | `<span class="ios-chip">PyTorch</span>` |
| `.ios-pill` | Interactive pill (clickable). | `<button class="ios-pill">…</button>` |
| `.ios-title` | Large title type (34/700). | `<h1 class="ios-title">…</h1>` |
| `.ios-subtitle` | Subhead/secondary type. | `<p class="ios-subtitle">…</p>` |
| `.ios-divider` | Hairline horizontal rule. | `<hr class="ios-divider">` |
| `.app-icon` | Gradient squircle icon tile (top gloss built in). Default gradient blue. | `<div class="app-icon app-icon--<grad>"><i class="app-icon__glyph fas fa-x"></i></div>` |
| `.app-icon__glyph` | Centered glyph inside `.app-icon`. | the `<i>` above; brand glyphs use `fab`. |
| `.app-icon--<grad>` | Gradient modifier: `blue orange purple green teal yellow indigo red gold gray siri multi`. | combine with `.app-icon`. |

Helpers also present: `.ios-wallpaper` (fixed bg layer, already in `index.html`),
`.ios-animate-in` (entrance, reduced-motion safe), `.visually-hidden`.
`tokens.css` provides keyframes `ios-fade-in`, `ios-rise`, and a global
`prefers-reduced-motion: reduce` block that neutralizes animations/transitions.

---

## 3. `window.iOS` shell API (Shell agent MUST implement in `ios.js`)

```js
window.iOS = {
  openApp(id),                 // open app sheet #app-<id>; play zoom-from-icon; fire ios:appopen
  closeApp(id),                // close sheet; zoom back; fire ios:appclose
  setTheme('dark'|'light'),    // set <html data-theme>, persist localStorage 'ios-theme'
  getTheme(),                  // -> 'dark' | 'light'
  toggleTheme()                // flip + persist + apply
};
```

- Theme persistence key: **`localStorage['ios-theme']`** (also read by the pre-paint
  inline script in `index.html` `<head>`).
- `openApp` for `type:'external'` → `window.open(href,'_blank','noopener')` (no sheet).
  For `type:'pdf'` → open the resume PDF (in-sheet viewer or new tab) using `href`.
  For `type:'static'`/`'functional'` → show `#app-<id>`.
- Other agents MAY call any of these (e.g. Settings/Control Center call `toggleTheme`).

---

## 4. Lifecycle events (Shell dispatches on `document`) — REPLACES `window.WM`

```js
document.dispatchEvent(new CustomEvent('ios:appopen',  { detail: { id } })); // after sheet visible
document.dispatchEvent(new CustomEvent('ios:appclose', { detail: { id } })); // after sheet hidden
```

- Functional apps needing focus/lazy-init on open MUST listen, filtered by id:
  ```js
  document.addEventListener('ios:appopen', function (e) {
    if (e.detail.id === 'askai') { /* focus #ai-chat-input */ }
  });
  ```
- App id mapping for functional sheets:
  `askai` → ai-chat · `hybridrag` → rag · `semcache` → semcache · `textsql` → textsql.
- **No `window.WM`.** The copied app JS still has guarded `if (window.WM && …)` WM-open
  hooks — these are dead no-ops (WM never exists) and do not error. Functional-Apps agent
  should replace those hooks with `ios:appopen` listeners.

---

## 5. DOM structure contract

### App sheet (one per app, already in `index.html`)
```html
<section class="app-sheet" id="app-<id>" data-app="<id>"
         role="dialog" aria-modal="true" aria-labelledby="app-<id>-title" aria-hidden="true">
  <header class="app-sheet__bar">
    <h1 class="app-sheet__title" id="app-<id>-title">Name</h1>
    <button class="app-sheet__close" data-app-close="<id>" aria-label="Close Name">…</button>
  </header>
  <div class="app-sheet__body" data-app-body> … </div>
</section>
```
- `aria-hidden="true"` is the closed state. Shell flips it on open/close.
- `[data-app-close="<id>"]` is the swipe-down/close affordance; Shell wires clicks.
  (Esc / Home-gesture / back-button close are Shell's job too.)

### Static apps (about, projects, messages, journey, skills, achievements, settings)
- `[data-app-body]` is **EMPTY** in `index.html`.
- `render.js` fills `#app-<id> [data-app-body]` from `window.PORTFOLIO` on `DOMContentLoaded`.
- Map:
  - `about` → `PORTFOLIO.identity` + `PORTFOLIO.links`
  - `projects` → `PORTFOLIO.projects[]`
  - `messages` → `PORTFOLIO.contact` (chat thread + form posting to `contact.apiEndpoint`)
  - `journey` → `PORTFOLIO.journey[]`
  - `skills` → `PORTFOLIO.skills[]`
  - `achievements` → `PORTFOLIO.achievements` (paper + certs[])
  - `settings` → theme toggle (call `window.iOS.toggleTheme`), "About this build"
    (credit: **Apple Design Resources iOS 26 UI Kit**), link to classic Win95 portfolio
    (`https://saitejamothukuri.com`).

### Functional apps — FULL markup already in `index.html` with EXACT original ids.
The copied `assets/js/apps/*.js` self-init on `DOMContentLoaded` and bind by
`getElementById`. Each guards on its `*-pane` wrapper (returns early if absent), so the
pane ids below are **mandatory** and already present.

- **askai** (`#app-askai`, body class `ai-chat`):
  `ai-chat-log`, `ai-chat-form`, `ai-chat-input`, `ai-chat-send`, `ai-chat-status`.
  JS additionally creates `#ai-typing`, `.ai-chips`, `.ai-msg__bubble` at runtime.
- **hybridrag** (`#app-hybridrag`): guard `rag-pane`; then
  `rag-file`, `rag-ingest`, `rag-ingest-status`, `rag-q`, `rag-ask`, `rag-status`,
  `rag-answer`, `rag-foot`.
- **semcache** (`#app-semcache`): guard `sc-pane`; then
  `sc-q`, `sc-ask`, `sc-status`, `sc-n`, `sc-hits`, `sc-miss`, `sc-saved`, `sc-log`,
  `sc-foot`, plus `.ai-chip` suggestion buttons (in `#sc-chips`).
- **textsql** (`#app-textsql`): guard `tsql-pane`; then
  `tsql-src-sample`, `tsql-src-csv`, `tsql-src-sql`, `tsql-csv`, `tsql-sqlfile`,
  `tsql-schema`, `tsql-chips`, `tsql-nl`, `tsql-gen`, `tsql-sql`, `tsql-run`,
  `tsql-guard`, `tsql-results`, `tsql-foot`, plus `.ai-chip` buttons (in `#tsql-chips`).

> Confirmed against the copied `*.js` files: ai-chat binds the 5 ids above + creates
> `#ai-typing`/`.ai-chips`/`.ai-msg__bubble`; rag/semcache/textsql each do
> `el.pane = $('<x>-pane'); if (!el.pane) return false;` then bind the listed ids.

### Home screen containers (Shell renders into these — present, empty)
- `#home-grid` (page-1 app grid), `#home-widgets` (page-2 widgets),
  `#dock-grid` (dock), `#home-dots` (page dots), `#spotlight-trigger`.
- `#control-center-panel`, `#app-switcher-rail`, `#spotlight-results`, `#spotlight-input`.

### Status bar / Dynamic Island / clock element ids (Shell updates these)
- `#status-time` (status bar clock), `#lock-time`, `#lock-date` (lock clock/date),
  `#island-text`, `#island-glyph` (Dynamic Island), `#boot-progress` (boot bar),
  `#boot-screen`, `#lock-screen`, `#home`, `#lock-unlock`.

---

## 6. Ordered `<link>` / `<script>` tags in `index.html`

**CSS (in this order):**
1. Google Fonts — Inter (400,500,600,700)
2. Font Awesome 6 CDN
3. `assets/css/tokens.css`
4. `assets/css/shell.css`
5. `assets/css/apps.css`
6. `assets/css/ai-chat.css`
7. `assets/css/rag.css`
8. `assets/css/semcache.css`
9. `assets/css/textsql.css`

**JS (all `defer`, in this order):**
1. `assets/js/content.js`  → `window.PORTFOLIO`
2. `assets/js/apps.config.js` → `window.APPS`
3. `assets/js/ios.js` (shell; defines `window.iOS`, dispatches events)
4. `assets/js/render.js` (static sheet renderer)
5. `assets/js/apps/ai-chat.js`
6. `assets/js/apps/rag.js`
7. `assets/js/apps/semcache.js`
8. `assets/js/apps/textsql.js`

Foundation also created **empty placeholders** for `shell.css`, `apps.css`,
`ai-chat.css`, `rag.css`, `semcache.css`, `textsql.css`, `ios.js`, `render.js` so links
never 404 before other agents fill them. (`content.js`/`apps.config.js` are full;
`apps/*.js` already exist as copies.)

---

## 7. `window.APPS` registry (in `apps.config.js`)

Entry: `{ id, name, glyph, fab, gradient, type, dock, page, href? }`.

| id | name | glyph | fab | gradient | type | dock | page |
|---|---|---|---|---|---|---|---|
| about | About | fa-user | – | blue | static | ✓ | 0 |
| projects | Projects | fa-folder | – | multi | static | ✓ | 0 |
| askai | Ask AI | fa-wand-magic-sparkles | – | siri | functional | ✓ | 0 |
| messages | Messages | fa-comment-dots | – | green | static | ✓ | 0 |
| journey | Journey | fa-briefcase | – | orange | static | – | 1 |
| skills | Skills | fa-layer-group | – | purple | static | – | 1 |
| achievements | Achievements | fa-trophy | – | gold | static | – | 1 |
| hybridrag | Hybrid RAG | fa-magnifying-glass | – | teal | functional | – | 1 |
| semcache | Semantic Cache | fa-bolt | – | yellow | functional | – | 1 |
| textsql | Text-to-SQL | fa-database | – | indigo | functional | – | 1 |
| safari | Resume | fa-compass | – | blue | pdf | – | 1 |
| techrex | TechRex | fa-youtube | ✓ | red | external | – | 1 |
| settings | Settings | fa-gear | – | gray | static | – | 1 |

- `safari.href` = `docs/Sai Teja Mothukuri - AIML Engineer.pdf`
- `techrex.href` = `https://youtube.com/@The_TechRex`
- Home **Page 2** = widgets (clock, "Now @ Honeywell" role, latest project, TechRex
  subscribe), rendered by the Shell into `#home-widgets` — NOT an `APPS` entry.

---

## 8. `window.PORTFOLIO` shape (in `content.js`)

- `identity` { name, tagline, photo, statusLine, availability, bio[3] (HTML) }
- `links` { email, phone, linkedin, github, techrex, techrexSite }
- `projects[5]` { title, badge, desc (HTML), tech[], links[] {label, icon, href} }
- `journey[5]` { role, company, date, logoType('fa'|'img'), logoFa|logoImg|logoAlt|logoBg|logoClass, blurb (HTML), bullets[] (HTML) }
- `skills[6]` { title, faIcon, items[] }
- `achievements` { paper {title, desc, date, href}, certs[5] {name, file, icon} }
- `contact` { email, phone, linkedin, github, techrex, apiEndpoint, intro }
- `resume` { file, title }

**Contact form endpoint (verbatim from original `assets/js/script.js`):**
`https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact` (POST JSON
`{name, email, subject, message}`). Exposed as `PORTFOLIO.contact.apiEndpoint`.

---

## 9. Notes for downstream agents

- Theme is `[data-theme]` on `<html>`; default `dark`; light persisted via `ios-theme`.
- `body { overflow: hidden }` — each screen/sheet manages its own scroll.
- Wrap all non-trivial motion in `@media (prefers-reduced-motion: no-preference)`;
  `tokens.css` already neutralizes transitions/animations under `reduce`.
- Functional sheets must keep the EXACT element ids above — confirmed against the copied
  `apps/*.js`. Restyle freely with iOS utility classes; do not rename ids.
- Graceful degradation: functional apps should show a friendly state if `/api/*` is
  unreachable (e.g. opened via `file://`). The dev server (`dev-server.js`) serves
  `/api/chat|complete|embed` locally.
