/* ════════════════════════════════════════════════════════════════════
   apps.config.js — app registry. Single global: window.APPS.

   Entry shape:
     { id, name, image?, glyph?, fab?, gradient, type, dock, page, href? }
       id       : unique app id (matches sheet id  app-<id>)
       name     : display label
       image    : path to icon PNG (preferred — render an <img>)
       glyph    : Font Awesome glyph class — fallback if no `image`
       fab      : true → brand glyph (use "fab" base class) else "fas"
       gradient : used only when no `image` — maps to .app-icon--<gradient>
       type     : 'static' | 'functional' | 'external' | 'pdf'
       dock     : true → pinned in the dock
       page     : home page index (1 or 2). Dock apps: 0.
       href     : for 'external' (new tab) / 'pdf' (resume) targets
═══════════════════════════════════════════════════════════════════════ */
window.APPS = [
  /* ── DOCK (persistent, in order) ─────────────────────────────────── */
  { id: "about",        name: "About",          image: "assets/images/icons/photos.png",    type: "static",     dock: true,  page: 0 },
  { id: "projects",     name: "Projects",       image: "assets/images/icons/files.png",     type: "static",     dock: true,  page: 0 },
  { id: "askai",        name: "Ask AI",         image: "assets/images/icons/shortcuts.png", type: "functional", dock: true,  page: 0 },
  { id: "messages",     name: "Messages",       image: "assets/images/icons/messages.png",  type: "static",     dock: true,  page: 0 },

  /* ── HOME PAGE 1 GRID ────────────────────────────────────────────── */
  { id: "journey",      name: "Journey",        image: "assets/images/icons/calendar.png",  type: "static",     dock: false, page: 1 },
  { id: "skills",       name: "Skills",         image: "assets/images/icons/tips.png",      type: "static",     dock: false, page: 1 },
  { id: "achievements", name: "Achievements",   image: "assets/images/icons/appstore.png",  type: "static",     dock: false, page: 1 },
  { id: "hybridrag",    name: "Hybrid RAG",     image: "assets/images/icons/books.png",     type: "functional", dock: false, page: 1 },
  /* semcache + techrex have no Apple equivalent — keep glyph fallback */
  { id: "semcache",     name: "Semantic Cache", glyph: "fa-bolt",                 fab: false, gradient: "yellow", type: "functional", dock: false, page: 1 },
  { id: "textsql",      name: "Text-to-SQL",    image: "assets/images/icons/numbers.png",   type: "functional", dock: false, page: 1 },
  { id: "safari",       name: "Resume",         image: "assets/images/icons/safari.png",    type: "pdf",        dock: false, page: 1, href: "docs/Sai Teja Mothukuri - AIML Engineer.pdf" },
  { id: "techrex",      name: "TechRex",        glyph: "fa-youtube",              fab: true,  gradient: "red",    type: "external",   dock: false, page: 1, href: "https://youtube.com/@The_TechRex" },
  { id: "settings",     name: "Settings",       image: "assets/images/icons/settings.png",  type: "static",     dock: false, page: 1 }

  /* HOME PAGE 2 (widgets) is rendered by the shell, not an app entry. */
];
