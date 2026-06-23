/* ══════════════════════════════════════════════════════════════════
   ASK AI ABOUT ME — chat UI for the iOS "Ask AI" app sheet (#app-askai).
   Talks to the serverless proxy at /api/chat (OpenRouter, free models).
   No API key here — the key stays server-side.
   iOS port: WM dependency removed; seeds + focuses on `ios:appopen`.
═══════════════════════════════════════════════════════════════════ */
(function aiChat() {
  'use strict';

  var log, form, input, sendBtn, statusEl;
  var history = [];          // [{role:'user'|'assistant', content}]
  var busy = false;
  var seeded = false;
  var idleStatus = 'Powered by OpenRouter · free';
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shortModel(id) {
    // 'nvidia/nemotron-3-nano-30b-a3b:free' -> 'nemotron-3-nano-30b-a3b'
    return String(id || '').split('/').pop().replace(/:free$/, '');
  }

  var SUGGESTIONS = [
    'What does Sai Teja do?',
    'Tell me about his ML projects',
    'Experience with LLMs & RAG?',
    'What\'s his tech stack?',
    'How do I contact him?'
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  // Reveal text word-by-word into a bubble (typewriter feel).
  function typeInto(bubbleEl, text, done) {
    if (reduceMotion) {
      bubbleEl.innerHTML = esc(text).replace(/\n/g, '<br>');
      scrollDown(); done && done(); return;
    }
    var tokens = text.split(/(\s+)/); // keep whitespace between words
    var i = 0;
    (function step() {
      if (i >= tokens.length) { done && done(); return; }
      bubbleEl.innerHTML += esc(tokens[i]).replace(/\n/g, '<br>');
      i++;
      scrollDown();
      setTimeout(step, 22);
    })();
  }

  function addBubble(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'ai-msg ai-msg--' + role;
    var avatar = role === 'user' ? '🧑' : '🤖';
    var label = role === 'user' ? 'You' : 'AI assistant';
    wrap.innerHTML =
      '<span class="ai-msg__avatar" title="' + label + '" aria-label="' + label + '">' + avatar + '</span>' +
      '<div class="ai-msg__bubble">' + esc(text).replace(/\n/g, '<br>') + '</div>';
    log.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'ai-msg ai-msg--assistant ai-typing';
    t.id = 'ai-typing';
    t.innerHTML =
      '<span class="ai-msg__avatar" aria-label="AI assistant">🤖</span>' +
      '<div class="ai-msg__bubble"><span class="ai-dot"></span>' +
      '<span class="ai-dot"></span><span class="ai-dot"></span></div>';
    log.appendChild(t);
    scrollDown();
  }
  function hideTyping() {
    var t = document.getElementById('ai-typing');
    if (t) { t.parentNode.removeChild(t); }
  }

  function renderChips() {
    var box = document.createElement('div');
    box.className = 'ai-chips';
    SUGGESTIONS.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-chip';
      b.textContent = q;
      b.onclick = function () { ask(q); };
      box.appendChild(b);
    });
    log.appendChild(box);
    scrollDown();
  }

  function seed() {
    if (seeded) { return; }
    seeded = true;
    addBubble('assistant',
      "Hi! I'm Sai Teja's AI assistant. Ask me about his experience, skills, " +
      "or projects — I answer from his profile. Try one of these:");
    renderChips();
  }

  function setBusy(on) {
    busy = on;
    input.disabled = on;
    sendBtn.disabled = on;
    statusEl.textContent = on ? 'Thinking…' : idleStatus;
  }

  async function ask(text) {
    text = (text || '').trim();
    if (!text || busy) { return; }

    // Remove the starter chips once a conversation begins.
    var chips = log.querySelector('.ai-chips');
    if (chips) { chips.parentNode.removeChild(chips); }

    addBubble('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    setBusy(true);
    showTyping();

    try {
      var resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      var data = await resp.json().catch(function () { return {}; });
      hideTyping();

      if (!resp.ok || !data.reply) {
        var msg = data.error ||
          'Sorry — I could not reach the AI service. Please try again, or email contact@saitejamothukuri.com.';
        addBubble('assistant', msg);
        history.pop(); // don't keep a failed turn in history
        setBusy(false);
        input.focus();
      } else {
        if (data.model) { idleStatus = 'Model: ' + shortModel(data.model) + ' · free'; }
        history.push({ role: 'assistant', content: data.reply });
        var inner = addBubble('assistant', '').querySelector('.ai-msg__bubble');
        typeInto(inner, data.reply, function () {
          setBusy(false);
          input.focus();
        });
      }
    } catch (e) {
      hideTyping();
      var offline = location.protocol === 'file:';
      addBubble('assistant',
        offline
          ? 'Live AI is offline here. Run the dev server (node dev-server.js) ' +
            'or open the deployed site to enable it. Meanwhile, reach Sai Teja ' +
            'at contact@saitejamothukuri.com.'
          : 'Network error — the AI service is unreachable right now. ' +
            'You can still reach Sai Teja at contact@saitejamothukuri.com.');
      history.pop();
      setBusy(false);
      input.focus();
    }
  }

  function init() {
    log = document.getElementById('ai-chat-log');
    form = document.getElementById('ai-chat-form');
    input = document.getElementById('ai-chat-input');
    sendBtn = document.getElementById('ai-chat-send');
    statusEl = document.getElementById('ai-chat-status');
    if (!log || !form) { return; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });

    // Seed the greeting + focus the first time the Ask AI sheet opens.
    // Shell dispatches `ios:appopen` after the sheet is visible.
    document.addEventListener('ios:appopen', function (e) {
      if (!e.detail || e.detail.id !== 'askai') { return; }
      seed(); // guarded — seeds once
      setTimeout(function () { if (input) { input.focus(); } }, 50);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
