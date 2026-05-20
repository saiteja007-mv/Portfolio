/**
 * win95-desktop.js — Variant A: Windows 95 Desktop OS Simulation
 *
 * Provides:
 *  - Boot splash sequence
 *  - WM (window manager): open, close, minimize, maximize/restore, focus/raise, drag
 *  - Taskbar task buttons (reflect open/focused windows)
 *  - Start menu toggle + close-on-outside-click
 *  - Live clock
 *  - Desktop icon single-click select, double-click open (touch: single tap opens)
 *  - Contact form: POSTs JSON to AWS API Gateway
 *  - Keyboard: Esc closes focused window, Enter on icons opens
 *
 * Pruned from script.js: cursor follower, parallax, typing effect, scroll
 * progress bar, tilt, magnetic buttons, IntersectionObserver section reveals,
 * flip card charts, notification system (none needed in desktop sim).
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     BOOT SPLASH
  ══════════════════════════════════════════════════════════════════ */
  (function bootSplash() {
    // Honor prefers-reduced-motion — CSS already hides it; also skip in JS
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var splash = document.getElementById('boot-splash');
    if (!splash) return;

    var bar = document.getElementById('boot-bar');
    var pct = 0;
    var interval = setInterval(function () {
      pct += Math.random() * 18 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setTimeout(function () {
          splash.classList.add('fade-out');
          setTimeout(function () { splash.style.display = 'none'; }, 500);
        }, 250);
      }
      if (bar) bar.style.width = Math.min(pct, 100) + '%';
    }, 90);
  })();


  /* ══════════════════════════════════════════════════════════════════
     LIVE CLOCK
  ══════════════════════════════════════════════════════════════════ */
  function updateClock() {
    var el = document.getElementById('clock-time');
    if (!el) return;
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    el.textContent = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }
  updateClock();
  setInterval(updateClock, 15000); // check every 15s (updates on minute change)


  /* ══════════════════════════════════════════════════════════════════
     WINDOW MANAGER
  ══════════════════════════════════════════════════════════════════ */

  // Window state registry
  var windows = {};
  var zBase = 200;        // z-index base for windows
  var zCounter = zBase;
  var focusedWin = null;  // currently focused window id

  // Cascade offset for new windows
  var CASCADE_X = 24, CASCADE_Y = 24;
  var cascadeStep = 0;

  function getDefaultRect(winId) {
    var isMobile = window.innerWidth <= 700;
    if (isMobile) {
      return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - 30 };
    }
    var desktopW = window.innerWidth;
    var desktopH = window.innerHeight - 30;
    var w = Math.min(680, desktopW - 40);
    var h = Math.min(520, desktopH - 40);
    // Cascade offset
    var offset = (cascadeStep % 8) * CASCADE_X;
    var x = 60 + offset;
    var y = 30 + offset;
    // clamp
    x = Math.max(0, Math.min(x, desktopW - w - 10));
    y = Math.max(0, Math.min(y, desktopH - h - 10));
    cascadeStep++;
    return { x: x, y: y, w: w, h: h };
  }

  var WM = window.WM = {

    open: function (winId) {
      var el = document.getElementById(winId);
      if (!el) return;

      if (!windows[winId]) {
        // First open — initialize state
        var rect = getDefaultRect(winId);
        windows[winId] = {
          el: el,
          x: rect.x, y: rect.y,
          w: rect.w, h: rect.h,
          minimized: false,
          maximized: false,
          prevRect: null,
          taskBtn: null
        };
        applyRect(winId);
      } else if (windows[winId].minimized) {
        // Restore from minimized
        windows[winId].minimized = false;
        el.style.display = 'flex';
        taskBtnSetActive(winId, true);
      }

      el.style.display = 'flex';
      WM.focus(winId);
      taskBtnCreate(winId);
    },

    close: function (winId) {
      var st = windows[winId];
      if (!st) return;
      st.el.style.display = 'none';
      taskBtnRemove(winId);
      if (focusedWin === winId) focusedWin = null;
      delete windows[winId];
    },

    minimize: function (winId) {
      var st = windows[winId];
      if (!st || st.minimized) return;
      st.minimized = true;
      st.el.style.display = 'none';
      taskBtnSetActive(winId, false);
      if (focusedWin === winId) {
        focusedWin = null;
        // Focus topmost remaining window
        var top = topWindow();
        if (top) WM.focus(top);
      }
    },

    toggleMax: function (winId) {
      var st = windows[winId];
      if (!st) return;
      if (st.maximized) {
        // Restore
        st.maximized = false;
        applyRect(winId);
        var el = st.el;
        el.style.left = st.prevRect.x + 'px';
        el.style.top  = st.prevRect.y + 'px';
        el.style.width  = st.prevRect.w + 'px';
        el.style.height = st.prevRect.h + 'px';
      } else {
        // Maximize
        st.prevRect = { x: st.x, y: st.y, w: st.w, h: st.h };
        st.maximized = true;
        var el = st.el;
        el.style.left = '0px';
        el.style.top  = '0px';
        el.style.width  = window.innerWidth + 'px';
        el.style.height = (window.innerHeight - 30) + 'px';
      }
    },

    focus: function (winId) {
      // De-activate previous
      if (focusedWin && focusedWin !== winId) {
        var prev = windows[focusedWin];
        if (prev) {
          prev.el.querySelector('.w95-titlebar').classList.add('is-inactive');
          taskBtnSetActive(focusedWin, false);
        }
      }
      focusedWin = winId;
      var st = windows[winId];
      if (!st) return;
      // Raise z-index
      zCounter++;
      st.el.style.zIndex = zCounter;
      // Activate titlebar
      var tb = st.el.querySelector('.w95-titlebar');
      if (tb) tb.classList.remove('is-inactive');
      taskBtnSetActive(winId, true);
    }
  };

  function applyRect(winId) {
    var st = windows[winId];
    if (!st) return;
    st.el.style.left   = st.x + 'px';
    st.el.style.top    = st.y + 'px';
    st.el.style.width  = st.w + 'px';
    st.el.style.height = st.h + 'px';
  }

  function topWindow() {
    var maxZ = -1, topId = null;
    Object.keys(windows).forEach(function (id) {
      var st = windows[id];
      var z = parseInt(st.el.style.zIndex || 0);
      if (!st.minimized && z > maxZ) { maxZ = z; topId = id; }
    });
    return topId;
  }


  /* ── Window click-to-focus ─────────────────────────────────────── */
  document.addEventListener('mousedown', function (e) {
    var win = e.target.closest('.desk-window');
    if (win && win.id && windows[win.id]) {
      if (focusedWin !== win.id) WM.focus(win.id);
    }
  }, true);


  /* ── Drag by titlebar ─────────────────────────────────────────── */
  (function setupDrag() {
    var dragging = false;
    var dragId = null;
    var startMX, startMY, startWX, startWY;

    document.addEventListener('mousedown', function (e) {
      var tb = e.target.closest('.w95-titlebar');
      if (!tb) return;
      // Don't drag when clicking controls
      if (e.target.closest('.w95-titlebar__controls')) return;

      var win = tb.closest('.desk-window');
      if (!win || !windows[win.id]) return;
      var st = windows[win.id];
      if (st.maximized) return;

      dragging = true;
      dragId = win.id;
      startMX = e.clientX;
      startMY = e.clientY;
      startWX = st.x;
      startWY = st.y;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging || !dragId) return;
      var st = windows[dragId];
      if (!st) return;
      var dx = e.clientX - startMX;
      var dy = e.clientY - startMY;
      var newX = startWX + dx;
      var newY = startWY + dy;
      // Clamp to viewport
      newX = Math.max(-(st.w - 80), Math.min(window.innerWidth - 80, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 60, newY));
      st.x = newX;
      st.y = newY;
      st.el.style.left = newX + 'px';
      st.el.style.top  = newY + 'px';
    });

    document.addEventListener('mouseup', function () {
      dragging = false;
      dragId = null;
    });

    // Touch drag
    document.addEventListener('touchstart', function (e) {
      var tb = e.target.closest('.w95-titlebar');
      if (!tb) return;
      if (e.target.closest('.w95-titlebar__controls')) return;
      var win = tb.closest('.desk-window');
      if (!win || !windows[win.id]) return;
      var st = windows[win.id];
      if (st.maximized) return;
      dragging = true;
      dragId = win.id;
      var t = e.touches[0];
      startMX = t.clientX; startMY = t.clientY;
      startWX = st.x;      startWY = st.y;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!dragging || !dragId) return;
      var st = windows[dragId];
      if (!st) return;
      var t = e.touches[0];
      var newX = startWX + (t.clientX - startMX);
      var newY = startWY + (t.clientY - startMY);
      newX = Math.max(-(st.w - 80), Math.min(window.innerWidth - 80, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 60, newY));
      st.x = newX; st.y = newY;
      st.el.style.left = newX + 'px';
      st.el.style.top  = newY + 'px';
    }, { passive: true });

    document.addEventListener('touchend', function () {
      dragging = false; dragId = null;
    });
  })();


  /* ══════════════════════════════════════════════════════════════════
     TASKBAR — task buttons
  ══════════════════════════════════════════════════════════════════ */
  var taskContainer = document.getElementById('taskbar-tasks');

  // Icon class map: window id → w95-ico class
  var iconMap = {
    'win-about':   'w95-ico--my-computer',
    'win-work':    'w95-ico--folder',
    'win-journey': 'w95-ico--tree',
    'win-viz':     'w95-ico--paint',
    'win-skills':  'w95-ico--programs',
    'win-certs':   'w95-ico--help',
    'win-contact': 'w95-ico--notepad',
    'win-resume':  'w95-ico--file',
    'win-recycle': 'w95-ico--recycle-empty'
  };

  // Label map
  var labelMap = {
    'win-about':   'About Me',
    'win-work':    'My Work',
    'win-journey': 'Journey',
    'win-viz':     'Visualizations',
    'win-skills':  'Skills',
    'win-certs':   'Certifications',
    'win-contact': 'Contact',
    'win-resume':  'Resume.pdf',
    'win-recycle': 'Recycle Bin'
  };

  function taskBtnCreate(winId) {
    if (!taskContainer) return;
    var st = windows[winId];
    if (!st) return;
    if (st.taskBtn) return; // already exists

    var btn = document.createElement('button');
    btn.className = 'w95-task';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('title', labelMap[winId] || winId);
    btn.setAttribute('aria-label', (labelMap[winId] || winId) + ' window');
    btn.dataset.win = winId;

    var ico = document.createElement('span');
    ico.className = 'w95-task__icon ' + (iconMap[winId] || 'w95-ico--file');
    ico.setAttribute('aria-hidden', 'true');

    var lbl = document.createElement('span');
    lbl.className = 'w95-task__label';
    lbl.textContent = labelMap[winId] || winId;

    btn.appendChild(ico);
    btn.appendChild(lbl);

    btn.addEventListener('click', function () {
      var s = windows[winId];
      if (!s) return;
      if (s.minimized) {
        WM.open(winId);
      } else if (focusedWin === winId) {
        WM.minimize(winId);
      } else {
        if (s.el.style.display === 'none') {
          s.minimized = false;
          s.el.style.display = 'flex';
        }
        WM.focus(winId);
      }
    });

    taskContainer.appendChild(btn);
    st.taskBtn = btn;
  }

  function taskBtnRemove(winId) {
    var st = windows[winId];
    if (!st || !st.taskBtn) return;
    st.taskBtn.remove();
    st.taskBtn = null;
  }

  function taskBtnSetActive(winId, active) {
    var st = windows[winId];
    if (!st || !st.taskBtn) return;
    st.taskBtn.classList.toggle('is-active', active);
  }


  /* ══════════════════════════════════════════════════════════════════
     START MENU
  ══════════════════════════════════════════════════════════════════ */
  var startBtn = document.getElementById('startBtn');
  var startMenu = document.getElementById('startmenu');

  window.toggleStartMenu = function () {
    if (!startMenu || !startBtn) return;
    var open = !startMenu.hidden;
    if (open) {
      closeStartMenu();
    } else {
      startMenu.hidden = false;
      startBtn.classList.add('is-pressed');
      startBtn.setAttribute('aria-expanded', 'true');
    }
  };

  window.closeStartMenu = function () {
    if (!startMenu || !startBtn) return;
    startMenu.hidden = true;
    startBtn.classList.remove('is-pressed');
    startBtn.setAttribute('aria-expanded', 'false');
  };

  // Close on outside click
  document.addEventListener('mousedown', function (e) {
    if (startMenu && !startMenu.hidden) {
      if (!startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
        closeStartMenu();
      }
    }
  });

  // Shut Down easter egg
  window.shutDown = function () {
    closeStartMenu();
    var dlg = document.getElementById('shutdown-dialog');
    if (dlg) dlg.style.display = 'flex';
  };


  /* ══════════════════════════════════════════════════════════════════
     KEYBOARD ACCESSIBILITY
  ══════════════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      // Close start menu first if open
      if (startMenu && !startMenu.hidden) {
        closeStartMenu();
        return;
      }
      // Close shutdown dialog if open
      var dlg = document.getElementById('shutdown-dialog');
      if (dlg && dlg.style.display !== 'none') {
        dlg.style.display = 'none';
        return;
      }
      // Close focused window
      if (focusedWin) {
        WM.close(focusedWin);
      }
    }
  });


  /* ══════════════════════════════════════════════════════════════════
     DESKTOP ICON — single-click select, double-click open
     Touch: single tap = open
  ══════════════════════════════════════════════════════════════════ */
  (function setupIcons() {
    var icons = document.querySelectorAll('.w95-deskicon');
    var selectedIcon = null;
    var clickTimer = null;
    var DBLCLICK_DELAY = 300;
    var touchMoved = false;

    icons.forEach(function (icon) {
      // Mouse: single click selects, double-click opens
      icon.addEventListener('click', function (e) {
        e.stopPropagation();
        if (clickTimer) {
          // Double-click detected
          clearTimeout(clickTimer);
          clickTimer = null;
          var winId = icon.dataset.win;
          if (winId) WM.open(winId);
          icon.classList.remove('is-selected');
          selectedIcon = null;
        } else {
          // Single click — select after delay
          clickTimer = setTimeout(function () {
            clickTimer = null;
            if (selectedIcon && selectedIcon !== icon) {
              selectedIcon.classList.remove('is-selected');
            }
            icon.classList.add('is-selected');
            selectedIcon = icon;
          }, DBLCLICK_DELAY);
        }
      });

      // Touch: single tap opens immediately
      icon.addEventListener('touchstart', function () { touchMoved = false; }, { passive: true });
      icon.addEventListener('touchmove',  function () { touchMoved = true; },  { passive: true });
      icon.addEventListener('touchend', function (e) {
        if (touchMoved) return;
        e.preventDefault();
        var winId = icon.dataset.win;
        if (winId) WM.open(winId);
      });
    });

    // Click on desktop background deselects all icons
    document.getElementById('desktop').addEventListener('click', function (e) {
      if (e.target === this || e.target.classList.contains('desktop-icon-grid')) {
        icons.forEach(function (i) { i.classList.remove('is-selected'); });
        selectedIcon = null;
        closeStartMenu();
      }
    });
  })();


  /* ══════════════════════════════════════════════════════════════════
     CONTACT FORM — AWS API Gateway
  ══════════════════════════════════════════════════════════════════ */
  (function setupContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn  = document.getElementById('w95-submitBtn');
      var btnText    = document.getElementById('w95-btnText');
      var btnIcon    = document.getElementById('w95-btnIcon');
      var formStatus = document.getElementById('w95-formStatus');

      var formData = {
        name:    document.getElementById('w95-name').value.trim(),
        email:   document.getElementById('w95-email').value.trim(),
        subject: document.getElementById('w95-subject').value.trim(),
        message: document.getElementById('w95-message').value.trim()
      };

      // Basic validation
      if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        showStatus(formStatus, 'Please fill in all fields', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        showStatus(formStatus, 'Please enter a valid email address', 'error');
        return;
      }

      // Loading state
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-pressed'); }
      if (btnText) btnText.textContent = 'Sending...';
      if (btnIcon) btnIcon.className = 'fas fa-spinner fa-spin';
      if (formStatus) formStatus.style.display = 'none';

      fetch('https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () { return {}; }).then(function (errData) {
            throw new Error(errData.message || errData.error || 'Server error ' + response.status);
          });
        }
        return response.json();
      })
      .then(function (result) {
        if (result.success) {
          showStatus(formStatus, result.message || "Message sent! I'll get back to you soon.", 'success');
          form.reset();
          // Update statusbar
          var sb = document.querySelector('#win-contact .w95-statusfield');
          if (sb) sb.textContent = 'Message sent';
        } else {
          showStatus(formStatus, result.message || 'Failed to send message. Please try again.', 'error');
        }
      })
      .catch(function (err) {
        var msg = 'Network error. Please check your connection and try again.';
        if (err && err.message) msg = err.message;
        showStatus(formStatus, msg, 'error');
      })
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-pressed'); }
        if (btnText) btnText.textContent = 'Send Message';
        if (btnIcon) btnIcon.className = 'fas fa-paper-plane';
      });
    });

    function showStatus(el, message, type) {
      if (!el) return;
      el.textContent = message;
      el.className = 'form-status-w95 ' + type;
      el.style.display = 'block';
      if (type === 'success') {
        setTimeout(function () { el.style.display = 'none'; }, 6000);
      }
    }
  })();


  /* ══════════════════════════════════════════════════════════════════
     AUTO-OPEN WELCOME (About window on load for first-time visitors)
  ══════════════════════════════════════════════════════════════════ */
  window.addEventListener('load', function () {
    // Small delay so boot splash runs first
    setTimeout(function () {
      WM.open('win-about');
    }, 1600);
  });

})();
