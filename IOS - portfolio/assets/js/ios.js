/* ════════════════════════════════════════════════════════════════════
   ios.js — iOS / iPadOS 26 "Liquid Glass" OS shell.
   Owns: boot → lock → home flow, status-bar + lock clock, home grid /
   dock / page dots / page-2 widgets (rendered from window.APPS), paging,
   Spotlight, Control Center, App switcher, Dynamic Island, app open/close
   (zoom-from-icon), hash routing, focus management, theme persistence.

   Public API (CONTRACT.md §3):  window.iOS = { openApp, closeApp,
   setTheme, getTheme, toggleTheme }
   Lifecycle events (CONTRACT.md §4): document → 'ios:appopen' / 'ios:appclose'
═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── tiny helpers ────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var reducedMotion = function () {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  var THEME_KEY = "ios-theme";

  /* ── element refs (resolved on init) ─────────────────────────────── */
  var els = {};

  /* ── shell state ─────────────────────────────────────────────────── */
  var state = {
    screen: "boot",        // boot | lock | home
    page: 1,               // active home page (1 = apps, 2 = widgets)
    pages: 2,
    openId: null,          // currently open app id
    lastFocus: null,       // element to restore focus to on close
    opened: [],            // app switcher: ids opened this session (most-recent last)
    ccOpen: false,
    spotOpen: false,
    switcherOpen: false
  };

  /* ════════════════════════════════════════════════════════════════
     THEME
  ═════════════════════════════════════════════════════════════════ */
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light" : "dark";
  }
  function setTheme(t) {
    t = (t === "light") ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    syncThemeControls(t);
    return t;
  }
  function toggleTheme() { return setTheme(getTheme() === "dark" ? "light" : "dark"); }
  function syncThemeControls(t) {
    qsa("[data-theme-toggle]").forEach(function (btn) {
      var on = (t === "light");
      btn.setAttribute("aria-pressed", String(on));
      var lbl = btn.querySelector("[data-theme-label]");
      if (lbl) lbl.textContent = on ? "Light" : "Dark";
      var ic = btn.querySelector("i");
      if (ic) { ic.className = on ? "fas fa-sun" : "fas fa-moon"; }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     CLOCK  (status bar time + lock time/date) — ticks every second
  ═════════════════════════════════════════════════════════════════ */
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" + m : m);
  }
  function fmtDate(d) {
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var mon = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"];
    return days[d.getDay()] + ", " + mon[d.getMonth()] + " " + d.getDate();
  }
  function tickClock() {
    var d = new Date();
    var t = fmtTime(d);
    if (els.statusTime) els.statusTime.textContent = t;
    if (els.lockTime) els.lockTime.textContent = t;
    if (els.lockDate) els.lockDate.textContent = fmtDate(d);
    var w = $("widget-clock-time");
    if (w) { w.textContent = t; }
    var wd = $("widget-clock-date");
    if (wd) { wd.textContent = fmtDate(d); }
  }

  /* ════════════════════════════════════════════════════════════════
     DYNAMIC ISLAND
  ═════════════════════════════════════════════════════════════════ */
  var ISLAND_IDLE = "AI/ML Engineer @ Honeywell";
  function islandIdle() {
    if (els.islandText) els.islandText.textContent = ISLAND_IDLE;
    if (els.islandGlyph) els.islandGlyph.innerHTML = "";
    if (els.island) els.island.classList.remove("dynamic-island--app");
  }
  function islandApp(app) {
    if (!app) return;
    if (els.islandText) els.islandText.textContent = app.name;
    if (els.islandGlyph) {
      els.islandGlyph.innerHTML =
        '<i class="' + (app.fab ? "fab " : "fas ") + app.glyph + '"></i>';
    }
    if (els.island) els.island.classList.add("dynamic-island--app");
  }

  /* ════════════════════════════════════════════════════════════════
     SCREEN STATE MACHINE :  boot → lock → home
  ═════════════════════════════════════════════════════════════════ */
  function showScreen(name) {
    state.screen = name;
    if (els.boot) els.boot.classList.toggle("is-hidden", name !== "boot");
    if (els.lock) els.lock.classList.toggle("is-hidden", name !== "lock");
    if (els.home) {
      els.home.classList.toggle("is-active", name === "home");
      els.home.setAttribute("aria-hidden", name === "home" ? "false" : "true");
    }
  }

  function runBoot() {
    if (reducedMotion()) { goLock(); return; }
    els.boot.classList.add("is-booting");
    var done = false;
    var finish = function () { if (done) return; done = true; goLock(); };
    var bar = els.bootProgress;
    if (bar) {
      var onEnd = function () { bar.removeEventListener("animationend", onEnd); finish(); };
      bar.addEventListener("animationend", onEnd);
    }
    setTimeout(finish, 1600); // safety fallback
  }
  function goLock() {
    showScreen("lock");
    els.boot.classList.remove("is-booting");
    if (els.lockUnlock) els.lockUnlock.focus({ preventScroll: true });
  }
  function unlock() {
    if (state.screen !== "lock") return;
    els.lock.classList.add("is-unlocking");
    var go = function () {
      showScreen("home");
      els.lock.classList.remove("is-unlocking");
      routeFromHash(true); // honor a deep-link hash if present
    };
    if (reducedMotion()) { go(); }
    else { setTimeout(go, 420); }
  }

  /* ════════════════════════════════════════════════════════════════
     HOME RENDER  (icon grid + dock + dots + page-2 widgets) from APPS
  ═════════════════════════════════════════════════════════════════ */
  function iconImgHTML(app, extraClass) {
    // Real Apple PNG icon — full squircle with shadow/highlight already baked in.
    return '<img class="app-icon app-icon-img' + (extraClass ? " " + extraClass : "") +
           '" src="' + app.image + '" alt="" draggable="false">';
  }
  function iconGlyphHTML(app, extraClass) {
    var base = app.fab ? "fab " : "fas ";
    return '<span class="app-icon app-icon--' + app.gradient +
           (extraClass ? " " + extraClass : "") + '">' +
             '<i class="app-icon__glyph ' + base + app.glyph + '"></i>' +
           '</span>';
  }
  function appIconHTML(app, extraClass) {
    return app.image ? iconImgHTML(app, extraClass) : iconGlyphHTML(app, extraClass);
  }
  function iconMarkup(app) {
    return appIconHTML(app) +
           '<span class="app-tile__label">' + app.name + '</span>';
  }
  function makeTile(app) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "app-tile";
    b.setAttribute("data-app-open", app.id);
    b.setAttribute("aria-label", "Open " + app.name);
    b.id = "tile-" + app.id;
    b.innerHTML = iconMarkup(app);
    b.addEventListener("click", function () { openApp(app.id); });
    return b;
  }

  function renderHome() {
    var apps = window.APPS || [];
    var grid = els.homeGrid, dock = els.dockGrid;
    if (grid && !grid.children.length) {
      apps.filter(function (a) { return !a.dock && a.page === 1; })
          .forEach(function (a) { grid.appendChild(makeTile(a)); });
    }
    if (dock && !dock.children.length) {
      apps.filter(function (a) { return a.dock; })
          .forEach(function (a) { dock.appendChild(makeTile(a)); });
    }
    renderWidgets();
    renderDots();
    setPage(1, true);
  }

  function renderWidgets() {
    var host = els.homeWidgets;
    if (!host || host.children.length) return;
    var P = window.PORTFOLIO || {};
    var latest = (P.projects && P.projects[0]) || { title: "" };
    var links = P.links || {};

    var html = "";
    /* Clock widget */
    html +=
      '<div class="glass squircle widget widget--clock">' +
        '<p class="widget__eyebrow" id="widget-clock-date">—</p>' +
        '<p class="widget__big" id="widget-clock-time">9:41</p>' +
        '<p class="widget__sub">Local time</p>' +
      '</div>';
    /* Role widget */
    html +=
      '<div class="glass squircle widget widget--role">' +
        '<p class="widget__eyebrow"><span class="widget__dot widget__dot--green" aria-hidden="true"></span> Now</p>' +
        '<p class="widget__title">AI/ML Engineer</p>' +
        '<p class="widget__sub">@ Honeywell · Richmond, VA</p>' +
      '</div>';
    /* Latest project widget → opens Projects */
    html +=
      '<button type="button" class="glass squircle widget widget--project" data-app-open="projects" aria-label="Open Projects">' +
        '<p class="widget__eyebrow"><i class="fas fa-folder" aria-hidden="true"></i> Latest project</p>' +
        '<p class="widget__title">' + (latest.title || "Projects") + '</p>' +
        '<p class="widget__sub">Tap to open Projects</p>' +
      '</button>';
    /* TechRex subscribe widget */
    html +=
      '<a class="glass squircle widget widget--techrex" href="' +
        (links.techrex || "https://youtube.com/@The_TechRex") +
        '" target="_blank" rel="noopener" aria-label="Subscribe to TechRex on YouTube">' +
        '<p class="widget__eyebrow"><i class="fab fa-youtube" aria-hidden="true"></i> TechRex</p>' +
        '<p class="widget__title">Building in public</p>' +
        '<span class="widget__cta">Subscribe</span>' +
      '</a>';

    host.innerHTML = html;
    qsa("[data-app-open]", host).forEach(function (el) {
      el.addEventListener("click", function () { openApp(el.getAttribute("data-app-open")); });
    });
  }

  function renderDots() {
    var dots = els.homeDots;
    if (!dots || dots.children.length) return;
    for (var i = 1; i <= state.pages; i++) {
      (function (p) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "home__dot";
        d.setAttribute("role", "tab");
        d.setAttribute("aria-label", "Page " + p);
        d.addEventListener("click", function () { setPage(p); });
        dots.appendChild(d);
      })(i);
    }
  }

  function setPage(p, instant) {
    p = Math.max(1, Math.min(state.pages, p));
    state.page = p;
    var pagesWrap = els.homePages;
    if (pagesWrap) {
      pagesWrap.style.transition = instant ? "none" :
        "transform var(--t-med) var(--spring)";
      pagesWrap.style.transform = "translateX(" + (-(p - 1) * 100) + "%)";
      if (instant) { void pagesWrap.offsetWidth; } // reflow so future transitions apply
    }
    var p1 = $("home-page-1"), p2 = $("home-page-2");
    if (p1) { p1.hidden = false; p1.setAttribute("aria-hidden", p === 1 ? "false" : "true"); }
    if (p2) { p2.hidden = false; p2.setAttribute("aria-hidden", p === 2 ? "false" : "true"); }
    qsa(".home__dot", els.homeDots).forEach(function (d, i) {
      var on = (i + 1) === p;
      d.classList.toggle("is-active", on);
      d.setAttribute("aria-selected", String(on));
    });
  }

  /* ════════════════════════════════════════════════════════════════
     APP OPEN / CLOSE  (zoom-from-icon spring; focus trap; events)
  ═════════════════════════════════════════════════════════════════ */
  function appById(id) {
    return (window.APPS || []).filter(function (a) { return a.id === id; })[0];
  }
  function tileEl(id) {
    return $("tile-" + id) || document.querySelector('[data-app-open="' + id + '"]');
  }

  function setIconOrigin(sheet, id) {
    var t = tileEl(id);
    if (!t) { sheet.style.transformOrigin = "50% 70%"; return; }
    var r = t.getBoundingClientRect();
    var cx = (r.left + r.width / 2) / window.innerWidth * 100;
    var cy = (r.top + r.height / 2) / window.innerHeight * 100;
    sheet.style.transformOrigin = cx + "% " + cy + "%";
  }

  function openApp(id) {
    var app = appById(id);
    if (!app) return;

    if (app.type === "external") { window.open(app.href, "_blank", "noopener"); return; }
    if (app.type === "pdf") { openPdf(app); return; }

    var sheet = $("app-" + id);
    if (!sheet) return;
    if (state.openId === id) return; // already open

    state.lastFocus = document.activeElement;
    state.openId = id;

    // remember for the app switcher (move-to-front)
    state.opened = state.opened.filter(function (x) { return x !== id; });
    state.opened.push(id);

    closeOverlays();

    setIconOrigin(sheet, id);
    sheet.setAttribute("aria-hidden", "false");
    sheet.classList.add("is-open");
    if (!reducedMotion()) {
      sheet.classList.add("is-opening");
      var onEnd = function () {
        sheet.classList.remove("is-opening");
        sheet.removeEventListener("animationend", onEnd);
        afterOpen(id, sheet);
      };
      sheet.addEventListener("animationend", onEnd);
      setTimeout(function () { if (sheet.classList.contains("is-opening")) onEnd(); }, 520);
    } else {
      afterOpen(id, sheet);
    }

    islandApp(app);
    document.body.classList.add("app-is-open");
    setBackgroundInert(true);
    if (location.hash.slice(1) !== id) {
      history.pushState({ app: id }, "", "#" + id);
    }
  }

  function afterOpen(id, sheet) {
    focusFirst(sheet);
    document.dispatchEvent(new CustomEvent("ios:appopen", { detail: { id: id } }));
  }

  function closeApp(id) {
    id = id || state.openId;
    if (!id) return;
    var sheet = $("app-" + id);
    if (!sheet) return;

    var finish = function () {
      sheet.classList.remove("is-open", "is-closing");
      sheet.setAttribute("aria-hidden", "true");
      if (state.openId === id) state.openId = null;
      islandIdle();
      document.body.classList.remove("app-is-open");
      setBackgroundInert(false);
      var back = state.lastFocus || tileEl(id);
      if (back && back.focus) back.focus({ preventScroll: true });
      state.lastFocus = null;
      document.dispatchEvent(new CustomEvent("ios:appclose", { detail: { id: id } }));
    };

    if (!reducedMotion()) {
      setIconOrigin(sheet, id);
      sheet.classList.add("is-closing");
      var onEnd = function () { sheet.removeEventListener("animationend", onEnd); finish(); };
      sheet.addEventListener("animationend", onEnd);
      setTimeout(function () { if (sheet.classList.contains("is-closing")) finish(); }, 520);
    } else {
      finish();
    }

    if (location.hash.slice(1) === id) {
      history.pushState({}, "", location.pathname + location.search);
    }
  }

  /* ── Resume / PDF (Safari) — open in a lightweight in-shell sheet ─── */
  function openPdf(app) {
    var id = "pdfview";
    var existing = $("app-" + id);
    if (!existing) {
      existing = document.createElement("section");
      existing.className = "app-sheet app-sheet--pdf";
      existing.id = "app-" + id;
      existing.setAttribute("data-app", id);
      existing.setAttribute("role", "dialog");
      existing.setAttribute("aria-modal", "true");
      existing.setAttribute("aria-label", app.name);
      existing.setAttribute("aria-hidden", "true");
      existing.innerHTML =
        '<header class="app-sheet__bar">' +
          '<h1 class="app-sheet__title">' + app.name + '</h1>' +
          '<a class="ios-btn app-sheet__open-ext" href="' + app.href +
            '" target="_blank" rel="noopener" aria-label="Open in new tab">' +
            '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>' +
          '<button type="button" class="app-sheet__close" data-app-close="' + id +
            '" aria-label="Close ' + app.name + '"><i class="fas fa-chevron-down"></i></button>' +
        '</header>' +
        '<div class="app-sheet__body app-sheet__body--flush">' +
          '<iframe class="pdf-frame" title="' + app.name + '" src="' +
            app.href + '#view=FitH"></iframe>' +
        '</div>';
      document.body.appendChild(existing);
      existing.querySelector("[data-app-close]")
        .addEventListener("click", function () { closeApp(id); });
      addSwipe(existing, { down: function (sy) { if (sy < 140) closeApp(id); } });
    } else {
      existing.querySelector(".pdf-frame").setAttribute("src", app.href + "#view=FitH");
    }

    state.lastFocus = document.activeElement;
    state.openId = id;
    state.opened = state.opened.filter(function (x) { return x !== "safari"; });
    state.opened.push("safari");
    closeOverlays();
    setIconOrigin(existing, "safari");
    existing.setAttribute("aria-hidden", "false");
    existing.classList.add("is-open");
    if (!reducedMotion()) {
      existing.classList.add("is-opening");
      setTimeout(function () { existing.classList.remove("is-opening"); focusFirst(existing); }, 440);
    } else { focusFirst(existing); }
    if (els.islandText) els.islandText.textContent = app.name;
    if (els.islandGlyph) els.islandGlyph.innerHTML = '<i class="fas fa-compass"></i>';
    if (els.island) els.island.classList.add("dynamic-island--app");
    document.body.classList.add("app-is-open");
    setBackgroundInert(true);
  }

  /* ── focus management (trap within the open sheet) ────────────────── */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]),' +
                  'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusFirst(sheet) {
    var f = qsa(FOCUSABLE, sheet).filter(function (e) { return e.offsetParent !== null; });
    var target = sheet.querySelector(".app-sheet__close") || f[0];
    if (target) target.focus({ preventScroll: true });
  }
  function trapFocus(e) {
    if (e.key !== "Tab") return;
    // active modal layer: open app sheet, else whichever overlay is open
    var scope = null;
    if (state.openId) { scope = $("app-" + state.openId); }
    else if (state.ccOpen) { scope = els.cc; }
    else if (state.spotOpen) { scope = els.spot; }
    else if (state.switcherOpen) { scope = els.switcher; }
    if (!scope) return;
    var f = qsa(FOCUSABLE, scope).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ── background inert (modal isolation for SR + keyboard) ──────────── */
  var INERT_TARGETS = ["home", "status-bar", "dynamic-island", "dock", "spotlight-trigger"];
  function setBackgroundInert(on) {
    INERT_TARGETS.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      if (on) { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); }
      else { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     CONTROL CENTER
  ═════════════════════════════════════════════════════════════════ */
  function buildControlCenter() {
    var host = els.ccPanel;
    if (!host || host.children.length) return;
    var L = (window.PORTFOLIO && window.PORTFOLIO.links) || {};

    host.innerHTML =
      '<div class="cc-grid">' +
        '<button type="button" class="glass squircle cc-tile cc-tile--theme" data-theme-toggle aria-pressed="false">' +
          '<i class="fas fa-moon" aria-hidden="true"></i>' +
          '<span class="cc-tile__label">Appearance</span>' +
          '<span class="cc-tile__value" data-theme-label>Dark</span>' +
        '</button>' +
        '<div class="glass squircle cc-tile cc-tile--bright">' +
          '<i class="fas fa-sun" aria-hidden="true"></i>' +
          '<input type="range" min="20" max="100" value="85" class="cc-bright" aria-label="Brightness (decorative)">' +
        '</div>' +
        '<a class="glass squircle cc-tile cc-tile--link" href="' + (L.linkedin || "#") +
          '" target="_blank" rel="noopener" aria-label="LinkedIn">' +
          '<i class="fab fa-linkedin-in" aria-hidden="true"></i><span class="cc-tile__label">LinkedIn</span></a>' +
        '<a class="glass squircle cc-tile cc-tile--link" href="' + (L.github || "#") +
          '" target="_blank" rel="noopener" aria-label="GitHub">' +
          '<i class="fab fa-github" aria-hidden="true"></i><span class="cc-tile__label">GitHub</span></a>' +
        '<a class="glass squircle cc-tile cc-tile--link" href="mailto:' + (L.email || "") +
          '" aria-label="Email">' +
          '<i class="fas fa-envelope" aria-hidden="true"></i><span class="cc-tile__label">Email</span></a>' +
        '<a class="glass squircle cc-tile cc-tile--np" href="' + (L.techrex || "#") +
          '" target="_blank" rel="noopener" aria-label="TechRex on YouTube">' +
          '<i class="fab fa-youtube" aria-hidden="true"></i>' +
          '<span class="cc-tile__np-title">TechRex</span>' +
          '<span class="cc-tile__np-sub">Building in public <i class="fas fa-play"></i></span></a>' +
        '<button type="button" class="glass squircle cc-tile cc-tile--resume" data-cc-resume aria-label="Open résumé">' +
          '<i class="fas fa-file-lines" aria-hidden="true"></i><span class="cc-tile__label">Résumé</span></button>' +
      '</div>';

    host.querySelector("[data-theme-toggle]").addEventListener("click", function () { toggleTheme(); });
    var rb = host.querySelector("[data-cc-resume]");
    var resume = appById("safari");
    if (rb && resume) rb.addEventListener("click", function () { closeOverlays(); openPdf(resume); });
    syncThemeControls(getTheme());
  }
  function openControlCenter() {
    if (state.openId) return; // not over an app
    buildControlCenter();
    closeOverlays();
    state.ccOpen = true;
    els.cc.setAttribute("aria-hidden", "false");
    els.cc.classList.add("is-open");
    setBackgroundInert(true);
    var f = els.cc.querySelector(FOCUSABLE);
    if (f) f.focus({ preventScroll: true });
  }
  function closeControlCenter() {
    state.ccOpen = false;
    els.cc.classList.remove("is-open");
    els.cc.setAttribute("aria-hidden", "true");
    if (!state.openId) setBackgroundInert(false);
  }

  /* ════════════════════════════════════════════════════════════════
     SPOTLIGHT  (filters apps + project names)
  ═════════════════════════════════════════════════════════════════ */
  function spotlightIndex() {
    var idx = [];
    (window.APPS || []).forEach(function (a) {
      idx.push({ kind: "app", id: a.id, name: a.name,
                 image: a.image, glyph: a.glyph, fab: a.fab, gradient: a.gradient });
    });
    var P = window.PORTFOLIO || {};
    (P.projects || []).forEach(function (p) {
      idx.push({ kind: "project", id: "projects", name: p.title,
                 image: "assets/images/icons/files.png" });
    });
    return idx;
  }
  function renderSpotlight(q) {
    var res = els.spotResults;
    if (!res) return;
    q = (q || "").trim().toLowerCase();
    var items = spotlightIndex();
    var matches = q ? items.filter(function (it) { return it.name.toLowerCase().indexOf(q) !== -1; })
                    : items.filter(function (it) { return it.kind === "app"; });
    res.innerHTML = "";
    matches.slice(0, 12).forEach(function (it, i) {
      var li = document.createElement("li");
      li.className = "spotlight__item";
      li.setAttribute("role", "option");
      li.tabIndex = -1;
      if (i === 0) li.classList.add("is-active");
      li.innerHTML =
        appIconHTML(it, "spotlight__icon") +
        '<span class="spotlight__name">' + it.name + '</span>' +
        '<span class="spotlight__kind">' + (it.kind === "project" ? "Project" : "App") + '</span>';
      li.addEventListener("click", function () { closeSpotlight(); openApp(it.id); });
      res.appendChild(li);
    });
  }
  function openSpotlight() {
    if (state.openId) return;
    closeOverlays();
    state.spotOpen = true;
    els.spot.setAttribute("aria-hidden", "false");
    els.spot.classList.add("is-open");
    setBackgroundInert(true);
    renderSpotlight("");
    if (els.spotInput) { els.spotInput.value = ""; els.spotInput.focus({ preventScroll: true }); }
  }
  function closeSpotlight() {
    state.spotOpen = false;
    els.spot.classList.remove("is-open");
    els.spot.setAttribute("aria-hidden", "true");
    if (!state.openId) setBackgroundInert(false);
  }
  function spotlightEnter() {
    var first = els.spotResults &&
      els.spotResults.querySelector(".spotlight__item.is-active, .spotlight__item");
    if (first) first.click();
  }

  /* ════════════════════════════════════════════════════════════════
     APP SWITCHER  (cards of opened apps)
  ═════════════════════════════════════════════════════════════════ */
  function buildSwitcher() {
    var rail = els.switcherRail;
    if (!rail) return;
    rail.innerHTML = "";
    var list = state.opened.slice().reverse(); // most recent first
    if (!list.length) {
      rail.innerHTML = '<p class="app-switcher__empty">No open apps</p>';
      return;
    }
    list.forEach(function (id) {
      var app = appById(id);
      if (!app) return;
      var card = document.createElement("div");
      card.className = "app-switcher__card glass squircle";
      card.setAttribute("data-switch-id", id);
      card.innerHTML =
        '<button type="button" class="app-switcher__open" aria-label="Reopen ' + app.name + '">' +
          appIconHTML(app) +
          '<span class="app-switcher__name">' + app.name + '</span>' +
        '</button>' +
        '<button type="button" class="app-switcher__kill" aria-label="Close ' + app.name + '">' +
          '<i class="fas fa-xmark" aria-hidden="true"></i></button>';
      card.querySelector(".app-switcher__open").addEventListener("click", function () {
        closeSwitcher(); openApp(id);
      });
      var kill = function () {
        state.opened = state.opened.filter(function (x) { return x !== id; });
        card.classList.add("is-killed");
        setTimeout(function () {
          if (card.parentNode) card.parentNode.removeChild(card);
          if (!state.opened.length) closeSwitcher();
        }, reducedMotion() ? 0 : 220);
      };
      card.querySelector(".app-switcher__kill").addEventListener("click", kill);
      addSwipe(card, { up: kill });
      rail.appendChild(card);
    });
  }
  function openSwitcher() {
    buildSwitcher();
    closeOverlays();
    state.switcherOpen = true;
    els.switcher.setAttribute("aria-hidden", "false");
    els.switcher.classList.add("is-open");
    setBackgroundInert(true);
    var f = els.switcher.querySelector(FOCUSABLE);
    if (f) f.focus({ preventScroll: true });
  }
  function closeSwitcher() {
    state.switcherOpen = false;
    els.switcher.classList.remove("is-open");
    els.switcher.setAttribute("aria-hidden", "true");
    if (!state.openId) setBackgroundInert(false);
  }

  function closeOverlays() {
    if (state.ccOpen) closeControlCenter();
    if (state.spotOpen) closeSpotlight();
    if (state.switcherOpen) closeSwitcher();
  }

  /* ════════════════════════════════════════════════════════════════
     GESTURES  (pointer-based swipes; touch + mouse drag)
  ═════════════════════════════════════════════════════════════════ */
  function addSwipe(target, opts) {
    if (!target) return;
    var sx = 0, sy = 0, t0 = 0, active = false;
    target.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); active = true;
    }, { passive: true });
    target.addEventListener("touchend", function (e) {
      if (!active) return; active = false;
      var t = e.changedTouches[0];
      handleSwipe(t.clientX - sx, t.clientY - sy, sx, sy, Date.now() - t0, opts);
    }, { passive: true });
    var down = false;
    target.addEventListener("mousedown", function (e) {
      down = true; sx = e.clientX; sy = e.clientY; t0 = Date.now();
    });
    window.addEventListener("mouseup", function (e) {
      if (!down) return; down = false;
      handleSwipe(e.clientX - sx, e.clientY - sy, sx, sy, Date.now() - t0, opts);
    });
  }
  function handleSwipe(dx, dy, startX, startY, dt, opts) {
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay && ax > 50) {            // horizontal
      if (opts.horizontal) opts.horizontal(dx < 0 ? 1 : -1);
    } else if (ay > 40) {                 // vertical
      if (dy < 0 && opts.up) opts.up();
      else if (dy > 0 && opts.down) opts.down(startY);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     HASH ROUTING  (deep links + browser back)
  ═════════════════════════════════════════════════════════════════ */
  function routeFromHash(initial) {
    var id = location.hash.slice(1);
    if (!id) {
      if (state.openId) closeApp(state.openId);
      return;
    }
    var app = appById(id);
    if (!app || app.type === "external" || app.type === "pdf") return;
    if (state.screen !== "home") { showScreen("home"); }
    if (state.openId !== id) openApp(id);
  }

  /* ════════════════════════════════════════════════════════════════
     EVENT WIRING
  ═════════════════════════════════════════════════════════════════ */
  function wire() {
    if (els.boot) els.boot.addEventListener("click", function () { if (state.screen === "boot") goLock(); });

    /* unlock: tap / click / Enter / swipe-up */
    [els.lock, els.lockUnlock].forEach(function (t) {
      if (t) t.addEventListener("click", function (e) { e.stopPropagation(); unlock(); });
    });
    addSwipe(els.lock, { up: unlock });

    /* lock widgets act as quick actions: pill → About, yt circle → TechRex,
       open circle → just unlock. All bypass to home. */
    qsa(".lock-widget", els.lock).forEach(function (n) {
      n.style.cursor = "pointer";
      var act = function (e) {
        e.stopPropagation(); unlock();
        var delay = reducedMotion() ? 0 : 460;
        if (n.classList.contains("lock-widget--yt")) {
          setTimeout(function () { openApp("techrex"); }, delay);
        } else if (n.classList.contains("lock-widget--pill")) {
          setTimeout(function () { openApp("about"); }, delay);
        }
      };
      n.addEventListener("click", act);
      n.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          if (e.key === " " || e.key === "Spacebar") e.preventDefault();
          act(e);
        }
      });
    });

    /* close buttons on every static/functional sheet */
    qsa("[data-app-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeApp(b.getAttribute("data-app-close")); });
    });

    /* swipe-down to close on each app sheet (gesture must start near top bar) */
    qsa(".app-sheet").forEach(function (sheet) {
      addSwipe(sheet, { down: function (startY) {
        if (startY < 140) closeApp(sheet.getAttribute("data-app") || state.openId);
      }});
    });

    /* home paging: swipe + arrow keys + dots */
    addSwipe(els.homePages, { horizontal: function (dir) { setPage(state.page + dir); } });

    /* Spotlight trigger + pull-down on home */
    if (els.spotTrigger) els.spotTrigger.addEventListener("click", openSpotlight);
    addSwipe(els.home, {
      down: function (startY) { if (startY < 120 && !state.openId) openSpotlight(); }
    });
    if (els.spotInput) els.spotInput.addEventListener("input", function () { renderSpotlight(els.spotInput.value); });
    if (els.spot) els.spot.addEventListener("click", function (e) { if (e.target === els.spot) closeSpotlight(); });

    /* Dynamic Island → toggles Control Center (top-right metaphor) */
    if (els.island) els.island.addEventListener("click", function () {
      if (state.openId) return;
      if (state.screen !== "home") return;
      state.ccOpen ? closeControlCenter() : openControlCenter();
    });

    /* Control Center: backdrop click + status-bar swipe-down */
    if (els.cc) els.cc.addEventListener("click", function (e) { if (e.target === els.cc) closeControlCenter(); });
    if (els.statusBar) addSwipe(els.statusBar, { down: function () { if (!state.openId && state.screen === "home") openControlCenter(); } });

    /* App switcher: backdrop click closes */
    if (els.switcher) els.switcher.addEventListener("click", function (e) { if (e.target === els.switcher) closeSwitcher(); });

    /* keyboard */
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("keydown", trapFocus);

    /* hash routing / back button */
    window.addEventListener("hashchange", function () { routeFromHash(false); });
    window.addEventListener("popstate", function () { routeFromHash(false); });
  }

  function onKeydown(e) {
    var k = e.key;
    if (state.screen === "boot") { if (k === "Enter" || k === " ") { goLock(); } return; }
    if (state.screen === "lock") { if (k === "Enter" || k === " " || k === "ArrowUp") { e.preventDefault(); unlock(); } return; }

    /* Escape closes the top-most layer */
    if (k === "Escape") {
      if (state.spotOpen) { closeSpotlight(); return; }
      if (state.ccOpen) { closeControlCenter(); return; }
      if (state.switcherOpen) { closeSwitcher(); return; }
      if (state.openId) { closeApp(state.openId); return; }
    }

    if (state.spotOpen && k === "Enter") { e.preventDefault(); spotlightEnter(); return; }

    /* home-only shortcuts */
    if (state.screen === "home" && !state.openId && !state.ccOpen && !state.spotOpen && !state.switcherOpen) {
      if (k === "ArrowRight") { setPage(state.page + 1); }
      else if (k === "ArrowLeft") { setPage(state.page - 1); }
      else if (k === "ArrowDown") { e.preventDefault(); openControlCenter(); }
      else if (k === "/" || ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "k")) { e.preventDefault(); openSpotlight(); }
      else if (k.toLowerCase() === "s") { openSwitcher(); }
    }
  }

  /* ════════════════════════════════════════════════════════════════
     INIT
  ═════════════════════════════════════════════════════════════════ */
  function resolveEls() {
    els = {
      statusBar: $("status-bar"),
      statusTime: $("status-time"),
      island: $("dynamic-island"),
      islandText: $("island-text"),
      islandGlyph: $("island-glyph"),
      boot: $("boot-screen"),
      bootProgress: $("boot-progress"),
      lock: $("lock-screen"),
      lockTime: $("lock-time"),
      lockDate: $("lock-date"),
      lockUnlock: $("lock-unlock"),
      home: $("home"),
      homePages: $("home-pages"),
      homeGrid: $("home-grid"),
      homeWidgets: $("home-widgets"),
      homeDots: $("home-dots"),
      dockGrid: $("dock-grid"),
      spotTrigger: $("spotlight-trigger"),
      spot: $("spotlight"),
      spotInput: $("spotlight-input"),
      spotResults: $("spotlight-results"),
      cc: $("control-center"),
      ccPanel: $("control-center-panel"),
      switcher: $("app-switcher"),
      switcherRail: $("app-switcher-rail")
    };
  }

  function init() {
    resolveEls();
    // apply persisted theme at runtime (pre-paint script already set the attr)
    var saved;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    setTheme(saved === "light" ? "light" : (saved === "dark" ? "dark" : getTheme()));

    renderHome();
    islandIdle();
    tickClock();
    setInterval(tickClock, 1000);
    wire();
    buildControlCenter();

    showScreen("boot");
    runBoot();
  }

  /* ── public API ─────────────────────────────────────────────────── */
  window.iOS = {
    openApp: openApp,
    closeApp: closeApp,
    setTheme: setTheme,
    getTheme: getTheme,
    toggleTheme: toggleTheme
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
