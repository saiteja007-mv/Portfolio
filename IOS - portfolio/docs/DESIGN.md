# iOS / iPadOS 26 Portfolio — Design Spec

> Date: 2026-06-21 · Owner: Sai Teja Mothukuri · Status: **awaiting approval**

## 1. Overview

A second, standalone portfolio that re-skins the existing content into an **iOS 26 / iPadOS 26 "Liquid Glass"** operating-system simulation — the same interactive-OS idea as the shipped Windows 95 portfolio, but as an iPhone/iPad interface. Boot → Lock screen → Home screen with app icons → tap an app → portfolio section opens. Responsive: iPhone layout on narrow screens, iPadOS layout on wide screens. One codebase.

**Source of the "design":** the linked Figma file `zpPTv9MSTxRfsOOVgjYq4N` is Apple's official *iOS and iPadOS 26 UI Kit* and the user's copy contains only the **Cover** page — no portfolio screens. So this is "build the portfolio in the iOS 26 design language," not "translate fixed frames." Liquid Glass = translucent frosted materials, squircle icons, depth/blur, rounded forms, specular highlights, spring motion.

## 2. Goals

- Convincing iOS 26 OS simulation: lock screen, home screen, app open/close, Control Center, app switcher, Dynamic Island, Spotlight, widgets.
- **Reuse current live content verbatim** (identity, 5 projects, journey, skills, achievements, contact).
- **Port all 4 interactive AI apps as fully-functional native iOS apps** (Ask AI, Hybrid RAG, Semantic Cache, Text-to-SQL).
- Responsive iPhone ↔ iPad from a single build.
- Dark mode default with a working light toggle.
- Accessible (keyboard, screen-reader, reduced motion) and performant.

## 3. Non-goals / constraints

- **Do NOT modify the original portfolio.** All new work lives under `IOS - portfolio/`. The new folder is self-contained (its own copies of images + api/lib) and independently deployable. Nothing references `../`.
- Vanilla **HTML / CSS / JS only** — no frameworks, no build step (matches project rules + existing style).
- Not deployed as part of this task — local build for later use.
- SF Symbols are not licensable for the web → use Font Awesome (already a CDN dep) inside custom squircle icon tiles.

## 4. Locked decisions

| Decision | Choice |
|---|---|
| Interface metaphor | Responsive — iPhone (narrow) + iPadOS (wide), one codebase |
| OS-sim fidelity | Full: lock screen, Dynamic Island, home, Control Center, app switcher, animations |
| Content | Reuse current live content as-is |
| AI apps | Port all 4 functional (reuse existing JS + proxy) |
| Appearance | Dark default; light toggle (persisted) |
| Folder | `IOS - portfolio/` (subfolder of current dir; isolated, self-contained) |

## 5. Architecture

Plain ES (IIFE/module) modules, no framework. A small **OS shell** orchestrates screens via a state machine; each portfolio section is an **app** described by a declarative registry.

```
OS state machine:  boot → lock → home ⇄ app-open ⇄ app-switcher
                                  home → control-center (overlay)
                                  home → spotlight (overlay)
```

- **`ios.js` (shell):** clock ticker, status bar, Dynamic Island controller, lock→home unlock, home paging + dots, Spotlight, Control Center, app switcher, app open/close animations, theme (dark/light) persistence in `localStorage`, hash-routing (`#about`, `#projects`, …) for deep links + back-button, focus management, `prefers-reduced-motion` gating.
- **App registry** (`apps.config.js` or inline): `{ id, name, icon(glyph+gradient), dock?, page, render() | mount() }`. Static apps render HTML from content data; functional apps mount existing logic.
- **Content data** (`content.js`): single source of the ported content (identity, projects[], journey[], skills[], achievements[], contact) so static apps are data-driven and easy to update.
- **Functional apps** (`js/apps/*.js`): the existing `ai-chat.js`, `rag.js`, `semcache.js`, `textsql.js` adapted — same core logic, rebound to iOS DOM ids, restyled output.
- **Backend** (`api/` + `lib/` + `dev-server.js`): copied from the original so the 4 apps work locally (`node dev-server.js`) and when deployed (Vercel serverless `/api/chat`, `/api/complete`, `/api/embed`). Requires `OPENROUTER_API_KEY` (and whatever the originals use) in the environment — same as the live site.

