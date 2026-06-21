/* ══════════════════════════════════════════════════════════════════
   TEXT-TO-SQL WITH GUARDRAILS — native Win95 app (win-textsql)
   - NL -> SQL via /api/complete (instruction-following free models)
   - sqlglot-style guardrail in JS (read-only, single-statement, allowlist)
   - executes on a real SQLite DB in the browser via sql.js (WASM)
═══════════════════════════════════════════════════════════════════ */
(function textsql() {
  'use strict';

  var SQLJS_VER = '1.10.3';
  var SQLJS_BASE = 'https://cdn.jsdelivr.net/npm/sql.js@' + SQLJS_VER + '/dist/';
  var ALLOW = ['employees'];               // table allowlist
  var SQLGEN_MODELS = ['meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free'];

  var SCHEMA_SQL =
    'CREATE TABLE employees (' +
    'id INTEGER PRIMARY KEY, name TEXT, department TEXT, ' +
    'salary INTEGER, city TEXT, hire_date TEXT);';

  var SEED = [
    [1, 'Aisha Khan', 'Engineering', 142000, 'Seattle', '2021-03-15'],
    [2, 'Diego Ramos', 'Engineering', 118000, 'Austin', '2022-07-01'],
    [3, 'Mei Lin', 'Data', 134000, 'Seattle', '2020-11-20'],
    [4, 'Tom Becker', 'Sales', 96000, 'Chicago', '2019-05-09'],
    [5, 'Priya Nair', 'Data', 151000, 'New York', '2023-02-28'],
    [6, 'Sam Okoye', 'Marketing', 88000, 'Austin', '2021-09-12'],
    [7, 'Lena Vogel', 'Engineering', 127000, 'New York', '2022-01-18'],
    [8, 'Carlos Diaz', 'Sales', 103000, 'Chicago', '2018-08-30'],
    [9, 'Hana Sato', 'HR', 79000, 'Seattle', '2020-06-04'],
    [10, 'Omar Farah', 'Data', 145000, 'New York', '2024-04-22'],
    [11, 'Ravi Patel', 'Marketing', 92000, 'Austin', '2023-10-10'],
    [12, 'Grace Park', 'Engineering', 138000, 'Chicago', '2024-01-05']
  ];

  var SCHEMA_DOC = 'employees(id, name, department, salary, city, hire_date)';

  var el = {};
  var db = null, loading = false, ready = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function setStatus(msg, kind) {
    el.guard.textContent = msg || '';
    el.guard.className = 'app-status' + (kind ? ' app-status--' + kind : '');
  }

  // ── sql.js loader + DB seed ─────────────────────────────────────────
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function initDB() {
    if (ready || loading) { return; }
    loading = true;
    el.foot.textContent = 'Loading SQLite (sql.js)…';
    try {
      if (!window.initSqlJs) { await loadScript(SQLJS_BASE + 'sql-wasm.js'); }
      var SQL = await window.initSqlJs({ locateFile: function (f) { return SQLJS_BASE + f; } });
      db = new SQL.Database();
      db.run(SCHEMA_SQL);
      var stmt = db.prepare('INSERT INTO employees VALUES (?,?,?,?,?,?)');
      SEED.forEach(function (r) { stmt.run(r); });
      stmt.free();
      ready = true;
      el.foot.textContent = 'SQLite ready · ' + SEED.length + ' rows in employees · NL→SQL via OpenRouter';
      setStatus('Ready. Try a sample question or write SQL.', 'ok');
    } catch (e) {
      el.foot.textContent = 'Failed to load SQLite engine';
      setStatus('Could not load the in-browser database: ' + (e.message || e), 'err');
    } finally { loading = false; }
  }

  // ── Guardrail (sqlglot-style, implemented in JS) ────────────────────
  function guard(sqlRaw) {
    var s = String(sqlRaw || '').trim().replace(/;+\s*$/, '').trim();
    if (!s) return { ok: false, rule: 'empty', msg: 'No SQL to run.' };
    if (s.indexOf(';') >= 0) return { ok: false, rule: 'single_statement', msg: 'Blocked: only a single statement is allowed.' };
    if (!/^(select|with)\b/i.test(s)) return { ok: false, rule: 'not_readonly', msg: 'Blocked: only read-only SELECT / WITH queries are allowed.' };
    if (/\b(insert|update|delete|drop|alter|create|attach|detach|copy|pragma|vacuum|reindex|replace|truncate|grant|revoke|load_extension)\b/i.test(s)) {
      return { ok: false, rule: 'forbidden_function', msg: 'Blocked: write/DDL keywords are not allowed.' };
    }
    var tables = [], re = /\b(?:from|join)\s+["'`]?([a-z_][a-z0-9_]*)/ig, m;
    while ((m = re.exec(s))) { tables.push(m[1].toLowerCase()); }
    for (var i = 0; i < tables.length; i++) {
      if (ALLOW.indexOf(tables[i]) < 0) {
        return { ok: false, rule: 'unknown_table', msg: 'Blocked: table "' + tables[i] + '" is not in the allowlist (' + ALLOW.join(', ') + ').' };
      }
    }
    return { ok: true, sql: s };
  }

  // ── Run ─────────────────────────────────────────────────────────────
  function renderResults(result) {
    if (!result || !result.length) { el.results.innerHTML = '<p class="app-empty">Query ran — 0 rows.</p>'; return; }
    var r = result[0], cols = r.columns, rows = r.values;
    var html = '<div class="app-tablewrap"><table class="app-table"><thead><tr>';
    cols.forEach(function (c) { html += '<th>' + esc(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (row) {
      html += '<tr>';
      row.forEach(function (v) { html += '<td>' + esc(v == null ? '' : v) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table></div><p class="app-empty">' + rows.length + ' row(s).</p>';
    el.results.innerHTML = html;
  }

  function runSQL() {
    if (!ready) { setStatus('Database still loading…', null); return; }
    var g = guard(el.sql.value);
    if (!g.ok) { setStatus('⛔ ' + g.msg + '  [rule: ' + g.rule + ']', 'err'); el.results.innerHTML = ''; return; }
    try {
      var out = db.exec(g.sql);
      setStatus('✓ Passed guardrails · executed read-only.', 'ok');
      renderResults(out);
    } catch (e) {
      setStatus('SQL error: ' + (e.message || e), 'err');
      el.results.innerHTML = '';
    }
  }

  // ── NL -> SQL ───────────────────────────────────────────────────────
  function extractSQL(text) {
    var t = String(text || '');
    var fence = t.match(/```(?:sql)?\s*([\s\S]*?)```/i);
    if (fence) { t = fence[1]; }
    var m = t.match(/\b(select|with)\b[\s\S]*/i);
    if (m) { t = m[0]; }
    var semi = t.indexOf(';');
    if (semi >= 0) { t = t.slice(0, semi + 1); }
    return t.trim();
  }

  async function generate() {
    var q = el.nl.value.trim();
    if (!q) { el.nl.focus(); return; }
    el.gen.disabled = true;
    setStatus('Generating SQL…', null);
    var sys =
      'You translate questions into a SINGLE read-only SQLite SELECT query for this schema:\n' +
      SCHEMA_DOC + '\n' +
      'Rules: output ONLY the SQL, no prose, no markdown fences, no explanation. ' +
      'Read-only SELECT/WITH only. Use only the employees table.';
    try {
      var resp = await fetch('/api/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: sys }, { role: 'user', content: q }],
          models: SQLGEN_MODELS, max_tokens: 220, temperature: 0
        })
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok || !data.reply) { setStatus('⚠ ' + (data.error || 'Could not generate SQL.'), 'err'); return; }
      el.sql.value = extractSQL(data.reply);
      setStatus('SQL generated — review it, then Run.', 'ok');
    } catch (e) {
      setStatus('Network error generating SQL. Try again.', 'err');
    } finally { el.gen.disabled = false; }
  }

  // ── Wire up ─────────────────────────────────────────────────────────
  function bind() {
    el.pane = $('tsql-pane'); el.nl = $('tsql-nl'); el.gen = $('tsql-gen');
    el.sql = $('tsql-sql'); el.run = $('tsql-run'); el.guard = $('tsql-guard');
    el.results = $('tsql-results'); el.foot = $('tsql-foot'); el.chips = $('tsql-chips');
    if (!el.pane) return false;
    el.gen.addEventListener('click', generate);
    el.run.addEventListener('click', runSQL);
    el.nl.addEventListener('keydown', function (e) { if (e.key === 'Enter') generate(); });
    if (el.chips) {
      el.chips.querySelectorAll('.ai-chip').forEach(function (b) {
        b.addEventListener('click', function () { el.nl.value = b.textContent.trim(); generate(); });
      });
    }
    return true;
  }

  function init() {
    if (!bind()) return;
    if (window.WM && typeof window.WM.open === 'function') {
      var orig = window.WM.open.bind(window.WM);
      window.WM.open = function (id) { orig(id); if (id === 'win-textsql') { initDB(); } };
    }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
