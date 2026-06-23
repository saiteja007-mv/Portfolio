# iOS / iPadOS 26 Portfolio

A standalone, **iOS 26 "Liquid Glass"** OS-simulation version of Sai Teja Mothukuri's portfolio. Boot → Lock screen → Home screen with app icons → tap an app → portfolio section. Responsive: **iPhone** layout on narrow screens, **iPadOS** layout (grid + persistent widget column) on wide screens. Dark default with a light toggle.

> This is a **separate** build for later use. The original portfolio at the repo root is untouched. Everything here is self-contained — its own copies of images, the `/api` proxy, and `dev-server.js`.

## Run locally

```powershell
cd "IOS - portfolio"
# Optional: enable the live AI apps (Ask AI, Hybrid RAG, Semantic Cache, Text-to-SQL)
$env:OPENROUTER_API_KEY = "your-key"      # or put it in IOS - portfolio/.env
node dev-server.js
# open http://localhost:8099
```

Without a key the shell + all static apps work fully; the 4 AI apps render their UI and degrade gracefully (Text-to-SQL still runs SQLite client-side; Ask AI shows its seeded greeting). Set the key to make the LLM calls live.

## What's inside

| Area | Files |
|---|---|
| OS shell (lock, home, dock, Control Center, app switcher, Spotlight, Dynamic Island, animations, theme) | `assets/js/ios.js`, `assets/css/shell.css` |
| Liquid Glass design system (tokens, glass/squircle utilities, dark+light) | `assets/css/tokens.css` |
| Content data (ported verbatim from the live site) | `assets/js/content.js` |
| App registry | `assets/js/apps.config.js` |
| Static app rendering (About, Projects, Journey, Skills, Achievements, Messages/contact, Settings) | `assets/js/render.js`, `assets/css/apps.css` |
| Functional AI apps (reuse original logic, rebound to iOS) | `assets/js/apps/{ai-chat,rag,semcache,textsql}.js` + matching `assets/css/*.css` |
| Serverless proxy (LLM/embeddings) + local server | `api/{chat,complete,embed}.js`, `lib/`, `dev-server.js` |
| Spec + interface contract | `docs/DESIGN.md`, `docs/CONTRACT.md` |

## Apps

Dock: **About · Projects · Ask AI · Messages**. Home grid: Journey · Skills · Achievements · Hybrid RAG · Semantic Cache · Text-to-SQL · Resume (Safari) · TechRex · Settings. Page 2 / iPad column: widgets.

## Deploy

Drop-in for Vercel (or any host with the `/api/*` serverless functions). Set `OPENROUTER_API_KEY` (and any contact-form env) in the host environment — same backend contract as the live site. The contact form posts to the same AWS API Gateway endpoint as the original.

## Credits

Design language based on **Apple Design Resources — iOS & iPadOS 26 UI Kit** ("Liquid Glass"). Vanilla HTML/CSS/JS, no frameworks, no build step.
