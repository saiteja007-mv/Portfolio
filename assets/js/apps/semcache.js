/* ══════════════════════════════════════════════════════════════════
   SEMANTIC CACHE FOR LLMs — native Win95 app (win-semcache)
   - Embeds the prompt (/api/embed), cosine-matches against cached prompts
   - Exact-hash fast path; semantic hit at cosine >= threshold skips the LLM
   - LRU eviction; live hit/miss + "LLM calls saved" stats
═══════════════════════════════════════════════════════════════════ */
(function semcache() {
  'use strict';

  var THRESHOLD = 0.85, MAX_ENTRIES = 50;
  var cache = [];                 // [{key, text, vec, answer}] (front = most-recent)
  var stats = { hits: 0, miss: 0, saved: 0 };
  var el = {}, busy = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(t) { return String(t || '').toLowerCase().trim().replace(/\s+/g, ' '); }
  function setStatus(m, k) { el.status.textContent = m || ''; el.status.className = 'app-status' + (k ? ' app-status--' + k : ''); }

  function l2(v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i] * v[i]; s = Math.sqrt(s) || 1; var o = new Array(v.length); for (i = 0; i < v.length; i++) o[i] = v[i] / s; return o; }
  function dot(a, b) { var s = 0, n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) s += a[i] * b[i]; return s; }

  async function embed(text) {
    var r = await fetch('/api/embed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: [text] }) });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.vectors || !d.vectors[0]) { var e = new Error(d.error || 'embed failed'); e.handled = true; throw e; }
    return l2(d.vectors[0]);
  }
  async function complete(q) {
    var r = await fetch('/api/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: 'Answer the question in 2-3 concise sentences.' }, { role: 'user', content: q }], max_tokens: 200 })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.reply) { var e = new Error(d.error || 'LLM failed'); e.handled = true; throw e; }
    return String(d.reply).replace(/\*\*/g, '').replace(/__/g, '');
  }

  function touch(entry) { var i = cache.indexOf(entry); if (i > 0) { cache.splice(i, 1); cache.unshift(entry); } }
  function store(key, text, vec, answer) {
    cache.unshift({ key: key, text: text, vec: vec, answer: answer });
    if (cache.length > MAX_ENTRIES) cache.pop();
  }

  function render(kind, sim, q, answer, ms) {
    var badge = kind === 'exact' ? 'HIT · exact' : kind === 'semantic' ? ('HIT · semantic ' + sim.toFixed(2)) : 'MISS · called LLM';
    var cls = kind === 'miss' ? 'sc-miss' : 'sc-hit';
    var row = document.createElement('div');
    row.className = 'sc-entry';
    row.innerHTML = '<div class="sc-badge ' + cls + '">' + badge + ' · ' + ms + 'ms</div>' +
      '<div class="sc-q">' + esc(q) + '</div>' +
      '<div class="sc-a">' + esc(answer) + '</div>';
    el.log.insertBefore(row, el.log.firstChild);
  }
  function updateStats() {
    el.n.textContent = cache.length; el.hits.textContent = stats.hits;
    el.miss.textContent = stats.miss; el.saved.textContent = stats.saved;
  }

  async function ask(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true; el.ask.disabled = true;
    var t0 = (window.performance && performance.now) ? performance.now() : 0;
    var key = norm(q);

    // 1) exact-hash fast path — no network at all
    for (var i = 0; i < cache.length; i++) {
      if (cache[i].key === key) {
        touch(cache[i]); stats.hits++; stats.saved++;
        render('exact', 1, q, cache[i].answer, Math.round((performance.now ? performance.now() : 0) - t0));
        updateStats(); setStatus('Exact cache hit — 0 calls.', 'ok'); el.ask.disabled = false; busy = false; return;
      }
    }

    try {
      setStatus('Embedding prompt…', null);
      var vec = await embed(q);
      var best = -1, bestE = null;
      for (var j = 0; j < cache.length; j++) { var s = dot(vec, cache[j].vec); if (s > best) { best = s; bestE = cache[j]; } }
      if (bestE && best >= THRESHOLD) {
        touch(bestE); stats.hits++; stats.saved++;
        render('semantic', best, q, bestE.answer, Math.round((performance.now ? performance.now() : 0) - t0));
        updateStats(); setStatus('Semantic cache hit (cosine ' + best.toFixed(3) + ') — skipped the LLM.', 'ok');
      } else {
        setStatus('Cache miss — calling the LLM…', null);
        var ans = await complete(q);
        store(key, q, vec, ans); stats.miss++;
        render('miss', best, q, ans, Math.round((performance.now ? performance.now() : 0) - t0));
        updateStats(); setStatus('Cached the new answer (best prior match ' + (best < 0 ? 'n/a' : best.toFixed(3)) + ').', 'ok');
      }
    } catch (e) {
      setStatus('⚠ ' + (e.message || 'error'), 'err');
    } finally { el.ask.disabled = false; busy = false; }
  }

  function bind() {
    el.pane = $('sc-pane'); if (!el.pane) return false;
    el.q = $('sc-q'); el.ask = $('sc-ask'); el.status = $('sc-status'); el.log = $('sc-log');
    el.n = $('sc-n'); el.hits = $('sc-hits'); el.miss = $('sc-miss'); el.saved = $('sc-saved');
    el.ask.addEventListener('click', function () { ask(el.q.value); });
    el.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(el.q.value); });
    var chips = $('sc-chips');
    if (chips) chips.querySelectorAll('.ai-chip').forEach(function (b) { b.addEventListener('click', function () { el.q.value = b.textContent.trim(); ask(el.q.value); }); });
    return true;
  }
  function init() { bind(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