### Units (single-purpose, independently understandable)
1. `shell` — owns screen state + transitions. In: user gestures/clicks/keys. Out: screen changes.
2. `iconGrid` — renders home pages + dock from registry. In: registry. Out: "open app X".
3. `appHost` — opens/closes an app container with animation; mounts the app's render/mount. In: app id. Out: lifecycle calls.
4. `controlCenter` — glass tiles (theme, links, TechRex). In: shell state. Out: theme/link actions.
5. `dynamicIsland` — pill states (idle role text, app-context, "now playing"). In: shell events.
6. `glass` (CSS layer) — the Liquid Glass material/token system; consumed by everything.
7. functional app modules — each self-contained, mount(rootEl).

## 6. Screen specs

- **Boot (brief):** black → Apple-style logo / name wordmark with subtle progress, ~1.2s (skippable, skipped if reduced-motion). Replaces the Win95 power-on. Lightweight.
- **Lock screen:** gradient-mesh wallpaper; large live **clock** + date; a **notification stack** of glass cards ("Sai Teja — Open to AI/ML opportunities", "3 live AI apps installed — tap to explore", "TechRex posted a new video"); bottom: flashlight + camera affordances (decorative) and a "swipe up to open" hint. Tap/swipe-up/Enter → unlock to home. Dynamic Island visible.
- **Home screen (iPhone):** 4-column squircle app grid, paged (Page 1 apps, Page 2 widgets), page dots, persistent **dock** (4: About, Projects, Ask AI, Messages). Pull-down → Spotlight. Swipe down from top-right → Control Center.
- **Home screen (iPad, ≥1024px):** roomier 6-col grid + a right-hand **widget column** always visible (clock, "Now @ Honeywell", latest project, TechRex). Larger dock. Inside apps, multi-column layouts.
- **App container:** full-screen glass sheet that **zooms in from its icon** (spring). Top: app title + Dynamic Island; **swipe-down / Home gesture / Esc / back button** closes (zoom back to icon). Scrollable body.
- **Control Center:** swipe/click from top-right → frosted overlay with glass tiles: **Dark/Light toggle**, brightness slider (decorative), connectivity tiles linking to LinkedIn/GitHub/Email, a "now playing" TechRex tile (links to channel), resume quick action.
- **App switcher:** Home-gesture-hold / dedicated control → horizontally scrollable **cards** of opened apps; tap to reopen, swipe up on a card to close.
- **Spotlight:** pull-down search field that filters apps + project names; Enter opens top hit.
- **Dynamic Island:** idle = "AI/ML Engineer @ Honeywell"; on app open = app name + glyph; tappable to expand a small status.

## 7. App → content mapping (content ported verbatim)

Dock: **About · Projects · Ask AI · Messages**. Page-1 grid adds: Journey, Skills, Achievements, Hybrid RAG, Semantic Cache, Text-to-SQL, Safari (Resume), TechRex, Settings.

