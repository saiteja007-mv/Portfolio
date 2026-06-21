/* ══════════════════════════════════════════════════════════════════
   ACTION CENTER — post-boot toast announcing the live AI apps.
   Auto-shows once after boot, auto-hides after a few seconds, can be
   closed, and re-opened anytime from the tray 💡 button.
═══════════════════════════════════════════════════════════════════ */
(function notify() {
  'use strict';

  var AUTO_HIDE_MS = 11000, BOOT_DELAY_MS = 2500;
  var toast, closeBtn, trayBtn, hideTimer = null, booted = false;

  function $(id) { return document.getElementById(id); }
  function seen() { try { return sessionStorage.getItem('w95notifySeen') === '1'; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem('w95notifySeen', '1'); } catch (e) {} if (trayBtn) trayBtn.classList.remove('is-pulsing'); }

  function show() {
    if (!toast) return;
    clearTimeout(hideTimer);
    toast.classList.remove('is-hiding');
    toast.style.display = 'block';
    markSeen();
    hideTimer = setTimeout(hide, AUTO_HIDE_MS);
  }
  function hide() {
    if (!toast) return;
    clearTimeout(hideTimer);
    toast.classList.add('is-hiding');
    setTimeout(function () { toast.style.display = 'none'; toast.classList.remove('is-hiding'); }, 280);
  }

  function init() {
    toast = $('notify-toast'); closeBtn = $('notify-close'); trayBtn = $('notify-tray');
    if (!toast || !trayBtn) return;

    closeBtn.addEventListener('click', hide);
    trayBtn.addEventListener('click', function () {
      if (toast.style.display === 'block') { hide(); } else { show(); }
    });

    // Fire once after the desktop boots. We detect boot by the power-on screen
    // disappearing (robust regardless of how windows are opened).
    function bootNotify() {
      if (booted) return; booted = true;
      if (seen()) return;
      trayBtn.classList.add('is-pulsing');
      setTimeout(show, BOOT_DELAY_MS);
    }
    function hidden(id) { var e = document.getElementById(id); return !e || getComputedStyle(e).display === 'none'; }
    var ps = document.getElementById('power-screen');
    if (!ps) { setTimeout(bootNotify, 1500); return; }   // no power gate → just show
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      // Only after BOTH the power-on screen AND the boot splash are gone.
      if (hidden('power-screen') && hidden('boot-splash')) { clearInterval(iv); bootNotify(); }
      else if (tries > 200) { clearInterval(iv); }        // ~80s safety stop
    }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
