/* ══════════════════════════════════════════════════════════════════
   HYBRID SEARCH RAG — native Win95 app (win-rag)
   - Ingest PDF/TXT/MD (pdf.js for PDF), chunk, embed (one /api/embed call)
   - Retrieve with BM25 (keyword) + dense cosine, fused via Reciprocal Rank Fusion
   - Grounded answer with [n] citations via /api/complete
═══════════════════════════════════════════════════════════════════ */
(function rag() {
  'use strict';

  var PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/';
  var MAX_CHUNKS = 24, CHUNK = 700, OVERLAP = 90, TOPK = 4, RRF_K = 60;

  var chunks = [];      // [{text, vec, tokens}]
  var bm25 = null;      // {df, idf, avgdl, N}
  var el = {}, ready = false, busyAsk = false, busyIngest = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setS(node, m, k) { node.textContent = m || ''; node.className = 'app-status' + (k ? ' app-status--' + k : ''); }
  function l2(v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i] * v[i]; s = Math.sqrt(s) || 1; var o = new Array(v.length); for (i = 0; i < v.length; i++) o[i] = v[i] / s; return o; }
  function dot(a, b) { var s = 0, n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) s += a[i] * b[i]; return s; }
  function tok(t) { return String(t || '').toLowerCase().match(/[a-z0-9]+/g) || []; }

  // ── file reading ────────────────────────────────────────────────────
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); }); }
  async function readPDF(file) {
    if (!window.pdfjsLib) { await loadScript(PDFJS_BASE + 'pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js'; }
    var buf = await file.arrayBuffer();
    var pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    var out = [];
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p);
      var c = await page.getTextContent();
      out.push(c.items.map(function (i) { return i.str; }).join(' '));
    }
    return out.join('\n');
  }
  function readText(file) { return file.text(); }

  function chunkText(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    var out = [], i = 0;
    while (i < text.length && out.length < MAX_CHUNKS) {
      out.push(text.slice(i, i + CHUNK));
      i += (CHUNK - OVERLAP);
    }
    return out;
  }

  // ── BM25 ────────────────────────────────────────────────────────────
  function buildBM25(docTokens) {
    var N = docTokens.length, df = {}, totalLen = 0;
    docTokens.forEach(function (toks) {
      totalLen += toks.length;
      var seen = {};
      toks.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    var idf = {};
    Object.keys(df).forEach(function (w) { idf[w] = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5)); });
    return { idf: idf, avgdl: totalLen / (N || 1), N: N };
  }
  function bm25Score(qTokens, docToks) {
    var k1 = 1.5, b = 0.75, dl = docToks.length, tf = {}, i, s = 0;
    for (i = 0; i < docToks.length; i++) tf[docToks[i]] = (tf[docToks[i]] || 0) + 1;
    for (i = 0; i < qTokens.length; i++) {
      var w = qTokens[i], f = tf[w] || 0; if (!f) continue;
      var idf = bm25.idf[w] || 0;
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / bm25.avgdl));
    }
    return s;
  }

  function rankIndices(scores) { // returns array of {i, rank} by score desc
    var idx = scores.map(function (s, i) { return { i: i, s: s }; });
    idx.sort(function (a, b) { return b.s - a.s; });
    var rank = {}; idx.forEach(function (o, r) { rank[o.i] = r; });
    return rank;
  }

  // ── embeddings / llm ────────────────────────────────────────────────
  async function embedMany(texts) {
    var r = await fetch('/api/embed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: texts }) });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.vectors) { var e = new Error(d.error || 'embed failed'); throw e; }
    return d.vectors.map(l2);
  }
  async function answer(q, ctx) {
    var sys = 'Answer the question using ONLY the numbered context passages. Cite sources inline like [1], [2]. ' +
      'If the answer is not in the context, say you could not find it in the document. Be concise.';
    var user = 'Context:\n' + ctx + '\n\nQuestion: ' + q;
    var r = await fetch('/api/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 320 }) });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.reply) { var e = new Error(d.error || 'LLM failed'); throw e; }
    return String(d.reply).replace(/\*\*/g, '').replace(/__/g, '');
  }

  // ── ingest ──────────────────────────────────────────────────────────
  async function ingest() {
    if (busyIngest) return;
    var f = el.file.files && el.file.files[0];
    if (!f) { setS(el.ingestStatus, 'Choose a .pdf, .txt or .md file first.', 'err'); return; }
    busyIngest = true; el.ingest.disabled = true; ready = false;
    setS(el.ingestStatus, 'Reading ' + f.name + '…', null);
    try {
      var raw = /\.pdf$/i.test(f.name) ? await readPDF(f) : await readText(f);
      var parts = chunkText(raw);
      if (!parts.length) { setS(el.ingestStatus, 'No extractable text found.', 'err'); return; }
      setS(el.ingestStatus, 'Embedding ' + parts.length + ' chunks…', null);
      var vecs = await embedMany(parts);
      chunks = parts.map(function (t, i) { return { text: t, vec: vecs[i], tokens: tok(t) }; });
      bm25 = buildBM25(chunks.map(function (c) { return c.tokens; }));
      ready = true;
      var trunc = (raw.replace(/\s+/g, ' ').length > MAX_CHUNKS * (CHUNK - OVERLAP)) ? ' (truncated to first ' + MAX_CHUNKS + ' chunks)' : '';
      setS(el.ingestStatus, '✓ Ingested ' + chunks.length + ' chunks from ' + f.name + trunc + '. Ask away.', 'ok');
    } catch (e) {
      setS(el.ingestStatus, '⚠ ' + (e.message || 'ingest failed'), 'err');
    } finally { busyIngest = false; el.ingest.disabled = false; }
  }

  // ── ask ─────────────────────────────────────────────────────────────
  async function ask() {
    if (busyAsk) return;
    if (!ready) { setS(el.status, 'Ingest a document first.', 'err'); return; }
    var q = el.q.value.trim(); if (!q) return;
    busyAsk = true; el.ask.disabled = true;
    setS(el.status, 'Retrieving (BM25 + dense)…', null);
    try {
      var qv = (await embedMany([q]))[0];
      var qt = tok(q);
      var dense = chunks.map(function (c) { return dot(qv, c.vec); });
      var sparse = chunks.map(function (c) { return bm25Score(qt, c.tokens); });
      var rD = rankIndices(dense), rB = rankIndices(sparse);
      var rrf = chunks.map(function (c, i) { return { i: i, s: 1 / (RRF_K + rD[i]) + 1 / (RRF_K + rB[i]) }; });
      rrf.sort(function (a, b) { return b.s - a.s; });
      var top = rrf.slice(0, TOPK);
      var ctx = top.map(function (o, n) { return '[' + (n + 1) + '] ' + chunks[o.i].text; }).join('\n\n');
      setS(el.status, 'Generating grounded answer…', null);
      var ans = await answer(q, ctx);
      var html = '<div class="rag-answer">' + esc(ans).replace(/\n/g, '<br>') + '</div>';
      html += '<div class="rag-srcs"><b>Sources (fused BM25+dense):</b>';
      top.forEach(function (o, n) {
        html += '<div class="rag-src"><span class="rag-srcn">[' + (n + 1) + ']</span> ' +
          esc(chunks[o.i].text.slice(0, 160)) + '… ' +
          '<span class="rag-rank">dense#' + (rD[o.i] + 1) + ' · bm25#' + (rB[o.i] + 1) + '</span></div>';
      });
      html += '</div>';
      el.answer.innerHTML = html;
      setS(el.status, '✓ Answered from ' + TOPK + ' retrieved chunks.', 'ok');
    } catch (e) {
      setS(el.status, '⚠ ' + (e.message || 'error'), 'err');
    } finally { busyAsk = false; el.ask.disabled = false; }
  }

  function bind() {
    el.pane = $('rag-pane'); if (!el.pane) return false;
    el.file = $('rag-file'); el.ingest = $('rag-ingest'); el.ingestStatus = $('rag-ingest-status');
    el.q = $('rag-q'); el.ask = $('rag-ask'); el.status = $('rag-status'); el.answer = $('rag-answer');
    el.ingest.addEventListener('click', ingest);
    el.ask.addEventListener('click', ask);
    el.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
    return true;
  }
  function init() { bind(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