| App | Icon (glyph / gradient) | Content (from live site) |
|---|---|---|
| **About** | user / blue | Photo (`Profile photo no bg.png`), "Sai Teja Mothukuri", "AI/ML Engineer · Deep Learning · Generative AI · MLOps", 3-paragraph bio (verbatim), M.S. CS UCM 2025, AI/ML Engineer @ Honeywell, TechRex; buttons: Email, LinkedIn, GitHub, TechRex. Status: "AI/ML Engineer · 3+ years · Available". |
| **Projects** | folder / multicolor | 5 cards verbatim: Hybrid Search RAG; Text-to-SQL with Guardrails; Semantic Cache for LLMs; Multi-Modal Cyberbullying Detection; Traffic-Flow Prediction — each with desc, tech chips, and the same Live/GitHub/Paper links. |
| **Journey** | clock or briefcase / orange | 5 entries verbatim w/ logos: TechRex (Present); Honeywell AI/ML Engineer (Aug 2025–Present, Richmond VA); UCM M.S. CS (2024–2025); Accenture ML Scientist (Sep 2021–Dec 2023, India); SRKR B.Tech IT (2019–2023). Bullets as-is. |
| **Skills** | grid / purple | 6 domains verbatim: ML/Deep Learning; Generative AI/LLM; NLP/CV/Speech; Data & Distributed; Cloud & MLOps; Languages — chips as-is, as glass pills. |
| **Achievements** | trophy / gold | JETIR published paper (2023) + link. Plus certificate PDFs from `docs/Certifications/` (Accenture, DataBricks, Microsoft PowerBI, NPTEL, Udemy) shown as Wallet-style cards opening the PDF. |
| **Messages** | message / green | Contact as a chat thread: email `contact@saitejamothukuri.com`, phone `913-263-4856`, socials; the contact **form** (name/email/subject/message) posting to the same API Gateway endpoint as the live site, styled as an iMessage composer. |
| **Ask AI** | sparkles / siri-gradient | Functional chatbot → `/api/chat`. RAG over profile. |
| **Hybrid RAG** | magnifier / teal | Functional → ingest PDF/MD/TXT (pdf.js), BM25+dense RRF retrieval, cited answer via `/api/embed`+`/api/complete`. |
| **Semantic Cache** | bolt / yellow | Functional → `/api/embed`; cosine≥0.85 cache; live hit/miss/saved stats. |
| **Text-to-SQL** | database / indigo | Functional → `/api/complete`; JS guardrail; in-browser SQLite (sql.js); Sample DB / CSV / .sql sources. |
| **Safari** | compass / blue | Opens Resume PDF (in-app sheet or new tab). |
| **TechRex** | play / red | External → `https://youtube.com/@The_TechRex`. |
| **Settings** | gear / gray | Dark/Light, "About this build" (credits: Apple Design Resources iOS 26 UI Kit), link back to the classic Win95 portfolio. |

> Contact form + the 4 AI apps reuse the **same backends** as the live site (`/api/chat|complete|embed`, contact API Gateway). No new backend logic invented.

## 8. Functional-app port plan

Reuse the existing module logic with minimal change; isolate DOM coupling:

- Each existing module is an IIFE bound to fixed element ids. Port = copy the algorithmic core (embedding calls, BM25/RRF, cosine cache+LRU, sqlglot-style JS guardrail, pdf.js/sql.js loaders, `/api/*` fetches) **unchanged**, and swap the DOM-binding layer to the iOS app's element ids; restyle results with Liquid Glass classes.
- `ai-chat.js` → `/api/chat`; `rag.js` → `/api/embed` + `/api/complete` (+ pdf.js CDN); `semcache.js` → `/api/embed`+`/api/complete`; `textsql.js` → `/api/complete` (+ sql.js CDN).
- Copy `api/chat.js`, `api/complete.js`, `api/embed.js`, `lib/`, and a folder-scoped `dev-server.js` so the app is runnable + deployable standalone.
- Graceful degradation: if `/api/*` is unreachable (e.g. opened via `file://`), apps show a friendly "run the dev server / deploy to enable live AI" state instead of erroring.

## 9. Visual design system (Liquid Glass tokens)

- **Materials:** `backdrop-filter: blur(24px) saturate(180%)`; translucent fills (`rgba(255,255,255,.12)` dark / `rgba(255,255,255,.6)` light); 1px hairline border `rgba(255,255,255,.18)`; inner top highlight + soft drop shadow; optional specular sheen gradient. Fallback solid fills where `backdrop-filter` unsupported.
- **Radii (squircle):** icons ~22% of size; sheets/cards 28–40px; pills full. Approximate iOS continuous corners with large radii (optional SVG squircle mask for icons).
- **Color:** iOS system. Dark: bg gradient mesh teal→blue→indigo (echoes UI-kit cover), text `#fff`/`rgba(235,235,245,.6)`, accent `#0A84FF`. Light: bright glass, text `#000`, accent `#007AFF`. System grays as CSS vars. Per-app icon gradients.
- **Type:** `-apple-system, "SF Pro Display","SF Pro Text", system-ui, "Inter", sans-serif` (native SF on Apple; Inter fallback — keep the existing Inter link). iOS sizes/weights (large titles 34/700, headline 17/600, body 17/400, caption 13).
- **Motion:** spring `cubic-bezier(.32,.72,0,1)`, 350–500ms for app open/close; micro-interactions 150–250ms. All gated by `prefers-reduced-motion: reduce` (cross-fade/instant fallback).
- **Iconography:** Font Awesome glyph centered on a gradient squircle tile with subtle gloss; consistent grid sizing.

