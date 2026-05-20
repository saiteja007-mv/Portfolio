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
     POWER-ON INTRO  +  BOOT SPLASH
     The page opens on the CRT "power screen". Clicking the power button
     runs the boot splash, then opens the desktop (About window).
  ══════════════════════════════════════════════════════════════════ */
  // Boot length tracks the boot sound (assets/win95/sounds/Bootup sound.mp3 ≈ 6.7s).
  var BOOT_SECONDS = 6.7;

  // Runs the boot splash. Progress bar follows the boot audio when it plays,
  // otherwise a timer of BOOT_SECONDS. Completes on the audio's 'ended' event
  // (or the timer as a safety net), THEN calls done() to reveal the desktop.
  function startBoot(audio, done) {
    var splash = document.getElementById('boot-splash');
    if (!splash) { if (done) done(); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      splash.style.display = 'none';
      if (done) done();
      return;
    }
    splash.style.display = 'flex';
    var bar = document.getElementById('boot-bar');
    var start = Date.now();
    var audioOk = false;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(iv);
      if (bar) bar.style.width = '100%';
      setTimeout(function () {
        splash.classList.add('fade-out');
        setTimeout(function () {
          splash.style.display = 'none';
          if (done) done();              // desktop revealed only now
        }, 500);
      }, 150);
    }

    if (audio) {
      audio.addEventListener('timeupdate', function () {
        if (audio.duration && isFinite(audio.duration)) {
          audioOk = true;
          if (bar) bar.style.width = Math.min(100, (audio.currentTime / audio.duration) * 100) + '%';
        }
      });
      audio.addEventListener('ended', finish);
    }

    var iv = setInterval(function () {
      var elapsed = (Date.now() - start) / 1000;
      if (!audioOk && bar) bar.style.width = Math.min(100, (elapsed / BOOT_SECONDS) * 100) + '%';
      if (elapsed >= BOOT_SECONDS + 1.2) finish();   // safety net if 'ended' never fires
    }, 60);
  }

  (function setupPowerOn() {
    var screen = document.getElementById('power-screen');
    var audio = document.getElementById('boot-sound');

    // No power screen? Boot straight to the desktop.
    if (!screen) { startBoot(audio, function () { WM.open('win-about'); }); return; }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function powerOn() {
      if (screen.dataset.done) return;
      screen.dataset.done = '1';

      // Start the boot sound inside the click gesture (autoplay-policy safe).
      if (audio) {
        try { audio.currentTime = 0; var p = audio.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      }

      if (reduce) {
        if (audio) { try { audio.pause(); } catch (e) {} }
        screen.style.display = 'none';
        WM.open('win-about');
        return;
      }

      screen.classList.add('powering');              // CRT flash on the glass
      setTimeout(function () {
        // Show the boot splash FIRST (it sits below the power screen at a lower
        // z-index), THEN fade the intro out to reveal it — so the desktop is
        // never visible until boot finishes.
        startBoot(audio, function () { WM.open('win-about'); });
        screen.classList.add('off');
        setTimeout(function () { screen.style.display = 'none'; }, 450);
      }, 550);
    }
    window.powerOn = powerOn;

    // Shut Down brings the machine back to the CRT power-on screen so the
    // user can boot again — same as flipping the switch off then on.
    window.resetToPowerScreen = function () {
      // Close every open window
      Object.keys(windows).forEach(function (id) { try { WM.close(id); } catch (e) {} });
      if (window.closeStartMenu) window.closeStartMenu();
      var sd = document.getElementById('shutdown-dialog'); if (sd) sd.style.display = 'none';
      var bs = document.getElementById('boot-splash');
      if (bs) { bs.style.display = 'none'; bs.classList.remove('fade-out'); }
      if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (e) {} }
      if (screen) {
        delete screen.dataset.done;
        screen.classList.remove('powering', 'off');
        screen.style.display = '';
      }
      if (btn) setTimeout(function () { try { btn.focus(); } catch (e) {} }, 100);
    };

    var btn = document.getElementById('power-btn');
    var glass = document.getElementById('power-glass');
    if (btn) btn.addEventListener('click', powerOn);
    // Only the green power button boots the desktop — clicking the screen/glass does NOT.
    // Focus the power button so keyboard users can hit Enter/Space
    if (btn) setTimeout(function () { try { btn.focus(); } catch (e) {} }, 200);
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
    // Per-window default size overrides (smaller dialogs)
    var SIZE_OVERRIDE = {
      'win-display': { w: 320, h: 472 },
      'win-calc':    { w: 264, h: 322 },
      'win-notepad': { w: 540, h: 400 },
      'win-paint':   { w: 600, h: 462 },
      'win-wordpad': { w: 560, h: 440 },
      'win-dialer':  { w: 300, h: 430 },
      'win-folder':  { w: 460, h: 320 },
      'win-sound':   { w: 320, h: 196 },
      'win-filedlg': { w: 440, h: 350 }
    };
    var sz = SIZE_OVERRIDE[winId];
    var w = Math.min(sz ? sz.w : 680, desktopW - 40);
    var h = Math.min(sz ? sz.h : 520, desktopH - 40);
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
    var lastX, lastY, dragOutline = null;

    // The "ghost" rectangle that follows the cursor while moving a window.
    // Win95 default ("show window contents while dragging" = off): the window
    // stays put and a dotted outline tracks the mouse, snapping on release.
    function ensureOutline() {
      if (!dragOutline) {
        dragOutline = document.createElement('div');
        dragOutline.className = 'win-drag-outline';
        dragOutline.setAttribute('aria-hidden', 'true');
        document.body.appendChild(dragOutline);
      }
      return dragOutline;
    }
    function positionOutline(st, x, y) {
      var o = ensureOutline();
      o.style.display = 'block';
      o.style.left = x + 'px';
      o.style.top = y + 'px';
      o.style.width = st.w + 'px';
      o.style.height = st.h + 'px';
    }
    function hideOutline() { if (dragOutline) dragOutline.style.display = 'none'; }

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
      lastX = st.x; lastY = st.y;
      positionOutline(st, st.x, st.y);
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
      lastX = newX; lastY = newY;
      // Move only the outline — the window jumps to it on mouseup.
      positionOutline(st, newX, newY);
    });

    document.addEventListener('mouseup', function () {
      if (dragging && dragId) {
        var st = windows[dragId];
        if (st) {
          st.x = lastX; st.y = lastY;
          st.el.style.left = lastX + 'px';
          st.el.style.top  = lastY + 'px';
        }
      }
      hideOutline();
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
    'win-about':    'w95-ico--my-computer',
    'win-work':     'w95-ico--folder',
    'win-journey':  'w95-ico--tree',
    'win-viz':      'w95-ico--paint',
    'win-skills':   'w95-ico--programs',
    'win-certs':    'w95-ico--help',
    'win-contact':  'w95-ico--notepad',
    'win-ie':       'w95-ico--internet',
    'win-explorer': 'w95-ico--hard-drive',
    'win-recycle':  'w95-ico--recycle-empty',
    'win-display':  'w95-ico--settings',
    'win-calc':     'w95-ico--programs',
    'win-notepad':  'w95-ico--notepad',
    'win-paint':    'w95-ico--paint',
    'win-wordpad':  'w95-ico--file',
    'win-dialer':   'w95-ico--programs',
    'win-folder':   'w95-ico--folder',
    'win-sound':    'w95-ico--midi-file',
    'win-filedlg':  'w95-ico--folder'
  };

  // Label map
  var labelMap = {
    'win-about':    'About Me',
    'win-work':     'My Work',
    'win-journey':  'Journey',
    'win-viz':      'Visualizations',
    'win-skills':   'Skills',
    'win-certs':    'Certifications',
    'win-contact':  'Contact',
    'win-ie':       'Internet Explorer',
    'win-explorer': 'My Computer',
    'win-recycle':  'Recycle Bin',
    'win-display':  'Display Properties',
    'win-calc':     'Calculator',
    'win-notepad':  'Notepad',
    'win-paint':    'Paint',
    'win-wordpad':  'WordPad',
    'win-dialer':   'Phone Dialer',
    'win-folder':   'Folder',
    'win-sound':    'Sound Recorder',
    'win-filedlg':  'Save As'
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

  // Shut Down — open the confirm dialog
  window.shutDown = function () {
    closeStartMenu();
    var dlg = document.getElementById('shutdown-dialog');
    if (dlg) dlg.style.display = 'flex';
  };

  // Confirmed shutdown: show the "safe to turn off" screen, then drop back to
  // the CRT power-on screen so the portfolio can be booted again.
  window.doShutdown = function () {
    var dlg = document.getElementById('shutdown-dialog');
    if (dlg) dlg.style.display = 'none';
    closeStartMenu();
    var sds = document.getElementById('shutdown-screen');
    if (!sds) { if (window.resetToPowerScreen) window.resetToPowerScreen(); return; }
    sds.style.display = 'flex';
    setTimeout(function () {
      sds.style.display = 'none';
      if (window.resetToPowerScreen) window.resetToPowerScreen();
    }, 2200);
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
        // If a drag just finished, swallow the click
        if (icon.dataset.wasDragged) return;
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
     FEATURE 1 — DRAGGABLE DESKTOP ICONS (persist positions)
  ══════════════════════════════════════════════════════════════════ */
  (function setupDraggableIcons() {
    var isMobile = window.innerWidth <= 700;
    var grid = document.getElementById('desktop-icons');
    var desktop = document.getElementById('desktop');
    if (!grid || !desktop) return;

    // Old builds persisted icon positions in localStorage, which could restore
    // a stale / half-arranged (overlapping) layout on boot. Icons now always
    // start in a clean auto-arranged grid; dragging is session-only. Clear any
    // leftover saved state so the bug can't resurface.
    try { localStorage.removeItem('w95.iconPos'); } catch (e) {}

    // Grid becomes an absolute layer; icons are absolutely positioned in it.
    grid.style.position = 'absolute';
    grid.style.display = 'block';
    grid.style.top = '0'; grid.style.left = '0';
    grid.style.width = '0'; grid.style.height = '0';
    grid.style.overflow = 'visible';

    var ICON_W = 72, ICON_H = 72, ICON_GAP = 6, COL_W = 88, START_X = 8, START_Y = 8;

    // Clean column-major layout that wraps to a new column when it runs out of
    // vertical room — icons are always aligned on boot, never stacked.
    function autoLayout() {
      var icons = Array.prototype.slice.call(grid.querySelectorAll('.w95-deskicon'));
      var deskH = desktop.offsetHeight || (window.innerHeight - 30);
      var rpc = Math.max(1, Math.floor((deskH - START_Y) / (ICON_H + ICON_GAP)));
      icons.forEach(function (icon, i) {
        var col = Math.floor(i / rpc), row = i % rpc;
        icon.style.position = 'absolute';
        icon.style.width = ICON_W + 'px';
        icon.style.textAlign = 'center';
        icon.style.left = (START_X + col * COL_W) + 'px';
        icon.style.top  = (START_Y + row * (ICON_H + ICON_GAP)) + 'px';
      });
    }
    autoLayout();
    window.__w95autoLayout = autoLayout;   // Arrange Icons / Auto Arrange reuse this

    if (isMobile) return; // no drag on mobile

    var DRAG_THRESHOLD = 5;
    Array.prototype.slice.call(grid.querySelectorAll('.w95-deskicon')).forEach(function (icon) {
      var startMX, startMY, startIX, startIY, isDragging = false, moved = false;

      icon.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startMX = e.clientX; startMY = e.clientY;
        startIX = parseInt(icon.style.left, 10) || 0;
        startIY = parseInt(icon.style.top,  10) || 0;
        isDragging = true; moved = false;
        e.stopPropagation();
      });

      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var dx = e.clientX - startMX, dy = e.clientY - startMY;
        if (!moved && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        moved = true;
        var deskH = desktop.offsetHeight || (window.innerHeight - 30);
        var deskW = desktop.offsetWidth || window.innerWidth;
        icon.style.left = Math.max(0, Math.min(deskW - ICON_W, startIX + dx)) + 'px';
        icon.style.top  = Math.max(0, Math.min(deskH - ICON_H, startIY + dy)) + 'px';
        icon.style.zIndex = 50;
      });

      document.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        icon.style.zIndex = '';
        if (moved) { icon.dataset.wasDragged = '1'; setTimeout(function () { delete icon.dataset.wasDragged; }, 50); }
      });
    });
  })();


  /* ══════════════════════════════════════════════════════════════════
     FEATURE 2 — RESIZABLE WINDOWS (bottom-right grip)
  ══════════════════════════════════════════════════════════════════ */
  (function setupResize() {
    var isMobile = window.innerWidth <= 700;
    if (isMobile) return;

    var MIN_W = 300, MIN_H = 200;
    var resizing = false, resizeId = null;
    var startMX, startMY, startW, startH;

    // Append resize grip to every existing desk-window
    document.querySelectorAll('.desk-window').forEach(function(win) {
      var grip = document.createElement('div');
      grip.className = 'win-resize-grip';
      grip.setAttribute('aria-hidden', 'true');
      win.appendChild(grip);

      grip.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var st = windows[win.id];
        if (!st || st.maximized) return;
        resizing = true;
        resizeId = win.id;
        startMX = e.clientX; startMY = e.clientY;
        startW = st.w; startH = st.h;
      });
    });

    document.addEventListener('mousemove', function(e) {
      if (!resizing || !resizeId) return;
      var st = windows[resizeId];
      if (!st) return;
      var deskW = window.innerWidth, deskH = window.innerHeight - 30;
      var newW = Math.max(MIN_W, Math.min(deskW - st.x, startW + (e.clientX - startMX)));
      var newH = Math.max(MIN_H, Math.min(deskH - st.y, startH + (e.clientY - startMY)));
      st.w = newW; st.h = newH;
      st.el.style.width  = newW + 'px';
      st.el.style.height = newH + 'px';
    });

    document.addEventListener('mouseup', function() {
      resizing = false; resizeId = null;
    });
  })();


  /* ══════════════════════════════════════════════════════════════════
     FEATURE 3 — INTERNET EXPLORER WINDOW  +  LINK INTERCEPTION
  ══════════════════════════════════════════════════════════════════ */
  (function setupIE() {
    var FRAMABLE_HOSTS = ['drive.google.com', 'public.tableau.com', 'app.powerbi.com'];

    function isFramable(url) {
      if (!url) return false;
      // Relative / same-origin paths
      if (url.charAt(0) !== 'h' || url.indexOf('://') === -1) return true;
      try {
        var u = new URL(url);
        var host = u.hostname;
        // PDFs usually allow framing — try them in the iframe
        if (/\.pdf($|\?)/i.test(u.pathname)) return true;
        // Explicit allow-list
        for (var i = 0; i < FRAMABLE_HOSTS.length; i++) {
          if (host === FRAMABLE_HOSTS[i] || host.endsWith('.' + FRAMABLE_HOSTS[i])) return true;
        }
        // Same origin
        if (host === window.location.hostname) return true;
      } catch(e) {}
      return false;
    }

    /* ── Local "retro" pages for sites that block being framed ──────────
       LinkedIn / GitHub / JETIR / YouTube can't load in an iframe, so we
       render an authentic period-styled page inside IE instead of ever
       punting to a new browser tab. */
    var GH_USER = 'saiteja007-mv';
    var REPOS = [
      { name: 'AI-Rag-Chatbot-using-AWS-Services', lang: 'Python', desc: 'Production-ready serverless RAG chatbot on AWS Bedrock (Claude 3.5 Sonnet) — document processing, Titan V2 embeddings, semantic search over DynamoDB.' },
      { name: 'Youtube-Content-Generation-Workflow', lang: 'JavaScript', desc: 'n8n workflow automating YouTube content from script to SEO — local Ollama (Qwen2.5:7b), AI thumbnails via OpenRouter, Telegram + Google Drive + YouTube API.' },
      { name: 'Employee-Retention-Analysis', lang: 'Python', desc: 'Employee retention trends from Forbes-listed companies and Glassdoor reviews with automated data collection.' },
      { name: '-Target-Brazil-Ecommerce-Data-Analysis-using-SQL', lang: 'PLpgSQL', desc: 'Analysis of 100K+ orders using BigQuery and Tableau for sales optimization — payment behaviors and shipping delays.' },
      { name: 'Cyberbully-Detection-in-Texts-Images-and-Audios', lang: 'Jupyter Notebook', desc: 'ML model with 89% accuracy detecting harmful content across text, image and audio. Published in JETIR.' },
      { name: 'LinkedIn-Job-Application-Automation-using-Make.com-Apify-OpenAI', lang: 'JavaScript', desc: 'AI job-application automation with GPT-4 — cut manual job-search effort by 80%+.' }
    ];
    function repoUrl(name) { return 'https://github.com/' + GH_USER + '/' + name; }
    function findRepo(n) { n = String(n).toLowerCase().replace(/\.git$/, ''); for (var i = 0; i < REPOS.length; i++) { if (REPOS[i].name.toLowerCase() === n) return REPOS[i]; } return null; }

    function pageLinkedIn() {
      return '' +
      '<div class="iep iep--li">' +
        '<div class="iep-li-top"><span class="iep-li-logo">Linked<b>in</b></span></div>' +
        '<div class="iep-li-card">' +
          '<div class="iep-li-banner"></div>' +
          '<img class="iep-li-avatar" src="assets/images/Profile photo no bg.png" alt="Sai Teja Mothukuri">' +
          '<div class="iep-li-id">' +
            '<h1>Sai Teja Mothukuri</h1>' +
            '<p class="iep-li-head">Data Analyst &amp; AI Enthusiast · SQL · Python · Power BI · AWS</p>' +
            '<p class="iep-li-loc">Kansas City, Missouri, United States · <a href="https://www.linkedin.com/in/venkatasaitejam">Contact info</a></p>' +
            '<p class="iep-li-conn">500+ connections</p>' +
            '<div class="iep-li-btns"><span class="iep-li-btn iep-li-btn--p">Connect</span><span class="iep-li-btn">Message</span><span class="iep-li-btn">More</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="iep-li-sec"><h2>About</h2><p>Data Analyst with 3+ years of experience leveraging SQL, Python, and BI tools to analyze large-scale datasets and deliver actionable insights across healthcare and technology domains. Master’s in Computer Science from the University of Central Missouri. Proven track record identifying cost drivers, building forecasting models, and developing KPI dashboards. Builds AI-powered applications and documents the journey on YouTube as <a href="https://youtube.com/@The_TechRex">TechRex</a>.</p></div>' +
        '<div class="iep-li-sec"><h2>Experience</h2>' +
          '<p><b>Data Analyst</b> — Healthcare &amp; Technology<br><span class="iep-li-muted">3+ years · SQL, Python, Power BI, Tableau, AWS</span></p>' +
          '<p style="margin-top:8px">Identified cost drivers, built forecasting models, and shipped KPI dashboards that drove decisions across teams.</p>' +
        '</div>' +
        '<div class="iep-li-sec"><h2>Education</h2><p><b>University of Central Missouri</b><br><span class="iep-li-muted">Master of Science — Computer Science</span></p></div>' +
        '<div class="iep-li-sec"><h2>Featured projects</h2><p><a href="' + repoUrl('AI-Rag-Chatbot-using-AWS-Services') + '">AI-Powered RAG Chatbot using AWS</a> · <a href="https://www.jetir.org/view?paper=JETIR2304580">AI Cyberbullying Detection (JETIR)</a></p></div>' +
      '</div>';
    }

    function pageGitHubProfile() {
      var rows = REPOS.map(function (r) {
        return '<li class="iep-gh-repo"><a class="iep-gh-repo-name" href="' + repoUrl(r.name) + '">' + r.name + '</a>' +
          '<p class="iep-gh-repo-desc">' + r.desc + '</p>' +
          '<p class="iep-gh-repo-meta"><span class="iep-gh-dot"></span>' + r.lang + '</p></li>';
      }).join('');
      return '' +
      '<div class="iep iep--gh">' +
        '<div class="iep-gh-top"><span class="iep-gh-mark">&#63743;</span> GitHub<span class="iep-gh-nav">Pull requests&nbsp;&nbsp;Issues&nbsp;&nbsp;Marketplace&nbsp;&nbsp;Explore</span></div>' +
        '<div class="iep-gh-wrap">' +
          '<aside class="iep-gh-side">' +
            '<img class="iep-gh-avatar" src="assets/images/Profile photo no bg.png" alt="avatar">' +
            '<h1 class="iep-gh-name">Sai Teja Mothukuri</h1>' +
            '<p class="iep-gh-login">' + GH_USER + '</p>' +
            '<p class="iep-gh-bio">Data Analyst &amp; AI Enthusiast. SQL · Python · Power BI · AWS. Building AI apps &amp; documenting on YouTube (TechRex).</p>' +
            '<p class="iep-gh-loc">&#128205; Kansas City, MO</p>' +
          '</aside>' +
          '<main class="iep-gh-main">' +
            '<div class="iep-gh-tabs"><span class="is-active">&#128193; Repositories <b>' + REPOS.length + '</b></span><span>Projects</span><span>Packages</span><span>Stars</span></div>' +
            '<ul class="iep-gh-repos">' + rows + '</ul>' +
          '</main>' +
        '</div>' +
      '</div>';
    }

    function pageGitHubRepo(repo, name) {
      var desc = repo ? repo.desc : 'Repository by ' + GH_USER + '.';
      var lang = repo ? repo.lang : 'Code';
      return '' +
      '<div class="iep iep--gh">' +
        '<div class="iep-gh-top"><span class="iep-gh-mark">&#63743;</span> GitHub</div>' +
        '<div class="iep-gh-repohdr"><a href="' + repoUrl('') + '">' + GH_USER + '</a> / <b><a href="' + repoUrl(name) + '">' + name + '</a></b></div>' +
        '<div class="iep-gh-tabs"><span class="is-active">&#60;&#62; Code</span><span>Issues</span><span>Pull requests</span><span>Actions</span></div>' +
        '<div class="iep-gh-repobody">' +
          '<p class="iep-gh-repo-desc" style="font-size:13px">' + desc + '</p>' +
          '<p class="iep-gh-repo-meta"><span class="iep-gh-dot"></span>' + lang + '</p>' +
          '<div class="iep-gh-readme"><div class="iep-gh-readme-hd">&#9776; README.md</div>' +
            '<div class="iep-gh-readme-bd"><h2>' + name.replace(/^-/, '').replace(/-/g, ' ') + '</h2><p>' + desc + '</p>' +
            '<p><a href="' + repoUrl(name) + '">View this repository on GitHub</a></p></div>' +
          '</div>' +
        '</div>' +
        '<p class="iep-gh-back"><a href="' + repoUrl('') + '">&larr; Back to ' + GH_USER + '</a></p>' +
      '</div>';
    }

    function pageJetir() {
      return '' +
      '<div class="iep iep--jetir">' +
        '<div class="iep-jetir-top"><b>JETIR</b> — Journal of Emerging Technologies and Innovative Research <span>ISSN: 2349-5162</span></div>' +
        '<div class="iep-jetir-body">' +
          '<p class="iep-jetir-tag">Research Paper · Volume 10 Issue 4 · April 2023 · Paper ID JETIR2304580</p>' +
          '<h1 class="iep-jetir-title">AI Cyberbullying Detection in Texts, Images and Audios</h1>' +
          '<p class="iep-jetir-auth">Authors: Sai Teja Mothukuri, et al.</p>' +
          '<h2>Abstract</h2>' +
          '<p>This work presents a machine-learning system that detects harmful and abusive content across three modalities — text, image and audio — achieving 89% detection accuracy. The pipeline combines NLP-based text classification, image analysis, and audio feature extraction to flag cyberbullying across mixed media, with the goal of safer online platforms.</p>' +
          '<p><b>Keywords:</b> Cyberbullying, Machine Learning, NLP, Deep Learning, Multimodal Classification.</p>' +
          '<p class="iep-jetir-actions"><a class="iep-jetir-dl" href="https://www.jetir.org/papers/JETIR2304580.pdf">&#128229; Download Full Paper (PDF)</a></p>' +
        '</div>' +
      '</div>';
    }

    function pageYouTube() {
      return '' +
      '<div class="iep iep--yt">' +
        '<div class="iep-yt-top"><span class="iep-yt-logo">&#9654; YouTube</span></div>' +
        '<div class="iep-yt-banner">TechRex</div>' +
        '<div class="iep-yt-id"><div class="iep-yt-ava">TR</div><div><h1>TechRex</h1><p>@The_TechRex</p><p class="iep-yt-muted">Building AI-powered apps, analyzing data, and documenting the journey.</p></div><span class="iep-yt-sub">Subscribe</span></div>' +
        '<div class="iep-yt-grid">' +
          '<div class="iep-yt-vid"><div class="iep-yt-thumb">&#9654;</div><p>Building an AI RAG Chatbot on AWS</p></div>' +
          '<div class="iep-yt-vid"><div class="iep-yt-thumb">&#9654;</div><p>Automating YouTube content with n8n + Ollama</p></div>' +
          '<div class="iep-yt-vid"><div class="iep-yt-thumb">&#9654;</div><p>Data analysis projects &amp; dashboards</p></div>' +
        '</div>' +
      '</div>';
    }

    function retroPage(url) {
      var host, path;
      try { var u = new URL(url, window.location.href); host = u.hostname.replace(/^www\./, ''); path = u.pathname.replace(/\/+$/, ''); }
      catch (e) { return null; }

      if (host === 'linkedin.com' || host.endsWith('.linkedin.com'))
        return { title: 'Sai Teja Mothukuri | LinkedIn', html: pageLinkedIn() };

      if (host === 'github.com') {
        var seg = path.split('/').filter(Boolean);
        if (seg.length <= 1) return { title: GH_USER + ' · GitHub', html: pageGitHubProfile() };
        var repoName = seg.slice(1).join('/').replace(/\.git$/i, '');
        return { title: repoName + ' · GitHub', html: pageGitHubRepo(findRepo(repoName), repoName) };
      }

      if (host === 'jetir.org') {
        if (/\.pdf$/i.test(path)) return null;   // let the PDF load in the iframe
        return { title: 'JETIR — Paper JETIR2304580', html: pageJetir() };
      }

      if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com'))
        return { title: 'TechRex - YouTube', html: pageYouTube() };

      return null;
    }

    var ieHistory = [];
    var iePos = -1;

    window.openIE = function(url, title) {
      var win = document.getElementById('win-ie');
      if (!win) return;
      WM.open('win-ie');

      var caption  = win.querySelector('.w95-titlebar__caption');
      var addrBar  = document.getElementById('ie-addr');
      var frame    = document.getElementById('ie-frame');
      var page     = document.getElementById('ie-page');
      var noPage   = document.getElementById('ie-nopage');
      var noUrl    = document.getElementById('ie-nopage-url');
      var status   = document.getElementById('ie-status');

      // History push
      if (iePos < 0 || ieHistory[iePos] !== url) {
        ieHistory = ieHistory.slice(0, iePos + 1);
        ieHistory.push(url);
        iePos = ieHistory.length - 1;
      }
      updateNavBtns();

      function show(which) {
        if (frame)  frame.style.display  = (which === 'frame')  ? 'block' : 'none';
        if (page)   page.style.display   = (which === 'page')   ? 'block' : 'none';
        if (noPage) noPage.style.display = (which === 'nopage') ? 'flex'  : 'none';
      }

      var retro = retroPage(url);
      var t = title || (retro && retro.title) || url;
      if (caption) caption.textContent = t + ' — Internet Explorer';
      if (addrBar) addrBar.value = url;
      if (status)  status.textContent = 'Opening page…';

      if (retro) {
        if (page) { page.innerHTML = retro.html; page.scrollTop = 0; }
        if (frame) frame.src = 'about:blank';
        show('page');
      } else if (isFramable(url)) {
        if (frame) { frame.style.display = 'block'; frame.src = url; }
        show('frame');
      } else {
        if (frame) frame.src = 'about:blank';
        if (noUrl) noUrl.textContent = url;
        show('nopage');
      }
      if (status) setTimeout(function () { if (status) status.textContent = 'Done'; }, 450);
    };

    function updateNavBtns() {
      var back = document.getElementById('ie-back');
      var fwd  = document.getElementById('ie-fwd');
      if (back) back.disabled = (iePos <= 0);
      if (fwd)  fwd.disabled  = (iePos >= ieHistory.length - 1);
    }

    // Back / Forward / Refresh / Go
    var backBtn    = document.getElementById('ie-back');
    var fwdBtn     = document.getElementById('ie-fwd');
    var refreshBtn = document.getElementById('ie-refresh');
    var goBtn      = document.getElementById('ie-go');
    var addrInput  = document.getElementById('ie-addr');

    if (backBtn) backBtn.addEventListener('click', function() {
      if (iePos > 0) { iePos--; window.openIE(ieHistory[iePos], ieHistory[iePos]); }
    });
    if (fwdBtn) fwdBtn.addEventListener('click', function() {
      if (iePos < ieHistory.length - 1) { iePos++; window.openIE(ieHistory[iePos], ieHistory[iePos]); }
    });
    if (refreshBtn) refreshBtn.addEventListener('click', function() {
      var frame = document.getElementById('ie-frame');
      if (frame && frame.style.display !== 'none') { try { frame.contentWindow.location.reload(); } catch(e) { frame.src = frame.src; } }
    });
    function goToAddr() {
      var url = addrInput ? addrInput.value.trim() : '';
      if (!url) return;
      // Bare domain (e.g. "linkedin.com/in/...") → assume https
      if (!/^[a-z]+:\/\//i.test(url) && url.charAt(0) !== '/' && /\.[a-z]{2,}/i.test(url)) {
        url = 'https://' + url;
      }
      window.openIE(url, url);
    }
    if (goBtn) goBtn.addEventListener('click', goToAddr);
    if (addrInput) addrInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') goToAddr(); });

    // Link routing:
    //  • External sites (different host) → open in a NEW BROWSER TAB, like a
    //    regular browser. We do NOT intercept these.
    //  • Local files (resume, certificates, project docs) → in-desktop IE viewer.
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      if (a.hasAttribute('download')) return;   // a real download → let the browser save it
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;

      if (/^https?:\/\//i.test(href)) {
        var host = '';
        try { host = new URL(href).hostname; } catch (e2) {}
        if (host && host !== window.location.hostname) {
          // External → ensure it opens a new tab, then let the browser handle it.
          if (a.getAttribute('target') !== '_blank') { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
          return;
        }
        // same-origin absolute URL → treat as local (fall through to viewer)
      }
      // Local / same-origin link → open in the in-desktop IE viewer
      e.preventDefault();
      window.openIE(href, a.textContent.trim() || href);
    }, true); // capture phase so it fires before onclick

  })();


  /* ══════════════════════════════════════════════════════════════════
     FEATURE 5 — FILE EXPLORER (My Computer)
  ══════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════
     Shared dropdown-menu engine for any window's .w95-menubar.
     (Function declaration → hoisted, usable by Explorer, Notepad, WordPad,
     Paint regardless of definition order.)
  ══════════════════════════════════════════════════════════════════ */
  function buildMenuBar(winId, spec) {
    var win = document.getElementById(winId); if (!win) return;
    var bar = win.querySelector('.w95-menubar'); if (!bar) return;
    if (bar.dataset.wired) return; bar.dataset.wired = '1';
    bar.style.position = 'relative';
    var openDD = null, openBtn = null;
    function closeAll() { if (openDD) { openDD.remove(); openDD = null; } if (openBtn) { openBtn.classList.remove('is-open'); openBtn = null; } }
    function openMenu(menu, btn) {
      closeAll();
      var dd = document.createElement('div');
      dd.className = 'w95-menu-dropdown';
      menu.items.forEach(function (it) {
        if (it.sep) { var s = document.createElement('div'); s.className = 'w95-menu-dropdown__sep'; dd.appendChild(s); return; }
        var mi = document.createElement('button');
        mi.className = 'w95-menu-dropdown__item' + (it.disabled ? ' is-disabled' : '');
        mi.innerHTML = '<span>' + it.label + '</span>' + (it.accel ? '<span class="w95-menu-accel">' + it.accel + '</span>' : '');
        if (it.disabled) mi.disabled = true;
        else mi.addEventListener('click', function (ev) { ev.stopPropagation(); closeAll(); try { it.action(); } catch (e) {} });
        dd.appendChild(mi);
      });
      bar.appendChild(dd);
      dd.style.left = btn.offsetLeft + 'px';
      dd.style.top = bar.offsetHeight + 'px';
      openDD = dd; openBtn = btn; btn.classList.add('is-open');
    }
    spec.forEach(function (menu) {
      var btn = Array.prototype.slice.call(bar.querySelectorAll('.w95-menubar__item')).filter(function (b) { return b.textContent.trim().toLowerCase() === menu.name.toLowerCase(); })[0];
      if (!btn) return;
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (openBtn === btn) closeAll(); else openMenu(menu, btn); });
      btn.addEventListener('mouseenter', function () { if (openDD && openBtn !== btn) openMenu(menu, btn); });
    });
    document.addEventListener('mousedown', function (e) { if (openDD && !bar.contains(e.target)) closeAll(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }


  /* ══════════════════════════════════════════════════════════════════
     VIRTUAL FILE SYSTEM — shared by the Explorer AND the Save/Open dialogs.
     Built-in entries point to real files via `url`. User-created files store
     their text inline (`content` + `app`) and persist to localStorage, so
     Notepad/WordPad save *into the simulated OS* (not the real device) and the
     files reappear in My Computer after a reload — like a real OS.
  ══════════════════════════════════════════════════════════════════ */
  (function setupVFS() {
    var LS = 'w95.vfs';
    var tree = {
      'My Computer': { type: 'root', children: {
        'C:': { type: 'drive', children: {
          'My Documents': { type: 'folder', children: {} },
          'Certificates': { type: 'folder', children: {
            'Microsoft PowerBI Data Analyst.pdf': { type: 'file', icon: 'w95-ico--file', url: 'docs/Certifications/Microsoft%20PowerBI%20-%20Data%20Analysis%20Associate.pdf' },
            'DataBricks Data Analysis.pdf':       { type: 'file', icon: 'w95-ico--file', url: 'docs/Certifications/DataBricks%20Data%20Analysis.pdf' },
            'Accenture Data Analysis.pdf':        { type: 'file', icon: 'w95-ico--file', url: 'docs/Certifications/Accenture%20Data%20Analysis%20Simulation.pdf' },
            'Udemy Data Analyst.pdf':             { type: 'file', icon: 'w95-ico--file', url: 'docs/Certifications/Udemy%20Data%20Analyst%20Bootcamp.pdf' },
            'NPTEL Analytics Python.jpg':         { type: 'file', icon: 'w95-ico--paint', url: 'docs/Certifications/NPTEL_data%20analytics%20with%20python.jpg' },
            'Udemy Data Analyst.jpg':             { type: 'file', icon: 'w95-ico--paint', url: 'docs/Certifications/Udemy%20Data%20Analyst%20Bootcamp.jpg' }
          } },
          'Resume': { type: 'folder', children: {
            'Sai Teja Mothukuri - Resume.pdf': { type: 'file', icon: 'w95-ico--file', url: 'docs/Sai%20Teja%20Mothukuri%20-%20Resume.pdf' }
          } },
          'Research Papers': { type: 'folder', children: {
            'Cyberbullying Detection (JETIR)': { type: 'file', icon: 'w95-ico--internet', url: 'https://www.jetir.org/view?paper=JETIR2304580' }
          } },
          'Projects': { type: 'folder', children: {
            'AI RAG Chatbot using AWS.md':   { type: 'file', icon: 'w95-ico--notepad', url: 'docs/AI_RagChatbot_using_AWS.md' },
            'YouTube Content Generation.md': { type: 'file', icon: 'w95-ico--notepad', url: 'docs/Youtube_content_generation_workflow.md' }
          } }
        } }
      } }
    };

    function getNode(pathArr) {
      var node = tree;
      for (var i = 0; i < pathArr.length; i++) {
        if (!node) return null;
        if (node[pathArr[i]]) node = node[pathArr[i]];
        else if (node.children && node.children[pathArr[i]]) node = node.children[pathArr[i]];
        else return null;
      }
      return node;
    }
    function childrenOf(pathArr) { var n = getNode(pathArr); return n && n.children ? n.children : null; }
    function addFile(folderPath, name, obj) { var n = getNode(folderPath); if (!n || !n.children) return false; obj.user = true; n.children[name] = obj; persist(); return true; }
    function mkdir(folderPath, name) { var n = getNode(folderPath); if (!n || !n.children) return false; if (!n.children[name]) n.children[name] = { type: 'folder', user: true, children: {} }; persist(); return true; }
    function removeNode(folderPath, name) { var n = getNode(folderPath); if (n && n.children && n.children[name]) { delete n.children[name]; persist(); return true; } return false; }
    function rename(folderPath, oldName, newName) { var n = getNode(folderPath); if (!n || !n.children || !n.children[oldName] || n.children[newName]) return false; n.children[newName] = n.children[oldName]; delete n.children[oldName]; persist(); return true; }

    function collect(node, path, acc) {
      var ch = node && node.children; if (!ch) return;
      Object.keys(ch).forEach(function (name) {
        var e = ch[name];
        if (e.user) acc.push({ path: path.slice(), name: name, type: e.type, content: (e.content != null ? e.content : null), app: e.app || null, icon: e.icon || null });
        if (e.children) collect(e, path.concat([name]), acc);
      });
    }
    function persist() { try { var acc = []; collect(getNode(['My Computer']), ['My Computer'], acc); localStorage.setItem(LS, JSON.stringify(acc)); } catch (e) {} }
    function load() {
      var raw; try { raw = JSON.parse(localStorage.getItem(LS)) || []; } catch (e) { raw = []; }
      raw.filter(function (e) { return e.type !== 'file'; }).sort(function (a, b) { return a.path.length - b.path.length; })
        .forEach(function (e) { var n = getNode(e.path); if (n && n.children && !n.children[e.name]) n.children[e.name] = { type: 'folder', user: true, children: {} }; });
      raw.filter(function (e) { return e.type === 'file'; })
        .forEach(function (e) { var n = getNode(e.path); if (n && n.children) n.children[e.name] = { type: 'file', user: true, content: e.content, app: e.app, icon: e.icon }; });
    }
    load();
    window.W95FS = { tree: tree, getNode: getNode, childrenOf: childrenOf, addFile: addFile, mkdir: mkdir, removeNode: removeNode, rename: rename, persist: persist };
  })();


  (function setupExplorer() {
    var FS = window.W95FS.tree;

    var explorerHistory = [['My Computer']];
    var explorerPos = 0;

    var getNode = window.W95FS.getNode;

    function renderExplorer(pathArr) {
      var win = document.getElementById('win-explorer');
      if (!win) return;

      var titleEl  = win.querySelector('.w95-titlebar__caption');
      var addrEl   = document.getElementById('exp-addr');
      var bodyEl   = document.getElementById('exp-body');
      var statusEl = document.getElementById('exp-status');

      var pathStr = pathArr.join('\\');
      if (titleEl) titleEl.textContent = pathArr[pathArr.length - 1] || 'My Computer';
      if (addrEl)  addrEl.value = pathStr;

      var node = getNode(pathArr);
      if (!node) return;

      var children = node.children || (node.type === 'file' ? null : {});
      if (!children) return;

      bodyEl.innerHTML = '';
      var names = Object.keys(children);
      // Folders first, then files
      var folders = names.filter(function(n) { return children[n].type === 'folder' || children[n].type === 'drive' || children[n].type === 'root'; });
      var files   = names.filter(function(n) { return children[n].type === 'file'; });
      var sorted  = folders.concat(files);

      sorted.forEach(function(name) {
        var entry = children[name];
        var tile = document.createElement('button');
        tile.className = 'exp-tile';
        tile.setAttribute('aria-label', name);

        var ico = document.createElement('span');
        ico.setAttribute('aria-hidden', 'true');
        if (entry.type === 'folder' || entry.type === 'drive') {
          ico.className = 'w95-ico--folder w95-ico-32';
        } else {
          ico.className = (entry.icon || 'w95-ico--file') + ' w95-ico-32';
        }

        var lbl = document.createElement('span');
        lbl.className = 'exp-tile__label';
        lbl.textContent = name;

        tile.appendChild(ico);
        tile.appendChild(lbl);

        tile.addEventListener('dblclick', function() {
          if (entry.type === 'folder' || entry.type === 'drive') {
            var newPath = pathArr.concat([name]);
            explorerHistory = explorerHistory.slice(0, explorerPos + 1);
            explorerHistory.push(newPath);
            explorerPos = explorerHistory.length - 1;
            renderExplorer(newPath);
          } else if (entry.content != null) {
            // user-created file → open in its app (Notepad / WordPad / Paint)
            if (entry.app === 'paint' && window.openPaintFile) window.openPaintFile(pathArr, name, entry.content);
            else if (entry.app === 'wordpad' && window.openWordpadFile) window.openWordpadFile(pathArr, name, entry.content);
            else if (window.openNotepadFile) window.openNotepadFile(pathArr, name, entry.content);
          } else if (entry.url) {
            window.openIE(entry.url, name);
          }
        });

        // Right-click → file context menu (Open / Download / Rename / Delete / Properties)
        tile.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          if (window.W95FileMenu) window.W95FileMenu(e.clientX, e.clientY, {
            entry: entry, name: name, path: pathArr.slice(),
            open: function () { tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); },
            refresh: function () { renderExplorer(explorerHistory[explorerPos] || ['My Computer']); }
          });
        });

        bodyEl.appendChild(tile);
      });

      if (statusEl) statusEl.textContent = sorted.length + ' object(s)';
      updateExpNav();
    }

    function updateExpNav() {
      var upBtn   = document.getElementById('exp-up');
      var backBtn = document.getElementById('exp-back');
      if (backBtn) backBtn.disabled = (explorerPos <= 0);
      if (upBtn) {
        var cur = explorerHistory[explorerPos] || [];
        upBtn.disabled = (cur.length <= 1);
      }
    }

    var upBtn   = document.getElementById('exp-up');
    var backBtn = document.getElementById('exp-back');

    if (backBtn) backBtn.addEventListener('click', function() {
      if (explorerPos > 0) { explorerPos--; renderExplorer(explorerHistory[explorerPos]); }
    });
    if (upBtn) upBtn.addEventListener('click', function() {
      var cur = explorerHistory[explorerPos] || [];
      if (cur.length > 1) {
        var up = cur.slice(0, -1);
        explorerHistory = explorerHistory.slice(0, explorerPos + 1);
        explorerHistory.push(up);
        explorerPos = explorerHistory.length - 1;
        renderExplorer(up);
      }
    });

    window.openExplorer = function() {
      explorerHistory = [['My Computer']];
      explorerPos = 0;
      WM.open('win-explorer');
      renderExplorer(['My Computer']);
    };

    // Re-render the open Explorer (e.g. right after a file is saved into the VFS).
    window.__w95refreshExplorer = function () {
      var el = document.getElementById('win-explorer');
      if (el && el.style.display !== 'none') renderExplorer(explorerHistory[explorerPos] || ['My Computer']);
    };

    /* ── Explorer menubar: File · Edit · View · Go · Help ── */
    function setView(v) {
      var b = document.getElementById('exp-body'); if (!b) return;
      b.classList.remove('exp-view--small', 'exp-view--list');
      if (v === 'small') b.classList.add('exp-view--small');
      else if (v === 'list') b.classList.add('exp-view--list');
    }
    function navBack() { if (explorerPos > 0) { explorerPos--; renderExplorer(explorerHistory[explorerPos]); } }
    function navUp() {
      var cur = explorerHistory[explorerPos] || [];
      if (cur.length > 1) { var up = cur.slice(0, -1); explorerHistory = explorerHistory.slice(0, explorerPos + 1); explorerHistory.push(up); explorerPos = explorerHistory.length - 1; renderExplorer(up); }
    }
    function navTo(p) { explorerHistory = explorerHistory.slice(0, explorerPos + 1); explorerHistory.push(p); explorerPos = explorerHistory.length - 1; renderExplorer(p); }
    function newFolderHere() {
      var cur = explorerHistory[explorerPos] || ['My Computer'];
      var node = window.W95FS.getNode(cur);
      if (!node || !node.children) { if (window.W95Error) window.W95Error('You cannot create a folder in this location.'); return; }
      window.W95Prompt({ title: 'New Folder', label: 'New folder name:', value: 'New Folder', onOk: function (n) { window.W95FS.mkdir(cur, n); renderExplorer(cur); } });
    }
    buildMenuBar('win-explorer', [
      { name: 'File', items: [
        { label: 'New Folder', action: newFolderHere },
        { sep: true },
        { label: 'Close', action: function () { WM.close('win-explorer'); } }
      ] },
      { name: 'Edit', items: [ { label: 'Select All', disabled: true } ] },
      { name: 'View', items: [
        { label: 'Large Icons', action: function () { setView('large'); } },
        { label: 'Small Icons', action: function () { setView('small'); } },
        { label: 'List', action: function () { setView('list'); } },
        { sep: true },
        { label: 'Refresh', accel: 'F5', action: function () { renderExplorer(explorerHistory[explorerPos] || ['My Computer']); } }
      ] },
      { name: 'Go', items: [
        { label: 'Back', action: navBack },
        { label: 'Up One Level', action: navUp },
        { sep: true },
        { label: 'My Computer', action: function () { navTo(['My Computer']); } }
      ] },
      { name: 'Help', items: [
        { label: 'About My Computer', action: function () { window.W95Alert('My Computer\nSai Teja Mothukuri — Windows 95 portfolio edition'); } }
      ] }
    ]);

    // Re-render when window opens
    var origOpen = WM.open.bind(WM);
    WM.open = function(winId) {
      origOpen(winId);
      if (winId === 'win-explorer') {
        renderExplorer(explorerHistory[explorerPos] || ['My Computer']);
      }
    };
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
     WALLPAPER  +  DISPLAY PROPERTIES
     Right-click desktop -> Properties (or Start -> Display Properties)
     opens a Win95 dialog to pick a wallpaper. Choice persists in
     localStorage and is re-applied on load.
  ══════════════════════════════════════════════════════════════════ */
  (function setupWallpaper() {
    var DIR = 'assets/win95/wallpapers/';
    var WALLPAPERS = [
      { file: 'Default Wallpaper.png',                           name: 'Welcome (Default)' },
      { file: 'Sky_windows-95-wallpaper-hd.jpg',                 name: 'Blue Skies' },
      { file: 'windows-95-desktop-background.jpg',               name: 'Clouds (Logo)' },
      { file: 'windows-95-desktop-background_2.jpg',             name: 'Logo Blue' },
      { file: 'windows-95-desktop-background_5.jpg',             name: 'Windows 95' },
      { file: 'windows-95-desktop-background_6.jpg',             name: 'Flag' },
      { file: 'windows-95-wallpaper-hd_3.webp',                  name: 'Deep Teal' },
      { file: 'windows-95-wallpaper-hd_4.png',                   name: 'Clouds 95' },
      { file: 'wp2625450-windows-95-desktop-background.jpg',     name: 'Sky' },
      { file: 'wp2625467-windows-95-desktop-background.png',     name: 'Maroon' },
      { file: 'wp2660136-windows-95-wallpaper-hd.png',           name: 'Royal Blue' },
      { file: 'wp2660141-windows-95-wallpaper-hd.png',           name: 'Clouds' },
      { file: 'wp2660142-windows-95-wallpaper-hd.jpg',           name: 'Teal' },
      { file: 'wp2660148-windows-95-wallpaper-hd.png',           name: 'Maze' },
      { file: 'wp2660154-windows-95-wallpaper-hd.jpg',           name: 'Horizon' }
    ];
    var LS_FILE = 'w95.wallpaper', LS_MODE = 'w95.wallpaperMode';

    var desktop = document.getElementById('desktop');
    var listbox = document.getElementById('wp-listbox');
    var preview = document.getElementById('wp-preview');
    var modeSel = document.getElementById('wp-mode');

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    function url(file) { return DIR + file.split('/').map(encodeURIComponent).join('/'); }

    // Committed (applied to real desktop) + pending (preview, pre-Apply)
    // Default to the welcome wallpaper for first-time visitors (until they pick one).
    var current = { file: lsGet(LS_FILE) || 'Default Wallpaper.png', mode: lsGet(LS_MODE) || 'stretch' };
    var pending = { file: current.file, mode: current.mode };

    function bgProps(mode) {
      if (mode === 'tile')   return ['auto', 'repeat', 'top left'];
      if (mode === 'center') return ['auto', 'no-repeat', 'center'];
      return ['cover', 'no-repeat', 'center']; // stretch
    }

    function applyTo(el, file, mode) {
      if (!el) return;
      if (!file || file === 'none') {
        el.style.backgroundImage = '';
        return; // CSS teal shows through
      }
      var p = bgProps(mode);
      el.style.backgroundImage = 'url("' + url(file) + '")';
      el.style.backgroundSize = p[0];
      el.style.backgroundRepeat = p[1];
      el.style.backgroundPosition = p[2];
    }

    // Apply persisted choice to the real desktop immediately
    applyTo(desktop, current.file, current.mode);

    function buildList() {
      if (!listbox) return;
      listbox.innerHTML = '';
      [{ file: 'none', name: '(None)' }].concat(WALLPAPERS).forEach(function (w) {
        var item = document.createElement('div');
        item.className = 'wp-listbox__item';
        item.setAttribute('role', 'option');
        item.dataset.file = w.file;

        var thumb = document.createElement('span');
        thumb.className = 'wp-thumb';
        if (w.file === 'none') thumb.style.background = 'var(--w95-teal)';
        else thumb.style.backgroundImage = 'url("' + url(w.file) + '")';

        var label = document.createElement('span');
        label.textContent = w.name;

        item.appendChild(thumb);
        item.appendChild(label);
        item.addEventListener('click', function () { selectPending(w.file); });
        listbox.appendChild(item);
      });
    }

    function selectPending(file) {
      pending.file = file;
      if (listbox) {
        Array.prototype.forEach.call(listbox.querySelectorAll('.wp-listbox__item'), function (it) {
          it.classList.toggle('is-selected', it.dataset.file === file);
        });
      }
      applyTo(preview, file, pending.mode);
    }

    function syncDialog() {
      pending.file = current.file;
      pending.mode = current.mode;
      if (modeSel) modeSel.value = current.mode;
      selectPending(current.file);
    }

    if (modeSel) modeSel.addEventListener('change', function () {
      pending.mode = modeSel.value;
      applyTo(preview, pending.file, pending.mode);
    });

    function commit() {
      current.file = pending.file;
      current.mode = pending.mode;
      lsSet(LS_FILE, current.file);
      lsSet(LS_MODE, current.mode);
      applyTo(desktop, current.file, current.mode);
    }

    var okBtn = document.getElementById('wp-ok');
    var applyBtn = document.getElementById('wp-apply');
    var cancelBtn = document.getElementById('wp-cancel');
    if (applyBtn)  applyBtn.addEventListener('click', commit);
    if (okBtn)     okBtn.addEventListener('click', function () { commit(); WM.close('win-display'); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { syncDialog(); WM.close('win-display'); });

    buildList();

    // Public opener (used by Start menu + context menu)
    window.openDisplay = function () {
      WM.open('win-display');
      syncDialog();
    };

    /* ── Desktop right-click context menu ───────────────────────────── */
    var menu = document.getElementById('desktop-context-menu');
    function hideMenu() { if (menu) menu.hidden = true; }
    function showMenu(x, y) {
      if (!menu) return;
      menu.hidden = false;
      var mw = menu.offsetWidth, mh = menu.offsetHeight;
      if (x + mw > window.innerWidth)  x = window.innerWidth - mw - 2;
      if (y + mh > window.innerHeight - 30) y = window.innerHeight - 30 - mh;
      menu.style.left = Math.max(0, x) + 'px';
      menu.style.top  = Math.max(0, y) + 'px';
    }

    if (desktop) {
      desktop.addEventListener('contextmenu', function (e) {
        // Only on bare desktop / icon grid — not inside open windows
        if (e.target.closest('.desk-window') || e.target.closest('.w95-taskbar')) return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
      });
    }
    document.addEventListener('mousedown', function (e) {
      if (menu && !menu.hidden && !menu.contains(e.target)) hideMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideMenu(); });

    var ctxProps = document.getElementById('ctx-properties');
    if (ctxProps) ctxProps.addEventListener('click', function () { hideMenu(); window.openDisplay(); });
    var ctxRefresh = document.getElementById('ctx-refresh');
    if (ctxRefresh) ctxRefresh.addEventListener('click', hideMenu);
  })();


  /* ══════════════════════════════════════════════════════════════════
     ACCESSORIES APPS — Calculator, Notepad, Paint, WordPad, Phone Dialer
  ══════════════════════════════════════════════════════════════════ */
  (function setupApps() {

    /* ── Calculator ──────────────────────────────────────────────── */
    (function calc() {
      var display = document.getElementById('calc-display');
      var win = document.getElementById('win-calc');
      if (!display || !win) return;
      var cur = '0', stored = null, op = null, fresh = true, mem = 0;

      function fmt(r) {
        if (typeof r === 'string') return r;
        if (!isFinite(r)) return 'Cannot divide by zero';
        return parseFloat(r.toPrecision(12)).toString();
      }
      function refresh() { display.value = cur; }
      function digit(n) {
        if (fresh) { cur = n; fresh = false; }
        else { cur = (cur === '0' ? n : cur + n); }
        refresh();
      }
      function dot() { if (fresh) { cur = '0.'; fresh = false; } else if (cur.indexOf('.') < 0) cur += '.'; refresh(); }
      function applyOp() {
        if (op && stored !== null) {
          var a = parseFloat(stored), b = parseFloat(cur), r;
          if (op === '+') r = a + b; else if (op === '-') r = a - b;
          else if (op === '*') r = a * b; else r = (b === 0 ? 'Cannot divide by zero' : a / b);
          cur = fmt(r);
        }
      }
      function setOp(o) { if (op && !fresh) { applyOp(); stored = cur; } else { stored = cur; } op = o; fresh = true; refresh(); }
      function eq() { if (op) { applyOp(); op = null; stored = null; fresh = true; refresh(); } }
      function act(a) {
        if (a === 'c') { cur = '0'; stored = null; op = null; fresh = true; }
        else if (a === 'ce') { cur = '0'; fresh = true; }
        else if (a === 'back') { if (!fresh) { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; if (cur === '' || cur === '-') cur = '0'; } }
        else if (a === 'neg') { cur = cur.charAt(0) === '-' ? cur.slice(1) : (cur === '0' ? '0' : '-' + cur); }
        else if (a === 'sqrt') { var v = parseFloat(cur); cur = fmt(v < 0 ? 'Invalid input' : Math.sqrt(v)); fresh = true; }
        else if (a === 'pct') { var p = parseFloat(cur); cur = fmt(stored !== null ? parseFloat(stored) * p / 100 : p / 100); fresh = true; }
        else if (a === 'recip') { var rv = parseFloat(cur); cur = fmt(rv === 0 ? 'Cannot divide by zero' : 1 / rv); fresh = true; }
        else if (a === 'eq') { eq(); return; }
        else if (a === 'dot') { dot(); return; }
        else if (a === 'mc') { mem = 0; } else if (a === 'mr') { cur = fmt(mem); fresh = true; }
        else if (a === 'ms') { mem = parseFloat(cur) || 0; } else if (a === 'madd') { mem += parseFloat(cur) || 0; }
        refresh();
      }
      win.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.digit != null) digit(b.dataset.digit);
        else if (b.dataset.op) setOp(b.dataset.op);
        else if (b.dataset.act) act(b.dataset.act);
      });
    })();

    /* ── Paint ───────────────────────────────────────────────────── */
    (function paint() {
      var canvas = document.getElementById('paint-canvas');
      var palette = document.getElementById('paint-palette');
      var win = document.getElementById('win-paint');
      if (!canvas || !win) return;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      var COLORS = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
                    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
      var color = '#000000', tool = 'pencil', drawing = false, last = null;

      if (palette) {
        COLORS.forEach(function (c, i) {
          var sw = document.createElement('button');
          sw.className = 'paint-swatch' + (i === 0 ? ' is-active' : '');
          sw.style.background = c; sw.title = c; sw.setAttribute('aria-label', 'Color ' + c);
          sw.addEventListener('click', function () {
            color = c;
            Array.prototype.forEach.call(palette.children, function (n) { n.classList.remove('is-active'); });
            sw.classList.add('is-active');
          });
          palette.appendChild(sw);
        });
      }

      win.querySelectorAll('.paint-tool').forEach(function (t) {
        t.addEventListener('click', function () {
          if (t.dataset.act === 'clear') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
          tool = t.dataset.tool;
          win.querySelectorAll('.paint-tool').forEach(function (n) { n.classList.remove('is-active'); });
          t.classList.add('is-active');
        });
      });

      function pos(e) {
        var r = canvas.getBoundingClientRect();
        var sx = canvas.width / r.width, sy = canvas.height / r.height;
        var cx = e.touches ? e.touches[0].clientX : e.clientX;
        var cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
      }
      function paintDot(p) { ctx.fillStyle = (tool === 'eraser' ? '#fff' : color); var s = (tool === 'eraser' ? 14 : 2); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
      function stroke(a, b) {
        ctx.strokeStyle = (tool === 'eraser' ? '#fff' : color);
        ctx.lineWidth = (tool === 'eraser' ? 14 : 2); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      canvas.addEventListener('mousedown', function (e) { drawing = true; last = pos(e); paintDot(last); e.preventDefault(); });
      document.addEventListener('mousemove', function (e) { if (!drawing) return; var p = pos(e); stroke(last, p); last = p; });
      document.addEventListener('mouseup', function () { drawing = false; last = null; });
      canvas.addEventListener('touchstart', function (e) { drawing = true; last = pos(e); paintDot(last); e.preventDefault(); }, { passive: false });
      canvas.addEventListener('touchmove', function (e) { if (!drawing) return; var p = pos(e); stroke(last, p); last = p; e.preventDefault(); }, { passive: false });
      canvas.addEventListener('touchend', function () { drawing = false; last = null; });

      /* File menu + save/open into the simulated OS (image saved as PNG data URL) */
      var pst = { folder: null, name: 'untitled' };
      function pTitle(n) { pst.name = n; var c = win.querySelector('.w95-titlebar__caption'); if (c) c.textContent = n + ' - Paint'; }
      function clearCanvas() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      function loadImage(src) { var img = new Image(); img.onload = function () { clearCanvas(); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }; img.src = src; }
      function pWrite(folder, fn) {
        window.W95FS.addFile(folder, fn, { type: 'file', content: canvas.toDataURL('image/png'), app: 'paint', icon: 'w95-ico--paint' });
        if (window.__w95refreshExplorer) window.__w95refreshExplorer();
      }
      function pSaveAs() {
        window.W95Dialog.open({ mode: 'save', name: (pst.name || 'untitled').replace(/\.[^.]+$/, '') + '.png',
          path: pst.folder || undefined, types: ['png'], typeLabels: ['PNG Image (*.png)', 'Bitmap (*.bmp)'],
          onAccept: function (folder, fn) { pWrite(folder, fn); pst.folder = folder; pTitle(fn); } });
      }
      function pSave() { if (pst.folder) pWrite(pst.folder, pst.name); else pSaveAs(); }
      function pOpenInto(folder, fn) { var node = window.W95FS.getNode(folder.concat([fn])); if (!node) return; if (node.content != null) loadImage(node.content); else if (node.url) loadImage(node.url); pst.folder = folder; pTitle(fn); }
      window.openPaintFile = function (folder, name, content) { WM.open('win-paint'); loadImage(content); pst.folder = folder; pTitle(name); };
      buildMenuBar('win-paint', [
        { name: 'File', items: [
          { label: 'New', accel: 'Ctrl+N', action: function () { clearCanvas(); pst.folder = null; pTitle('untitled'); } },
          { label: 'Open…', accel: 'Ctrl+O', action: function () { window.W95Dialog.open({ mode: 'open', path: pst.folder || undefined, types: ['png', 'bmp', 'jpg', 'jpeg', 'gif'], typeLabels: ['Image Files', 'All Files (*.*)'], onAccept: pOpenInto }); } },
          { label: 'Save', accel: 'Ctrl+S', action: pSave },
          { label: 'Save As…', action: pSaveAs },
          { sep: true },
          { label: 'Exit', action: function () { WM.close('win-paint'); } }
        ] },
        { name: 'Image', items: [
          { label: 'Clear Image', accel: 'Ctrl+Shft+N', action: function () { clearCanvas(); } }
        ] },
        { name: 'Help', items: [
          { label: 'About Paint', action: function () { window.W95Alert('Paint\nSai Teja Mothukuri — Windows 95 portfolio edition'); } }
        ] }
      ]);
    })();

    /* ── WordPad ─────────────────────────────────────────────────── */
    (function wordpad() {
      var area = document.getElementById('wordpad-area');
      var win = document.getElementById('win-wordpad');
      if (!area || !win) return;
      win.querySelectorAll('.wordpad-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          area.focus();
          try { document.execCommand(b.dataset.cmd, false, null); } catch (e) {}
        });
      });
      var sizeSel = document.getElementById('wordpad-size');
      if (sizeSel) sizeSel.addEventListener('change', function () {
        area.focus();
        try { document.execCommand('fontSize', false, sizeSel.value); } catch (e) {}
      });
    })();

    /* ── Phone Dialer ────────────────────────────────────────────── */
    (function dialer() {
      var disp = document.getElementById('dialer-display');
      var pad = document.getElementById('dialer-pad');
      var status = document.getElementById('dialer-status');
      var dialBtn = document.getElementById('dialer-dial');
      var clearBtn = document.getElementById('dialer-clear');
      if (!disp || !pad) return;
      pad.addEventListener('click', function (e) {
        var b = e.target.closest('.dialer-key'); if (!b) return;
        if (disp.value.length < 24) disp.value += b.dataset.key;
        if (status) status.textContent = 'Ready';
      });
      if (dialBtn) dialBtn.addEventListener('click', function () {
        var n = disp.value.trim();
        if (!n) { if (status) status.textContent = 'Enter a number to dial.'; return; }
        if (status) status.textContent = 'Dialing ' + n + ' …';
        setTimeout(function () { if (status) status.textContent = 'Connected — demo dialer, no real call placed.'; }, 1300);
      });
      if (clearBtn) clearBtn.addEventListener('click', function () { disp.value = ''; if (status) status.textContent = 'Ready'; });
    })();

    /* ── Public openers (used by Programs menu + desktop New items) ── */
    function setCaption(winId, text) {
      var w = document.getElementById(winId); if (!w) return;
      var c = w.querySelector('.w95-titlebar__caption'); if (c) c.textContent = text;
    }
    window.openNotepad = function (name, content) {
      setCaption('win-notepad', (name || 'Untitled') + ' - Notepad');
      var ta = document.getElementById('notepad-area'); if (ta && content != null) ta.value = content;
      WM.open('win-notepad'); if (ta) setTimeout(function () { try { ta.focus(); } catch (e) {} }, 0);
    };
    window.openWordpad = function (name, html) {
      setCaption('win-wordpad', (name || 'Document') + ' - WordPad');
      var a = document.getElementById('wordpad-area'); if (a && html != null) a.innerHTML = html;
      WM.open('win-wordpad'); if (a) setTimeout(function () { try { a.focus(); } catch (e) {} }, 0);
    };
    window.openPaintDoc = function (name) { setCaption('win-paint', (name || 'untitled') + ' - Paint'); WM.open('win-paint'); };
    window.openFolderWin = function (name) { setCaption('win-folder', name || 'New Folder'); WM.open('win-folder'); };
    window.openSoundWin = function (name) { setCaption('win-sound', (name || 'Sound') + ' - Sound Recorder'); WM.open('win-sound'); };
  })();


  /* ══════════════════════════════════════════════════════════════════
     DESKTOP CONTEXT MENU — Arrange Icons + New (session-only items)
  ══════════════════════════════════════════════════════════════════ */
  (function setupDeskMenu() {
    var grid = document.getElementById('desktop-icons');
    var desktop = document.getElementById('desktop');
    var menu = document.getElementById('desktop-context-menu');
    if (!grid || !desktop || !menu) return;

    var ICON_W = 72, ICON_H = 72, GAP = 6, COL_W = 88, START_X = 8, START_Y = 8;
    var autoArrange = false;
    var newCounters = {};

    function rowsPerCol() { return Math.max(1, Math.floor(((desktop.offsetHeight || (window.innerHeight - 30)) - START_Y) / (ICON_H + GAP))); }
    function cellXY(col, row) { return { x: START_X + col * COL_W, y: START_Y + row * (ICON_H + GAP) }; }

    function allIcons() { return Array.prototype.slice.call(grid.querySelectorAll('.w95-deskicon')); }
    function labelText(ic) { var l = ic.querySelector('.w95-deskicon__label'); return l ? l.textContent.trim() : ''; }

    // Save the persistent (built-in) icons' positions so they survive reloads,
    // matching the existing 'w95.iconPos' store. New (session) icons are skipped.
    // Icon positions are session-only now (clean layout every boot), so
    // Arrange / Line up just reposition in-session without persisting.
    function persist() { /* no-op */ }

    function layout(list) {
      var rpc = rowsPerCol(), col = 0, row = 0;
      list.forEach(function (ic) {
        var c = cellXY(col, row);
        ic.style.position = 'absolute';
        ic.style.left = c.x + 'px';
        ic.style.top = c.y + 'px';
        persist(ic, c.x, c.y);
        row++; if (row >= rpc) { row = 0; col++; }
      });
    }

    function typeRank(ic) {
      var cls = ic.querySelector('span') ? ic.querySelector('span').className : '';
      if (/my-computer|folder|tree|hard-drive/.test(cls)) return 0;
      if (/recycle/.test(cls)) return 2;
      return 1;
    }

    function arrange(mode) {
      var list = allIcons();
      if (mode === 'name') list.sort(function (a, b) { return labelText(a).localeCompare(labelText(b)); });
      else if (mode === 'type') list.sort(function (a, b) { return (typeRank(a) - typeRank(b)) || labelText(a).localeCompare(labelText(b)); });
      else if (mode === 'date') list.reverse();
      // 'size' / default: keep current DOM order
      layout(list);
    }

    function lineUp() {
      allIcons().forEach(function (ic) {
        var x = parseInt(ic.style.left, 10) || 0, y = parseInt(ic.style.top, 10) || 0;
        var col = Math.round((x - START_X) / COL_W), row = Math.round((y - START_Y) / (ICON_H + GAP));
        var c = cellXY(Math.max(0, col), Math.max(0, row));
        ic.style.left = c.x + 'px'; ic.style.top = c.y + 'px';
        persist(ic, c.x, c.y);
      });
    }

    function occupied() {
      var set = {};
      allIcons().forEach(function (ic) {
        var x = parseInt(ic.style.left, 10) || 0, y = parseInt(ic.style.top, 10) || 0;
        set[Math.round((x - START_X) / COL_W) + '_' + Math.round((y - START_Y) / (ICON_H + GAP))] = true;
      });
      return set;
    }
    function nextCell() {
      var occ = occupied(), rpc = rowsPerCol();
      for (var col = 0; col < 30; col++) for (var row = 0; row < rpc; row++) {
        if (!occ[col + '_' + row]) return cellXY(col, row);
      }
      return cellXY(0, 0);
    }

    // Wire drag (session-only, no persistence) + select + dblclick-open for a new icon.
    function wireNewIcon(icon, openFn) {
      var sMX, sMY, sIX, sIY, dragging = false, moved = false;
      icon.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        sMX = e.clientX; sMY = e.clientY;
        sIX = parseInt(icon.style.left, 10) || 0; sIY = parseInt(icon.style.top, 10) || 0;
        dragging = true; moved = false; e.stopPropagation();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - sMX, dy = e.clientY - sMY;
        if (!moved && Math.sqrt(dx * dx + dy * dy) < 5) return;
        moved = true;
        var dh = desktop.offsetHeight || (window.innerHeight - 30), dw = desktop.offsetWidth || window.innerWidth;
        icon.style.left = Math.max(0, Math.min(dw - ICON_W, sIX + dx)) + 'px';
        icon.style.top = Math.max(0, Math.min(dh - ICON_H, sIY + dy)) + 'px';
        icon.style.zIndex = 50;
      });
      document.addEventListener('mouseup', function () {
        if (!dragging) return; dragging = false; icon.style.zIndex = '';
        if (moved && autoArrange) lineUp();
        if (moved) { icon.dataset.wasDragged = '1'; setTimeout(function () { delete icon.dataset.wasDragged; }, 60); }
      });
      icon.addEventListener('click', function (e) {
        e.stopPropagation();
        if (icon.dataset.wasDragged) return;
        allIcons().forEach(function (i) { i.classList.remove('is-selected'); });
        icon.classList.add('is-selected');
      });
      icon.addEventListener('dblclick', function () { if (!icon.dataset.wasDragged && openFn) openFn(); });
    }

    var NEW_TYPES = {
      folder:    { ico: 'w95-ico--folder',    base: 'New Folder',            open: function (n) { window.openFolderWin(n); } },
      shortcut:  { ico: 'w95-ico--run',        base: 'New Shortcut',          open: function (n) { window.openFolderWin(n); } },
      wave:      { ico: 'w95-ico--midi-file',  base: 'New Wave Sound',        open: function (n) { window.openSoundWin(n); } },
      text:      { ico: 'w95-ico--notepad',    base: 'New Text Document.txt', open: function (n) { window.openNotepad(n, ''); } },
      wordpad:   { ico: 'w95-ico--file',       base: 'New WordPad Document',  open: function (n) { window.openWordpad(n, ''); } },
      bitmap:    { ico: 'w95-ico--paint',      base: 'New Bitmap Image.bmp',  open: function (n) { window.openPaintDoc(n); } },
      briefcase: { ico: 'w95-ico--folder',     base: 'New Briefcase',         open: function (n) { window.openFolderWin(n); } }
    };

    function createNew(typeKey) {
      var def = NEW_TYPES[typeKey]; if (!def) return;
      // Unique default name (append a counter on repeats)
      newCounters[typeKey] = (newCounters[typeKey] || 0) + 1;
      var name = def.base + (newCounters[typeKey] > 1 ? ' (' + newCounters[typeKey] + ')' : '');

      var icon = document.createElement('button');
      icon.className = 'w95-deskicon w95-deskicon--new';
      icon.setAttribute('role', 'listitem');
      icon.setAttribute('tabindex', '0');
      icon.dataset.newtype = typeKey;
      var ico = document.createElement('span');
      ico.className = def.ico + ' w95-ico-32'; ico.setAttribute('aria-hidden', 'true');
      var lbl = document.createElement('span');
      lbl.className = 'w95-deskicon__label'; lbl.textContent = name;
      icon.appendChild(ico); icon.appendChild(lbl);

      var cell = nextCell();
      icon.style.position = 'absolute'; icon.style.width = ICON_W + 'px';
      icon.style.textAlign = 'center'; icon.style.left = cell.x + 'px'; icon.style.top = cell.y + 'px';
      grid.appendChild(icon);

      // openFn reads the *current* label so renamed items still open correctly
      wireNewIcon(icon, function () { def.open(lbl.textContent.trim() || def.base); });
      beginRename(icon, lbl);
    }

    // Inline rename (Win95 selects the label text right after creating an item)
    function beginRename(icon, lbl) {
      var input = document.createElement('input');
      input.type = 'text'; input.className = 'w95-deskicon__rename'; input.value = lbl.textContent;
      lbl.style.display = 'none'; icon.appendChild(input);
      input.focus(); input.select();
      function commit() {
        var v = input.value.trim();
        if (v) lbl.textContent = v;
        lbl.style.display = ''; if (input.parentNode) input.parentNode.removeChild(input);
      }
      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') { lbl.style.display = ''; if (input.parentNode) input.parentNode.removeChild(input); }
      });
      input.addEventListener('blur', commit);
      input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    // Menu wiring (delegate clicks on the context menu)
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.newtype != null || b.classList.contains('ctx-new')) { /* handled below by data-new */ }
      if (b.dataset.new) { createNew(b.dataset.new); menu.hidden = true; return; }
      if (b.dataset.arrange) {
        var m = b.dataset.arrange;
        if (m === 'lineup') lineUp();
        else if (m === 'auto') { autoArrange = !autoArrange; b.classList.toggle('is-checked', autoArrange); if (autoArrange) arrange('name'); }
        else arrange(m);
        if (m !== 'auto') menu.hidden = true;
        return;
      }
    });
  })();


  /* ══════════════════════════════════════════════════════════════════
     FILE DIALOG — Win95 "Save As" / "Open" over the virtual file system.
     Pick a folder INSIDE the simulated OS (My Computer) + a file name; the
     file is written to W95FS (localStorage), NOT downloaded to the real device.
  ══════════════════════════════════════════════════════════════════ */
  (function setupFileDialog() {
    var win = document.getElementById('win-filedlg'); if (!win) return;
    var titleEl   = document.getElementById('filedlg-title');
    var whereEl   = document.getElementById('filedlg-where');
    var listEl    = document.getElementById('filedlg-list');
    var nameEl    = document.getElementById('filedlg-name');
    var typeEl    = document.getElementById('filedlg-type');
    var acceptBtn = document.getElementById('filedlg-accept');
    var cancelBtn = document.getElementById('filedlg-cancel');
    var upBtn     = document.getElementById('filedlg-up');
    var nfBtn     = document.getElementById('filedlg-newfolder');
    var DEFAULT = ['My Computer', 'C:', 'My Documents'];
    var cur = DEFAULT.slice();
    var mode = 'save', onAccept = null, typeFilter = null;

    function matchType(name) {
      if (!typeFilter || !typeFilter.length) return true;
      return typeFilter.some(function (ext) { return ext === '*' || new RegExp('\\.' + ext + '$', 'i').test(name); });
    }
    function render() {
      if (whereEl) whereEl.textContent = cur[cur.length - 1] || 'My Computer';
      var ch = window.W95FS.childrenOf(cur) || {};
      listEl.innerHTML = '';
      var names = Object.keys(ch);
      var folders = names.filter(function (n) { return ch[n].type !== 'file'; });
      var files = names.filter(function (n) { return ch[n].type === 'file' && (mode === 'save' || matchType(n)); });
      folders.concat(files).forEach(function (name) {
        var e = ch[name];
        var item = document.createElement('button');
        item.className = 'filedlg-item';
        var ico = document.createElement('span');
        ico.className = (e.type === 'file' ? (e.icon || 'w95-ico--file') : 'w95-ico--folder') + ' w95-ico-16';
        ico.setAttribute('aria-hidden', 'true');
        var lbl = document.createElement('span'); lbl.textContent = name;
        item.appendChild(ico); item.appendChild(lbl);
        item.addEventListener('click', function () {
          if (e.type === 'file') nameEl.value = name;
          Array.prototype.forEach.call(listEl.children, function (c) { c.classList.remove('is-selected'); });
          item.classList.add('is-selected');
        });
        item.addEventListener('dblclick', function () {
          if (e.type !== 'file') { cur = cur.concat([name]); render(); }
          else { nameEl.value = name; if (mode === 'open') accept(); }
        });
        listEl.appendChild(item);
      });
      if (upBtn) upBtn.disabled = (cur.length <= 1);
    }
    function accept() {
      var fn = (nameEl.value || '').trim(); if (!fn) return;
      if (mode === 'save' && typeFilter && typeFilter.length && typeFilter[0] !== '*' && !matchType(fn)) fn += '.' + typeFilter[0];
      var path = cur.slice();
      WM.close('win-filedlg');
      if (onAccept) onAccept(path, fn);
    }
    if (acceptBtn) acceptBtn.addEventListener('click', accept);
    if (cancelBtn) cancelBtn.addEventListener('click', function () { WM.close('win-filedlg'); });
    if (upBtn) upBtn.addEventListener('click', function () { if (cur.length > 1) { cur = cur.slice(0, -1); render(); } });
    if (nfBtn) nfBtn.addEventListener('click', function () { window.W95Prompt({ title: 'New Folder', label: 'New folder name:', value: 'New Folder', onOk: function (n) { window.W95FS.mkdir(cur, n); render(); } }); });
    if (nameEl) nameEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') accept(); });

    window.W95Dialog = { open: function (opts) {
      mode = opts.mode || 'save';
      onAccept = opts.onAccept || null;
      typeFilter = opts.types || null;
      if (titleEl) titleEl.textContent = (mode === 'save' ? 'Save As' : 'Open');
      if (acceptBtn) acceptBtn.textContent = (mode === 'save' ? 'Save' : 'Open');
      cur = (opts.path && window.W95FS.getNode(opts.path)) ? opts.path.slice() : DEFAULT.slice();
      if (!window.W95FS.getNode(cur)) cur = ['My Computer'];
      if (nameEl) nameEl.value = opts.name || '';
      if (typeEl) { typeEl.innerHTML = ''; (opts.typeLabels || ['All Files (*.*)']).forEach(function (t) { var o = document.createElement('option'); o.textContent = t; typeEl.appendChild(o); }); }
      WM.open('win-filedlg');
      render();
      if (nameEl) setTimeout(function () { try { nameEl.focus(); } catch (e) {} }, 0);
    } };
  })();


  /* ══════════════════════════════════════════════════════════════════
     NOTEPAD / WORDPAD — File·Edit·Search·Help menus, saving INTO the
     simulated OS (My Computer) via the Save/Open dialog. Files persist in
     localStorage and reappear in My Computer — like a real OS.
  ══════════════════════════════════════════════════════════════════ */
  (function setupAppFileMenus() {

    // Write a user file into the simulated file system, then refresh Explorer.
    function writeVFS(folderPath, name, content, app, icon) {
      window.W95FS.addFile(folderPath, name, { type: 'file', content: content, app: app, icon: icon });
      if (window.__w95refreshExplorer) window.__w95refreshExplorer();
    }

    function setCaption(winId, text) { var w = document.getElementById(winId); if (!w) return; var c = w.querySelector('.w95-titlebar__caption'); if (c) c.textContent = text; }
    function insertAtCursor(ta, text) { var s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + text + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + text.length; ta.focus(); }

    /* buildMenuBar lives at the top-level scope (hoisted) so Explorer and
       Paint can build working menubars too. */

    /* ── Notepad ─────────────────────────────────────────────────── */
    (function notepad() {
      var area = document.getElementById('notepad-area'); if (!area) return;
      var st = { folder: null, name: 'Untitled' };   // folder = path array inside W95FS
      var lastFind = '';
      function title(n) { st.name = n; setCaption('win-notepad', n + ' - Notepad'); }
      function exec(cmd) { area.focus(); try { document.execCommand(cmd, false, null); } catch (e) {} }
      function findNext() {
        if (!lastFind) return;
        var from = area.selectionEnd || 0;
        var idx = area.value.indexOf(lastFind, from);
        if (idx < 0) idx = area.value.indexOf(lastFind, 0);
        if (idx >= 0) { area.focus(); area.setSelectionRange(idx, idx + lastFind.length); }
        else window.W95Alert('Cannot find "' + lastFind + '"');
      }
      function doSaveAs() {
        window.W95Dialog.open({
          mode: 'save', name: (st.name || 'Untitled').replace(/\.[^.]+$/, '') + '.txt',
          path: st.folder || undefined, types: ['txt'], typeLabels: ['Text Documents (*.txt)', 'All Files (*.*)'],
          onAccept: function (folder, fn) { writeVFS(folder, fn, area.value, 'notepad', 'w95-ico--notepad'); st.folder = folder; title(fn); }
        });
      }
      function doSave() { if (st.folder) writeVFS(st.folder, st.name, area.value, 'notepad', 'w95-ico--notepad'); else doSaveAs(); }
      function openInto(folder, fn) {
        var node = window.W95FS.getNode(folder.concat([fn])); if (!node) return;
        if (node.content != null) { area.value = node.content; st.folder = folder; title(fn); }
        else if (node.url) {
          if (/\.(txt|md|html?|csv|json)$/i.test(fn)) { fetch(node.url).then(function (r) { return r.text(); }).then(function (t) { area.value = t; st.folder = folder; title(fn); }).catch(function () {}); }
          else window.openIE(node.url, fn);
        }
      }
      // Opened from the Explorer (double-click a saved .txt)
      window.openNotepadFile = function (folder, name, content) { area.value = content; st.folder = folder; title(name); WM.open('win-notepad'); setTimeout(function () { try { area.focus(); } catch (e) {} }, 0); };

      buildMenuBar('win-notepad', [
        { name: 'File', items: [
          { label: 'New', accel: 'Ctrl+N', action: function () { area.value = ''; st.folder = null; title('Untitled'); area.focus(); } },
          { label: 'Open…', accel: 'Ctrl+O', action: function () { window.W95Dialog.open({ mode: 'open', path: st.folder || undefined, types: ['txt', 'md', 'html', 'htm'], typeLabels: ['Text Documents (*.txt)', 'All Files (*.*)'], onAccept: openInto }); } },
          { label: 'Save', accel: 'Ctrl+S', action: doSave },
          { label: 'Save As…', action: doSaveAs },
          { sep: true },
          { label: 'Print…', disabled: true },
          { sep: true },
          { label: 'Exit', action: function () { WM.close('win-notepad'); } }
        ] },
        { name: 'Edit', items: [
          { label: 'Undo', accel: 'Ctrl+Z', action: function () { exec('undo'); } },
          { sep: true },
          { label: 'Cut', accel: 'Ctrl+X', action: function () { exec('cut'); } },
          { label: 'Copy', accel: 'Ctrl+C', action: function () { exec('copy'); } },
          { label: 'Paste', accel: 'Ctrl+V', action: function () { area.focus(); if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(function (t) { insertAtCursor(area, t); }).catch(function () {}); } } },
          { label: 'Delete', accel: 'Del', action: function () { insertAtCursor(area, ''); } },
          { sep: true },
          { label: 'Select All', accel: 'Ctrl+A', action: function () { area.focus(); area.select(); } },
          { label: 'Time/Date', accel: 'F5', action: function () { insertAtCursor(area, new Date().toLocaleString()); } },
          { label: 'Word Wrap', action: function () { area.wrap = (area.wrap === 'off' || !area.wrap) ? 'soft' : 'off'; area.style.whiteSpace = (area.wrap === 'soft') ? 'pre-wrap' : 'pre'; } }
        ] },
        { name: 'Search', items: [
          { label: 'Find…', accel: 'Ctrl+F', action: function () { window.W95Prompt({ title: 'Find', label: 'Find what:', value: lastFind, onOk: function (t) { lastFind = t; findNext(); } }); } },
          { label: 'Find Next', accel: 'F3', action: findNext }
        ] },
        { name: 'Help', items: [
          { label: 'About Notepad', action: function () { window.W95Alert('Notepad\nSai Teja Mothukuri — Windows 95 portfolio edition'); } }
        ] }
      ]);
    })();

    /* ── WordPad ─────────────────────────────────────────────────── */
    (function wordpad() {
      var area = document.getElementById('wordpad-area'); if (!area) return;
      var st = { folder: null, name: 'Document' };
      function title(n) { st.name = n; setCaption('win-wordpad', n + ' - WordPad'); }
      function exec(cmd, val) { area.focus(); try { document.execCommand(cmd, false, val || null); } catch (e) {} }
      function doSaveAs() {
        window.W95Dialog.open({
          mode: 'save', name: (st.name || 'Document').replace(/\.[^.]+$/, '') + '.html',
          path: st.folder || undefined, types: ['html'], typeLabels: ['Rich Text Document (*.html)', 'All Files (*.*)'],
          onAccept: function (folder, fn) { writeVFS(folder, fn, area.innerHTML, 'wordpad', 'w95-ico--file'); st.folder = folder; title(fn); }
        });
      }
      function doSave() { if (st.folder) writeVFS(st.folder, st.name, area.innerHTML, 'wordpad', 'w95-ico--file'); else doSaveAs(); }
      function openInto(folder, fn) {
        var node = window.W95FS.getNode(folder.concat([fn])); if (!node) return;
        if (node.content != null) { area.innerHTML = node.content; st.folder = folder; title(fn); }
        else if (node.url) { fetch(node.url).then(function (r) { return r.text(); }).then(function (t) { if (/\.html?$/i.test(fn)) area.innerHTML = t; else area.textContent = t; st.folder = folder; title(fn); }).catch(function () {}); }
      }
      window.openWordpadFile = function (folder, name, content) { area.innerHTML = content; st.folder = folder; title(name); WM.open('win-wordpad'); setTimeout(function () { try { area.focus(); } catch (e) {} }, 0); };

      buildMenuBar('win-wordpad', [
        { name: 'File', items: [
          { label: 'New', accel: 'Ctrl+N', action: function () { area.innerHTML = ''; st.folder = null; title('Document'); area.focus(); } },
          { label: 'Open…', accel: 'Ctrl+O', action: function () { window.W95Dialog.open({ mode: 'open', path: st.folder || undefined, types: ['html', 'htm', 'txt', 'md'], typeLabels: ['Rich Text Document (*.html)', 'All Files (*.*)'], onAccept: openInto }); } },
          { label: 'Save', accel: 'Ctrl+S', action: doSave },
          { label: 'Save As…', action: doSaveAs },
          { sep: true },
          { label: 'Exit', action: function () { WM.close('win-wordpad'); } }
        ] },
        { name: 'Edit', items: [
          { label: 'Undo', accel: 'Ctrl+Z', action: function () { exec('undo'); } },
          { label: 'Redo', accel: 'Ctrl+Y', action: function () { exec('redo'); } },
          { sep: true },
          { label: 'Cut', accel: 'Ctrl+X', action: function () { exec('cut'); } },
          { label: 'Copy', accel: 'Ctrl+C', action: function () { exec('copy'); } },
          { label: 'Paste', accel: 'Ctrl+V', action: function () { area.focus(); if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(function (t) { exec('insertText', t); }).catch(function () {}); } } },
          { sep: true },
          { label: 'Select All', accel: 'Ctrl+A', action: function () { area.focus(); try { document.execCommand('selectAll', false, null); } catch (e) {} } }
        ] },
        { name: 'Insert', items: [
          { label: 'Date and Time', action: function () { exec('insertText', new Date().toLocaleString()); } }
        ] },
        { name: 'Format', items: [
          { label: 'Bold', accel: 'Ctrl+B', action: function () { exec('bold'); } },
          { label: 'Italic', accel: 'Ctrl+I', action: function () { exec('italic'); } },
          { label: 'Underline', accel: 'Ctrl+U', action: function () { exec('underline'); } },
          { sep: true },
          { label: 'Bullet List', action: function () { exec('insertUnorderedList'); } },
          { label: 'Align Left', action: function () { exec('justifyLeft'); } },
          { label: 'Center', action: function () { exec('justifyCenter'); } },
          { label: 'Align Right', action: function () { exec('justifyRight'); } }
        ] },
        { name: 'Help', items: [
          { label: 'About WordPad', action: function () { window.W95Alert('WordPad\nSai Teja Mothukuri — Windows 95 portfolio edition'); } }
        ] }
      ]);
    })();
  })();


  /* ══════════════════════════════════════════════════════════════════
     FILE OPS — Explorer right-click menu + Win95 error / properties dialogs.
     Rename & Delete only work on USER-created files; built-in (system) files
     raise an authentic "you don't have admin access" error.
  ══════════════════════════════════════════════════════════════════ */
  (function setupFileOps() {

    // Generic centered Win95 modal dialog.
    function w95modal(opts) {
      var overlay = document.createElement('div');
      overlay.className = 'w95-modal-overlay';
      var win = document.createElement('div');
      win.className = 'w95-window w95-modal';
      win.setAttribute('role', 'dialog'); win.setAttribute('aria-modal', 'true');
      win.innerHTML =
        '<header class="w95-titlebar"><span class="w95-titlebar__caption">' + opts.title + '</span>' +
        '<div class="w95-titlebar__controls"><button class="w95-ctrl win-close" aria-label="Close">&#10005;</button></div></header>' +
        '<div class="w95-window__body w95-modal__body">' + opts.body + '</div>' +
        '<div class="w95-modal__actions"></div>';
      var actions = win.querySelector('.w95-modal__actions');
      function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
      (opts.buttons || [{ label: 'OK', primary: true }]).forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'w95-btn' + (b.primary ? ' w95-btn--default' : '');
        btn.textContent = b.label;
        btn.addEventListener('click', function () { if (b.onClick) b.onClick(); close(); });
        actions.appendChild(btn);
      });
      win.querySelector('.win-close').addEventListener('click', close);
      overlay.appendChild(win);
      document.body.appendChild(overlay);
      var def = win.querySelector('.w95-btn--default') || win.querySelector('.w95-btn');
      if (def) setTimeout(function () { try { def.focus(); } catch (e) {} }, 0);
      return close;
    }

    window.W95Error = function (msg, title) {
      try { var s = new Audio('assets/win95/sounds/Error%20sound.mp3'); s.volume = 0.6; s.play().catch(function () {}); } catch (e) {}
      return w95modal({
        title: title || 'Access Denied',
        body: '<div class="w95-errrow"><span class="w95-erricon" aria-hidden="true">&#215;</span><p>' + msg + '</p></div>',
        buttons: [{ label: 'OK', primary: true }]
      });
    };

    window.W95Properties = function (ctx) {
      var e = ctx.entry, name = ctx.name;
      var isFolder = e.type !== 'file';
      var type = isFolder ? 'File Folder' : (e.app ? (e.app.charAt(0).toUpperCase() + e.app.slice(1) + ' Document')
        : (e.url && /\.pdf$/i.test(e.url) ? 'Adobe Acrobat Document' : (e.url && /\.jpe?g$/i.test(e.url) ? 'JPEG Image' : 'Document')));
      var size = e.content != null ? (e.content.length / 1024).toFixed(1) + ' KB' : '—';
      w95modal({
        title: name + ' Properties',
        body: '<table class="w95-props">' +
          '<tr><td>Name:</td><td><b>' + name + '</b></td></tr>' +
          '<tr><td>Type:</td><td>' + type + '</td></tr>' +
          '<tr><td>Location:</td><td>' + ctx.path.join('\\') + '</td></tr>' +
          '<tr><td>Size:</td><td>' + size + '</td></tr>' +
          '<tr><td>Attributes:</td><td>' + (e.user ? 'Read &amp; Write (created by you)' : 'Read-only (system)') + '</td></tr>' +
          '</table>',
        buttons: [{ label: 'OK', primary: true }]
      });
    };

    // Win95-styled replacements for the browser's native alert()/prompt().
    window.W95Alert = function (message, title) {
      return w95modal({
        title: title || 'Information',
        body: '<div class="w95-errrow"><span class="w95-erricon w95-erricon--i" aria-hidden="true">i</span><p>' + String(message).replace(/\n/g, '<br>') + '</p></div>',
        buttons: [{ label: 'OK', primary: true }]
      });
    };
    window.W95Prompt = function (opts) {
      opts = opts || {};
      w95modal({
        title: opts.title || 'Input',
        body: '<p style="font-size:12px;margin-bottom:8px">' + (opts.label || 'Enter a value:') + '</p>' +
              '<input type="text" class="w95-input" id="w95-prompt-input" style="width:100%" value="' + String(opts.value || '').replace(/"/g, '&quot;') + '">',
        buttons: [
          { label: 'OK', primary: true, onClick: function () { var inp = document.getElementById('w95-prompt-input'); var v = inp ? inp.value.trim() : ''; if (v && opts.onOk) opts.onOk(v); } },
          { label: 'Cancel' }
        ]
      });
      setTimeout(function () { var inp = document.getElementById('w95-prompt-input'); if (inp) { inp.focus(); inp.select(); } }, 0);
    };

    function dataURLtoBlob(d) {
      var parts = d.split(','), mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
      var bin = atob(parts[1]), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    function download(ctx) {
      var e = ctx.entry, a = document.createElement('a');
      if (e.content != null) {
        var blob = /^data:/.test(e.content) ? dataURLtoBlob(e.content) : new Blob([e.content], { type: e.app === 'wordpad' ? 'text/html' : 'text/plain' });
        a.href = URL.createObjectURL(blob); a.download = ctx.name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
      } else if (e.url) {
        a.href = e.url; a.download = ctx.name; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      }
    }

    window.W95FileMenu = function (x, y, ctx) {
      var old = document.getElementById('w95-filemenu'); if (old) old.remove();
      var menu = document.createElement('div');
      menu.id = 'w95-filemenu'; menu.className = 'desktop-context-menu'; menu.setAttribute('role', 'menu');
      var e = ctx.entry, isUser = !!e.user, isFile = e.type === 'file';
      var items = [{ label: 'Open', action: ctx.open }];
      if (isFile) items.push({ label: 'Download', action: function () { download(ctx); } });
      items.push({ sep: true }, { label: 'Rename', guarded: true }, { label: 'Delete', guarded: true }, { sep: true }, { label: 'Properties', action: function () { window.W95Properties(ctx); } });

      function hide() { if (menu.parentNode) menu.remove(); document.removeEventListener('mousedown', onDoc, true); }
      function onDoc(ev) { if (!menu.contains(ev.target)) hide(); }

      items.forEach(function (it) {
        if (it.sep) { var s = document.createElement('div'); s.className = 'desktop-context-menu__sep'; menu.appendChild(s); return; }
        var b = document.createElement('button'); b.className = 'desktop-context-menu__item'; b.setAttribute('role', 'menuitem'); b.textContent = it.label;
        b.addEventListener('click', function () {
          hide();
          if (it.guarded) {
            if (!isUser) { window.W95Error('You do not have permission to ' + it.label.toLowerCase() + ' &ldquo;' + ctx.name + '&rdquo;. This is a read-only system file. Contact your administrator.'); return; }
            if (it.label === 'Rename') {
              w95modal({
                title: 'Rename',
                body: '<p style="font-size:12px;margin-bottom:8px">New name:</p><input type="text" class="w95-input" id="w95-rename-input" style="width:100%" value="' + ctx.name.replace(/"/g, '&quot;') + '">',
                buttons: [
                  { label: 'OK', primary: true, onClick: function () { var inp = document.getElementById('w95-rename-input'); var v = inp ? inp.value.trim() : ''; if (v && v !== ctx.name) { window.W95FS.rename(ctx.path, ctx.name, v); if (ctx.refresh) ctx.refresh(); } } },
                  { label: 'Cancel' }
                ]
              });
              setTimeout(function () { var inp = document.getElementById('w95-rename-input'); if (inp) { inp.focus(); inp.select(); } }, 0);
            } else {
              w95modal({
                title: 'Confirm File Delete',
                body: '<div class="w95-errrow"><span class="w95-erricon w95-erricon--q" aria-hidden="true">?</span><p>Are you sure you want to delete &ldquo;' + ctx.name + '&rdquo;?</p></div>',
                buttons: [
                  { label: 'Yes', primary: true, onClick: function () { window.W95FS.removeNode(ctx.path, ctx.name); if (ctx.refresh) ctx.refresh(); } },
                  { label: 'No' }
                ]
              });
            }
            return;
          }
          if (it.action) it.action();
        });
        menu.appendChild(b);
      });
      document.body.appendChild(menu);
      var mw = menu.offsetWidth, mh = menu.offsetHeight;
      if (x + mw > window.innerWidth) x = window.innerWidth - mw - 2;
      if (y + mh > window.innerHeight - 30) y = window.innerHeight - 30 - mh;
      menu.style.left = Math.max(0, x) + 'px'; menu.style.top = Math.max(0, y) + 'px';
      setTimeout(function () { document.addEventListener('mousedown', onDoc, true); }, 0);
    };
  })();


  /* The About window now auto-opens after the power-on boot sequence
     completes (see setupPowerOn → runBoot above). */

})();
