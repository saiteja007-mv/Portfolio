# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Venkata Sai Teja Mothukuri (Data Analyst). A single-page static site with no build tools, no frameworks, and no package manager. Live at **saitejamothukuri.com**.

## Architecture

**Single-page app with three source files:**
- `index.html` (878 lines) — All HTML content: nav, hero, about, journey, work, visualizations, skills, certifications, contact form, footer. Heavy use of inline styles alongside class-based styling.
- `assets/css/styles.css` (3116 lines) — All styling. Uses CSS custom properties (`:root` vars) for theming: `--primary: #6366f1`, dark background palette (`--bg-primary: #0a0a1e`). Responsive via media queries.
- `assets/js/script.js` (1053 lines) — Vanilla JS: cursor follower, mobile menu, smooth scroll, IntersectionObserver animations, parallax, typing effect, contact form submission.

**Contact form backend (not in this repo):**
- Form POSTs to AWS API Gateway → Lambda (Node.js 22) → SES
- API endpoint: `https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact`
- `ses_html.html` is the SES email template (uses `${escapeHtml(...)}` template literals)

**Hosting:** Vercel (auto-deploys from GitHub). Custom domain: saitejamothukuri.com.

## Development

No build step. Open `index.html` in a browser or use any local server:
```bash
python -m http.server 8000
# or
npx serve .
```

## Key Conventions

- **No frameworks** — vanilla HTML/CSS/JS only. Do not introduce React, Tailwind, etc.
- **Single HTML file** — all page sections live in `index.html`. No routing.
- **CSS custom properties** — use existing `:root` variables for colors/gradients rather than hardcoding values.
- **Font Awesome 6** — icons loaded via CDN (`cdnjs.cloudflare.com`). Use `<i class="fas fa-*">` / `<i class="fab fa-*">` pattern.
- **Google Fonts** — Inter (UI text) and JetBrains Mono (code).
- **Image assets** — `assets/images/` contains logos (PNG/SVG) and profile photos. File names have spaces (e.g., `UCM Logo.png`).
- **Inline styles** — some sections use inline `style` attributes alongside CSS classes. This is intentional for one-off overrides.

## Page Sections (in order)

home → about → journey (timeline) → work (project cards) → visualizations (dashboard embeds) → skills (logo grid) → certifications → contact → footer

## Contact Form Integration

The form in `#contact` posts JSON `{name, email, subject, message}` to the API Gateway endpoint. The JS handles loading states, validation, error display, and success feedback. The Lambda function uses the HTML template from `ses_html.html` to format emails sent via SES.

## SEO & Deployment

- `sitemap.xml` and `robots.txt` are configured for saitejamothukuri.com
- JSON-LD structured data (Person + WebSite schemas) embedded in `<head>`
- Open Graph and Twitter Card meta tags for social sharing
- `AWS Domain/` contains DNS configuration CSVs (reference only)

## Docs

- `docs/resume.md` — markdown resume
- `docs/AI_RagChatbot_using_AWS.md` — RAG chatbot project writeup (linked from work section)
- `docs/Youtube_content_generation_workflow.md` — YouTube automation project writeup
- `docs/Certifications/` — PDF/JPG certificate files (linked from certifications section)