## 10. Responsive strategy

- `<768px` → **iPhone**: 4-col grid, dock 4, single-column app bodies, optional device-frame off (full-bleed).
- `768–1023px` → large phone / small tablet: 5-col, wider sheets.
- `≥1024px` → **iPadOS**: 6-col grid + persistent widget column, larger dock, 2-col app bodies where it helps (e.g. Projects, About). 
- Touch + mouse + keyboard all supported; gestures have click/keyboard equivalents.

## 11. File structure

```
IOS - portfolio/
  index.html
  README.md
  dev-server.js                  # folder-scoped local server (serves /api + static)
  api/        chat.js  complete.js  embed.js     # copied from original
  lib/        <shared proxy helpers>             # copied from original
  assets/
    css/  ios.css                # tokens + components + screens (may split: tokens.css, shell.css, apps.css)
    js/   ios.js                 # OS shell
          content.js             # ported content data
          apps.config.js         # app registry
          apps/ ai-chat.js rag.js semcache.js textsql.js   # adapted functional apps
    images/  <copies of needed images>          # profile, org logos, certs thumbs
  docs/  DESIGN.md  (this file)  README/notes
```

## 12. Assets to copy (into `IOS - portfolio/assets/images/`)

`Profile photo no bg.png`, `UCM Logo.png`, `Accenture-Logo.png`, `SRKR Logo.png`, `TechRex_logo.png`, plus a favicon/app-icon. Resume PDF + `docs/Certifications/*` referenced for Safari/Achievements (copied into the new `docs/`). No file references the original tree.

## 13. Accessibility

- All gestures have keyboard equivalents (Tab/Enter/Esc/arrows); visible focus rings.
- Apps are dialogs with proper roles/labels/`aria-modal`; focus trapped while open, returned to icon on close.
- `prefers-reduced-motion` disables zoom/parallax.
- Color contrast checked in both themes; status bar + text meet WCAG AA on the glass.
- Live regions for chat/app status.

## 14. Build phases (for the implementation plan)

1. **Scaffold + assets:** folder, copy images/api/lib/dev-server, README, base `index.html`, design-token CSS, theme toggle.
2. **Glass design system:** materials, squircle icons, type, motion utilities; demo page.
3. **OS shell:** status bar + clock, Dynamic Island, lock screen + unlock, home grid + dock + paging + dots.
4. **App host + animations:** open/close zoom, focus mgmt, hash routing, back button.
5. **Static apps:** About, Projects, Journey, Skills, Achievements, Settings, Safari, TechRex (data-driven from `content.js`).
6. **Messages (contact):** chat-style + working form → existing API Gateway.
7. **Functional AI apps:** port ai-chat, rag, semcache, textsql; degrade gracefully w/o backend.
8. **Control Center + App switcher + Spotlight + Widgets.**
9. **Responsive iPad layout + widget column.**
10. **Polish, a11y pass, cross-browser, perf; verification.**

## 15. Success criteria / verification

- Loads with no console errors; dark default; light toggle persists across reload.
- Lock → unlock → open every app → close works via mouse, touch, and keyboard.
- All ported content matches the live site (spot-check each section).
- The 4 AI apps run end-to-end against `node dev-server.js` (with `OPENROUTER_API_KEY` set); contact form posts successfully.
- Responsive: iPhone grid <768px, iPad grid + widgets ≥1024px.
- `prefers-reduced-motion` honored. Lighthouse a11y ≥ 90.
- Original portfolio files unchanged (git status shows only `IOS - portfolio/` additions).

## 16. Open questions / future

- Exact widget set on Page 2 / iPad column (clock, role, latest project, TechRex assumed).
- Whether to embed cert PDFs inline (Safari sheet) vs open new tab.
- Future: upgrade boot/lock with more SF polish; add a "Photos" app gallery of project screenshots.
