/* ════════════════════════════════════════════════════════════════════
   render.js — Static-Apps renderer.
   On DOMContentLoaded, fills each static app sheet's [data-app-body]
   from window.PORTFOLIO (+ window.APPS). Content is VERBATIM from
   content.js; only structure/markup is added. Liquid-Glass utilities +
   theme vars only — never hardcode colors.

   Apps rendered here: about · projects · journey · skills ·
                       achievements · messages · settings
   (Functional apps own their own markup/JS; not touched here.)
═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var P = window.PORTFOLIO || {};

  /* ── tiny DOM helpers ─────────────────────────────────────────────── */
  function bodyOf(id) {
    var sheet = document.getElementById("app-" + id);
    return sheet ? sheet.querySelector("[data-app-body]") : null;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // href values come from our own trusted content.js, but guard scheme anyway.
  function safeHref(h) {
    h = String(h || "");
    return /^(https?:|mailto:|tel:|docs\/|assets\/|#|\/)/i.test(h) ? h : "#";
  }

  /* ════════════════════════════════════════════════════════════════════
     ABOUT
  ═══════════════════════════════════════════════════════════════════════ */
  function renderAbout() {
    var el = bodyOf("about");
    if (!el || !P.identity) return false;
    var id = P.identity, L = P.links || {};

    var actions = [
      { label: "Email", icon: "fas fa-envelope", href: "mailto:" + (L.email || "") },
      { label: "LinkedIn", icon: "fab fa-linkedin-in", href: L.linkedin },
      { label: "GitHub", icon: "fab fa-github", href: L.github },
      { label: "TechRex", icon: "fab fa-youtube", href: L.techrex }
    ].map(function (a) {
      var ext = /^https?:/i.test(a.href || "");
      return '<a class="ios-btn about__action" href="' + esc(safeHref(a.href)) + '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + '>' +
        '<i class="' + esc(a.icon) + '" aria-hidden="true"></i>' + esc(a.label) + "</a>";
    }).join("");

    var bio = (id.bio || []).map(function (p) {
      return '<p class="about__bio-p">' + p + "</p>"; // bio is trusted HTML
    }).join("");

    el.innerHTML =
      '<div class="about ios-animate-in">' +
        '<div class="glass glass--sheen ios-card about__hero squircle">' +
          '<img class="about__photo" src="' + esc(id.photo) + '" alt="' + esc(id.name) +
              '" loading="lazy" decoding="async">' +
          '<div class="about__hero-meta">' +
            '<h2 class="ios-title about__name">' + esc(id.name) + "</h2>" +
            '<p class="ios-subtitle about__tagline">' + esc(id.tagline) + "</p>" +
            '<div class="about__status">' +
              '<span class="about__dot" aria-hidden="true"></span>' +
              '<span>' + esc(id.statusLine) + " · " + esc(id.availability) + "</span>" +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="about__actions">' + actions + "</div>" +

        '<div class="glass ios-card about__bio">' + bio + "</div>" +

        '<div class="glass ios-card about__facts">' +
          fact("fas fa-graduation-cap", "M.S. Computer Science", "University of Central Missouri · 2025") +
          '<hr class="ios-divider">' +
          fact("fas fa-microchip", "AI/ML Engineer", "Honeywell · Richmond, VA") +
          '<hr class="ios-divider">' +
          fact("fab fa-youtube", "Content Creator", "TechRex on YouTube &amp; Instagram") +
        "</div>" +
      "</div>";
    return true;
  }
  function fact(icon, title, sub) {
    return '<div class="about__fact">' +
      '<i class="' + esc(icon) + ' about__fact-icon" aria-hidden="true"></i>' +
      '<div class="about__fact-text"><b>' + title + "</b><span>" + sub + "</span></div>" +
      "</div>";
  }

  /* ════════════════════════════════════════════════════════════════════
     PROJECTS
  ═══════════════════════════════════════════════════════════════════════ */
  function renderProjects() {
    var el = bodyOf("projects");
    if (!el || !P.projects) return false;

    var cards = P.projects.map(function (pr) {
      var chips = (pr.tech || []).map(function (t) {
        return '<span class="ios-chip">' + esc(t) + "</span>";
      }).join("");

      var links = (pr.links || []).map(function (lk) {
        var ext = /^https?:/i.test(lk.href || "");
        return '<a class="ios-pill proj__link" href="' + esc(safeHref(lk.href)) + '"' +
          (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + '>' +
          '<i class="' + esc(lk.icon) + '" aria-hidden="true"></i>' + esc(lk.label) + "</a>";
      }).join("");

      return '<article class="glass ios-card proj">' +
        '<div class="proj__badge"><i class="fas fa-circle proj__badge-dot" aria-hidden="true"></i>' +
            esc(pr.badge) + "</div>" +
        '<h3 class="proj__title">' + esc(pr.title) + "</h3>" +
        '<p class="proj__desc">' + pr.desc + "</p>" + // desc trusted HTML
        '<div class="proj__tech">' + chips + "</div>" +
        '<div class="proj__links">' + links + "</div>" +
        "</article>";
    }).join("");

    el.innerHTML = '<div class="proj-grid ios-animate-in">' + cards + "</div>";
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════
     JOURNEY — vertical timeline
  ═══════════════════════════════════════════════════════════════════════ */
  function renderJourney() {
    var el = bodyOf("journey");
    if (!el || !P.journey) return false;

    var items = P.journey.map(function (j) {
      var logo;
      if (j.logoType === "img") {
        logo = '<span class="tl__logo tl__logo--img">' +
          '<img src="' + esc(j.logoImg) + '" alt="' + esc(j.logoAlt || j.company) +
          '" loading="lazy" decoding="async"></span>';
      } else {
        var style = j.logoBg ? ' style="background:' + esc(j.logoBg) + '"' : "";
        logo = '<span class="tl__logo tl__logo--fa ' + esc(j.logoClass || "") + '"' + style + '>' +
          '<i class="' + esc(j.logoFa) + '" aria-hidden="true"></i></span>';
      }

      var bullets = (j.bullets || []).map(function (b) {
        return "<li>" + b + "</li>"; // trusted HTML
      }).join("");

      return '<li class="tl__item">' +
        '<span class="tl__rail" aria-hidden="true"></span>' +
        logo +
        '<div class="glass ios-card tl__card">' +
          '<div class="tl__head">' +
            '<h3 class="tl__role">' + esc(j.role) + "</h3>" +
            '<span class="tl__date">' + esc(j.date) + "</span>" +
          "</div>" +
          '<p class="tl__company">' + esc(j.company) + "</p>" +
          '<p class="tl__blurb">' + j.blurb + "</p>" + // trusted HTML
          (bullets ? '<ul class="tl__bullets">' + bullets + "</ul>" : "") +
        "</div>" +
        "</li>";
    }).join("");

    el.innerHTML = '<ol class="timeline ios-animate-in">' + items + "</ol>";
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════
     SKILLS — 6 domains, glass chips
  ═══════════════════════════════════════════════════════════════════════ */
  function renderSkills() {
    var el = bodyOf("skills");
    if (!el || !P.skills) return false;

    var groups = P.skills.map(function (s) {
      var chips = (s.items || []).map(function (i) {
        return '<span class="ios-chip">' + esc(i) + "</span>";
      }).join("");
      return '<section class="glass ios-card skillgrp">' +
        '<h3 class="skillgrp__title">' +
          '<i class="' + esc(s.faIcon) + ' skillgrp__icon" aria-hidden="true"></i>' +
          esc(s.title) + "</h3>" +
        '<div class="skillgrp__chips">' + chips + "</div>" +
        "</section>";
    }).join("");

    el.innerHTML = '<div class="skills-grid ios-animate-in">' + groups + "</div>";
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════
     ACHIEVEMENTS — JETIR paper + Wallet-style cert cards
  ═══════════════════════════════════════════════════════════════════════ */
  function renderAchievements() {
    var el = bodyOf("achievements");
    if (!el || !P.achievements) return false;
    var a = P.achievements;

    var paper = a.paper ? (
      '<a class="glass glass--sheen ios-card ach-paper" href="' + esc(safeHref(a.paper.href)) +
          '" target="_blank" rel="noopener noreferrer">' +
        '<span class="ach-paper__icon" aria-hidden="true"><i class="fas fa-file-lines"></i></span>' +
        '<div class="ach-paper__text">' +
          '<span class="ach-paper__kicker">' + esc(a.paper.title) + " · " + esc(a.paper.date) + "</span>" +
          '<span class="ach-paper__title">' + esc(a.paper.desc) + "</span>" +
        "</div>" +
        '<i class="fas fa-arrow-up-right-from-square ach-paper__go" aria-hidden="true"></i>' +
      "</a>"
    ) : "";

    var grads = ["blue", "purple", "teal", "orange", "green", "indigo"];
    var certs = (a.certs || []).map(function (c, i) {
      var g = grads[i % grads.length];
      return '<a class="glass wallet-card wallet-card--' + g + '" href="' + esc(safeHref(c.file)) +
          '" target="_blank" rel="noopener noreferrer">' +
        '<div class="wallet-card__top">' +
          '<i class="' + esc(c.icon) + ' wallet-card__icon" aria-hidden="true"></i>' +
          '<i class="fas fa-arrow-up-right-from-square wallet-card__go" aria-hidden="true"></i>' +
        "</div>" +
        '<div class="wallet-card__name">' + esc(c.name) + "</div>" +
        '<div class="wallet-card__foot">Certificate</div>' +
        "</a>";
    }).join("");

    el.innerHTML =
      '<div class="ach ios-animate-in">' +
        paper +
        '<h3 class="ach__section-title">Certifications</h3>' +
        '<div class="wallet-stack">' + certs + "</div>" +
      "</div>";
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════
     MESSAGES — iMessage chat thread + working composer
  ═══════════════════════════════════════════════════════════════════════ */
  function renderMessages() {
    var el = bodyOf("messages");
    if (!el || !P.contact) return false;
    var c = P.contact;

    function inbound(html) {
      return '<div class="imsg imsg--in"><div class="imsg__bubble">' + html + "</div></div>";
    }

    var thread =
      inbound(esc(c.intro)) +
      inbound("Reach me here:") +
      inbound(
        '<a href="mailto:' + esc(c.email) + '"><i class="fas fa-envelope" aria-hidden="true"></i> ' +
          esc(c.email) + "</a>"
      ) +
      inbound(
        '<a href="tel:' + esc((c.phone || "").replace(/[^0-9+]/g, "")) +
          '"><i class="fas fa-phone" aria-hidden="true"></i> ' + esc(c.phone) + "</a>"
      ) +
      inbound(
        '<a href="' + esc(safeHref(c.linkedin)) + '" target="_blank" rel="noopener noreferrer">' +
          '<i class="fab fa-linkedin-in" aria-hidden="true"></i> LinkedIn</a>'
      ) +
      inbound(
        '<a href="' + esc(safeHref(c.github)) + '" target="_blank" rel="noopener noreferrer">' +
          '<i class="fab fa-github" aria-hidden="true"></i> GitHub</a>'
      ) +
      inbound(
        '<a href="' + esc(safeHref(c.techrex)) + '" target="_blank" rel="noopener noreferrer">' +
          '<i class="fab fa-youtube" aria-hidden="true"></i> TechRex</a>'
      ) +
      inbound("Or send me a message right here 👇");

    el.innerHTML =
      '<div class="imsg-app">' +
        '<div class="imsg-app__contact glass">' +
          '<span class="imsg-app__avatar" aria-hidden="true">ST</span>' +
          '<div class="imsg-app__who"><b>Sai Teja Mothukuri</b><span>AI/ML Engineer</span></div>' +
        "</div>" +

        '<div class="imsg-thread" id="imsg-thread" role="log" aria-label="Contact info">' +
          thread +
        "</div>" +

        '<form class="imsg-compose glass" id="contactForm" autocomplete="off" novalidate>' +
          '<div class="imsg-compose__fields">' +
            '<input class="ios-input" id="name" name="name" type="text" placeholder="Your name" aria-label="Your name" required>' +
            '<input class="ios-input" id="email" name="email" type="email" placeholder="Your email" aria-label="Your email" required>' +
            '<input class="ios-input" id="subject" name="subject" type="text" placeholder="Subject" aria-label="Subject" required>' +
          "</div>" +
          '<div class="imsg-compose__row">' +
            '<textarea class="ios-textarea imsg-compose__text" id="message" name="message" rows="2" ' +
              'placeholder="iMessage" aria-label="Your message" required></textarea>' +
            '<button type="submit" class="imsg-compose__send" id="submitBtn" aria-label="Send message">' +
              '<i class="fas fa-arrow-up" id="btnIcon" aria-hidden="true"></i>' +
              '<span class="visually-hidden" id="btnText">Send Message</span>' +
            "</button>" +
          "</div>" +
          '<p class="imsg-compose__status" id="formStatus" role="status" aria-live="polite"></p>' +
        "</form>" +
      "</div>";

    wireContactForm(el);
    return true;
  }

  /* Contact form behavior — mirrors original assets/js/script.js:
     validate → loading state → POST JSON to apiEndpoint → success/error →
     append outbound bubble on success + reset. */
  function wireContactForm(scope) {
    var form = scope.querySelector("#contactForm");
    if (!form) return;
    var endpoint = (P.contact && P.contact.apiEndpoint) || "";

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    function showStatus(msg, type) {
      var s = scope.querySelector("#formStatus");
      if (!s) return;
      s.textContent = msg;
      s.className = "imsg-compose__status " + type;
      s.style.display = "block";
      if (type === "success") {
        setTimeout(function () { s.style.display = "none"; }, 5000);
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var submitBtn = scope.querySelector("#submitBtn");
      var btnIcon = scope.querySelector("#btnIcon");

      var data = {
        name: (scope.querySelector("#name") || {}).value || "",
        email: (scope.querySelector("#email") || {}).value || "",
        subject: (scope.querySelector("#subject") || {}).value || "",
        message: (scope.querySelector("#message") || {}).value || ""
      };
      data.name = data.name.trim();
      data.email = data.email.trim();
      data.subject = data.subject.trim();
      data.message = data.message.trim();

      if (!data.name || !data.email || !data.subject || !data.message) {
        showStatus("Please fill in all fields", "error");
        return;
      }
      if (!isValidEmail(data.email)) {
        showStatus("Please enter a valid email address", "error");
        return;
      }

      if (submitBtn) { submitBtn.classList.add("loading"); submitBtn.disabled = true; }
      if (btnIcon) btnIcon.className = "fas fa-spinner fa-spin";
      var s = scope.querySelector("#formStatus");
      if (s) s.style.display = "none";

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().catch(function () {
              return { message: "Server error: " + response.status + " " + response.statusText };
            }).then(function (errData) {
              var m = (errData && (errData.message || errData.error)) ||
                      ("Server error (" + response.status + ")");
              throw new Error(m);
            });
          }
          return response.json();
        })
        .then(function (result) {
          if (result && result.success) {
            appendOutbound(scope, data);
            showStatus(result.message || "Message sent successfully! I'll get back to you soon.", "success");
            form.reset();
          } else {
            showStatus((result && result.message) || "Failed to send message. Please try again.", "error");
          }
        })
        .catch(function (error) {
          var msg = "Network error. Please check your connection and try again.";
          if (error && error.name === "TypeError" && /fetch/.test(error.message || "")) {
            msg = "Connection error. Please check your internet connection.";
          } else if (error && error.message) {
            msg = "Error: " + error.message;
          }
          showStatus(msg, "error");
        })
        .then(function () {
          if (submitBtn) { submitBtn.classList.remove("loading"); submitBtn.disabled = false; }
          if (btnIcon) btnIcon.className = "fas fa-arrow-up";
        });
    });
  }

  function appendOutbound(scope, data) {
    var thread = scope.querySelector("#imsg-thread");
    if (!thread) return;
    var div = document.createElement("div");
    div.className = "imsg imsg--out";
    div.innerHTML = '<div class="imsg__bubble imsg__bubble--out">' +
      "<b>" + esc(data.subject) + "</b><br>" + esc(data.message) +
      '<span class="imsg__delivered">Delivered</span></div>';
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  /* ════════════════════════════════════════════════════════════════════
     SETTINGS — theme toggle · about this build · classic Win95 link
  ═══════════════════════════════════════════════════════════════════════ */
  function renderSettings() {
    var el = bodyOf("settings");
    if (!el) return false;

    var isLight = (window.iOS && window.iOS.getTheme && window.iOS.getTheme() === "light");

    el.innerHTML =
      '<div class="settings ios-animate-in">' +

        '<div class="glass ios-card settings-group">' +
          '<div class="settings-row settings-row--toggle">' +
            '<span class="settings-row__lead">' +
              '<span class="settings-row__icon settings-row__icon--purple" aria-hidden="true">' +
                '<i class="fas fa-circle-half-stroke"></i></span>' +
              '<span class="settings-row__label">Dark Mode</span>' +
            "</span>" +
            '<button type="button" class="ios-switch" id="set-theme-switch" role="switch" ' +
              'aria-checked="' + (isLight ? "false" : "true") + '" aria-label="Toggle dark mode">' +
              '<span class="ios-switch__knob" aria-hidden="true"></span>' +
            "</button>" +
          "</div>" +
          '<hr class="ios-divider">' +
          '<div class="settings-row">' +
            '<span class="settings-row__lead">' +
              '<span class="settings-row__icon settings-row__icon--gray" aria-hidden="true">' +
                '<i class="fas fa-moon"></i></span>' +
              '<span class="settings-row__label">Appearance</span>' +
            "</span>" +
            '<span class="settings-row__value" id="set-theme-value">' +
              (isLight ? "Light" : "Dark") + "</span>" +
          "</div>" +
        "</div>" +

        '<h3 class="settings-section-title">About This Build</h3>' +
        '<div class="glass ios-card settings-group">' +
          '<div class="settings-row">' +
            '<span class="settings-row__label">Design</span>' +
            '<span class="settings-row__value">iOS / iPadOS 26 · Liquid Glass</span>' +
          "</div>" +
          '<hr class="ios-divider">' +
          '<div class="settings-row settings-row--stack">' +
            '<span class="settings-row__label">Credit</span>' +
            '<span class="settings-row__value">Apple Design Resources iOS 26 UI Kit</span>' +
          "</div>" +
          '<hr class="ios-divider">' +
          '<div class="settings-row">' +
            '<span class="settings-row__label">Built by</span>' +
            '<span class="settings-row__value">Sai Teja Mothukuri</span>' +
          "</div>" +
        "</div>" +

        '<h3 class="settings-section-title">More</h3>' +
        '<div class="glass ios-card settings-group">' +
          '<a class="settings-row settings-row--link" href="https://saitejamothukuri.com" ' +
              'target="_blank" rel="noopener noreferrer">' +
            '<span class="settings-row__lead">' +
              '<span class="settings-row__icon settings-row__icon--blue" aria-hidden="true">' +
                '<i class="fas fa-desktop"></i></span>' +
              '<span class="settings-row__label">Classic Windows 95 Portfolio</span>' +
            "</span>" +
            '<i class="fas fa-chevron-right settings-row__chev" aria-hidden="true"></i>' +
          "</a>" +
        "</div>" +

        '<p class="settings-footer">Sai Teja Mothukuri · AI/ML Engineer</p>' +
      "</div>";

    wireSettings(el);
    return true;
  }

  function wireSettings(scope) {
    var sw = scope.querySelector("#set-theme-switch");
    if (!sw) return;
    sw.addEventListener("click", function () {
      if (window.iOS && window.iOS.toggleTheme) window.iOS.toggleTheme();
      reflectTheme(scope);
    });
    // keep in sync if theme changed elsewhere (Control Center, etc.)
    document.addEventListener("ios:appopen", function (e) {
      if (e.detail && e.detail.id === "settings") reflectTheme(scope);
    });
  }

  function reflectTheme(scope) {
    var isLight = (window.iOS && window.iOS.getTheme && window.iOS.getTheme() === "light");
    var sw = scope.querySelector("#set-theme-switch");
    var val = scope.querySelector("#set-theme-value");
    if (sw) sw.setAttribute("aria-checked", isLight ? "false" : "true");
    if (val) val.textContent = isLight ? "Light" : "Dark";
  }

  /* ════════════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════════════ */
  function renderAll() {
    renderAbout();
    renderProjects();
    renderJourney();
    renderSkills();
    renderAchievements();
    renderMessages();
    renderSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }
})();
