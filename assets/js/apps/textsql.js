/* ══════════════════════════════════════════════════════════════════
   TEXT-TO-SQL WITH GUARDRAILS — native Win95 app (win-textsql)
   Data sources: Sample DB · Upload CSV · Upload .sql  (all in-browser via sql.js)
   - NL -> SQL via /api/complete (instruction-following free models)
   - sqlglot-style guardrail in JS (read-only, single-statement, allowlist)
   - executes on a real SQLite DB in the browser; schema + allowlist are dynamic
═══════════════════════════════════════════════════════════════════ */
(function textsql() {
  'use strict';

  var SQLJS_VER = '1.10.3';
  var SQLJS_BASE = 'https://cdn.jsdelivr.net/npm/sql.js@' + SQLJS_VER + '/dist/';
  // Instruction-following models only — SQL gen needs clean, finished output.
  // (north-mini-code is a reasoning model: returns content=null, unusable here.)
  var SQLGEN_MODELS = ['meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free'];
  var MAX_ROWS = 5000;

  var SAMPLE_SQL =
    'CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, ' +
    'salary INTEGER, city TEXT, hire_date TEXT);';
  var SAMPLE_SEED = [
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

  var SQL = null, db = null, ready = false, started = false;
  var allow = [], schemaDoc = '', isSample = false;
  var el = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setStatus(m, k) { el.guard.textContent = m || ''; el.guard.className = 'app-status' + (k ? ' app-status--' + k : ''); }

  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); }); }
  async function ensureSQL() {
    if (SQL) return SQL;
    el.foot.textContent = 'Loading SQLite (sql.js)…';
    if (!window.initSqlJs) { await loadScript(SQLJS_BASE + 'sql-wasm.js'); }
    SQL = await window.initSqlJs({ locateFile: function (f) { return SQLJS_BASE + f; } });
    return SQL;
  }

  // Rebuild allowlist + schema doc from whatever tables exist now.
  function introspect(srcLabel) {
    var tbls = [];
    var res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    if (res.length) { res[0].values.forEach(function (r) { tbls.push(r[0]); }); }
    allow = tbls.map(function (t) { return t.toLowerCase(); });
    schemaDoc = tbls.map(function (t) {
      var info = db.exec('PRAGMA table_info(' + t + ')');
      var cols = info.length ? info[0].values.map(function (c) { return c[1]; }) : [];
      return t + '(' + cols.join(', ') + ')';
    }).join('; ');
    ready = true;
    el.schema.textContent = 'Schema: ' + (schemaDoc || '(none)');
    el.foot.textContent = srcLabel + ' · SQLite in your browser · NL→SQL via OpenRouter';
    if (el.chips) el.chips.style.display = isSample ? '' : 'none';
  }

  async function loadSample() {
    try {
      await ensureSQL();
      db = new SQL.Database();
      db.run(SAMPLE_SQL);
      var stmt = db.prepare('INSERT INTO employees VALUES (?,?,?,?,?,?)');
      SAMPLE_SEED.forEach(function (r) { stmt.run(r); }); stmt.free();
      isSample = true; introspect('Sample DB · ' + SAMPLE_SEED.length + ' rows');
      setStatus('Sample database loaded. Try a question or write SQL.', 'ok');
      el.results.innerHTML = '';
    } catch (e) { el.foot.textContent = 'Failed to load SQLite engine'; setStatus('Could not load DB: ' + (e.message || e), 'err'); }
  }

  // ── CSV ────────────────────────────────────────────────────────────
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || (r[0] || '').trim() !== ''; });
  }
  function safeName(s, fallback) { var n = String(s || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); return n || fallback; }
  function inferType(vals) {
    var allNum = true, allInt = true, any = false;
    for (var i = 0; i < vals.length; i++) {
      var v = (vals[i] || '').trim(); if (v === '') continue; any = true;
      if (!/^-?\d+(\.\d+)?$/.test(v)) { allNum = false; allInt = false; break; }
      if (v.indexOf('.') >= 0) allInt = false;
    }
    return !any ? 'TEXT' : allInt ? 'INTEGER' : allNum ? 'REAL' : 'TEXT';
  }

  async function loadCSV(file) {
    try {
      setStatus('Reading ' + file.name + '…', null);
      await ensureSQL();
      var rows = parseCSV(await file.text());
      if (rows.length < 2) { setStatus('CSV needs a header row + at least one data row.', 'err'); return; }
      var headers = rows[0], body = rows.slice(1, 1 + MAX_ROWS);
      var cols = headers.map(function (h, i) { return safeName(h, 'col' + (i + 1)); });
      // dedupe column names
      var seen = {}; cols = cols.map(function (c) { if (seen[c]) { seen[c]++; return c + '_' + seen[c]; } seen[c] = 1; return c; });
      var types = cols.map(function (_, ci) { return inferType(body.map(function (r) { return r[ci]; })); });
      var table = safeName(file.name.replace(/\.[^.]+$/, ''), 'data');
      db = new SQL.Database();
      db.run('CREATE TABLE ' + table + ' (' + cols.map(function (c, i) { return c + ' ' + types[i]; }).join(', ') + ');');
      var ph = cols.map(function () { return '?'; }).join(',');
      var stmt = db.prepare('INSERT INTO ' + table + ' VALUES (' + ph + ')');
      body.forEach(function (r) {
        var vals = cols.map(function (_, ci) { var v = r[ci]; return v == null ? null : v; });
        stmt.run(vals);
      }); stmt.free();
      isSample = false; introspect('CSV: ' + table + ' · ' + body.length + ' rows');
      setStatus('Loaded "' + table + '" (' + body.length + ' rows, ' + cols.length + ' cols). Ask away.', 'ok');
      el.results.innerHTML = '';
    } catch (e) { setStatus('CSV load failed: ' + (e.message || e), 'err'); }
  }

  async function loadSQLFile(file) {
    try {
      setStatus('Running ' + file.name + '…', null);
      await ensureSQL();
      var text = await file.text();
      db = new SQL.Database();
      db.run(text);                       // user's own CREATE/INSERT in a sandboxed in-browser DB
      isSample = false; introspect('SQL file: ' + file.name);
      if (!allow.length) { setStatus('No tables found after running the file.', 'err'); return; }
      setStatus('Loaded tables: ' + allow.join(', ') + '. Ask away.', 'ok');
      el.results.innerHTML = '';
    } catch (e) { setStatus('SQL file failed: ' + (e.message || e), 'err'); }
  }

  // ── Guardrail (sqlglot-style, in JS) ────────────────────────────────
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
      if (allow.indexOf(tables[i]) < 0) return { ok: false, rule: 'unknown_table', msg: 'Blocked: table "' + tables[i] + '" is not in the allowlist (' + allow.join(', ') + ').' };
    }
    return { ok: true, sql: s };
  }

  function renderResults(result) {
    if (!result || !result.length) { el.results.innerHTML = '<p class="app-empty">Query ran — 0 rows.</p>'; return; }
    var r = result[0], html = '<div class="app-tablewrap"><table class="app-table"><thead><tr>';
    r.columns.forEach(function (c) { html += '<th>' + esc(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    r.values.forEach(function (row) { html += '<tr>'; row.forEach(function (v) { html += '<td>' + esc(v == null ? '' : v) + '</td>'; }); html += '</tr>'; });
    html += '</tbody></table></div><p class="app-empty">' + r.values.length + ' row(s).</p>';
    el.results.innerHTML = html;
  }
  function runSQL() {
    if (!ready) { setStatus('Database still loading…', null); return; }
    var g = guard(el.sql.value);
    if (!g.ok) { setStatus('⛔ ' + g.msg + '  [rule: ' + g.rule + ']', 'err'); el.results.innerHTML = ''; return; }
    try { var out = db.exec(g.sql); setStatus('✓ Passed guardrails · executed read-only.', 'ok'); renderResults(out); }
    catch (e) { setStatus('SQL error: ' + (e.message || e), 'err'); el.results.innerHTML = ''; }
  }

  // ── NL -> SQL ───────────────────────────────────────────────────────
  function extractSQL(text) {
    var t = String(text || '');
    var fence = t.match(/```(?:sql)?\s*([\s\S]*?)```/i); if (fence) t = fence[1];
    var m = t.match(/\b(select|with)\b[\s\S]*/i); if (m) t = m[0];
    var semi = t.indexOf(';'); if (semi >= 0) t = t.slice(0, semi + 1);
    return t.trim();
  }
  async function generate() {
    var q = el.nl.value.trim(); if (!q) { el.nl.focus(); return; }
    if (!ready) { setStatus('Load a data source first.', null); return; }
    el.gen.disabled = true; setStatus('Generating SQL…', null);
    var sys = 'You translate questions into a SINGLE read-only SQLite SELECT query for this schema:\n' +
      schemaDoc + '\nRules: output ONLY the SQL, no prose, no markdown fences. Read-only SELECT/WITH only. Use only the listed tables.';
    try {
      var resp = await fetch('/api/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: q }], models: SQLGEN_MODELS, max_tokens: 220, temperature: 0 })
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok || !data.reply) { setStatus('⚠ ' + (data.error || 'Could not generate SQL.'), 'err'); return; }
      el.sql.value = extractSQL(data.reply); setStatus('SQL generated — review it, then Run.', 'ok');
    } catch (e) { setStatus('Network error generating SQL. Try again.', 'err'); }
    finally { el.gen.disabled = false; }
  }

  function bind() {
    el.pane = $('tsql-pane'); if (!el.pane) return false;
    el.nl = $('tsql-nl'); el.gen = $('tsql-gen'); el.sql = $('tsql-sql'); el.run = $('tsql-run');
    el.guard = $('tsql-guard'); el.results = $('tsql-results'); el.foot = $('tsql-foot');
    el.chips = $('tsql-chips'); el.schema = $('tsql-schema');
    el.csv = $('tsql-csv'); el.sqlfile = $('tsql-sqlfile');
    el.gen.addEventListener('click', generate);
    el.run.addEventListener('click', runSQL);
    el.nl.addEventListener('keydown', function (e) { if (e.key === 'Enter') generate(); });
    if (el.chips) el.chips.querySelectorAll('.ai-chip').forEach(function (b) { b.addEventListener('click', function () { el.nl.value = b.textContent.trim(); generate(); }); });
    $('tsql-src-sample').addEventListener('click', loadSample);
    $('tsql-src-csv').addEventListener('click', function () { el.csv.click(); });
    $('tsql-src-sql').addEventListener('click', function () { el.sqlfile.click(); });
    el.csv.addEventListener('change', function () { if (el.csv.files[0]) loadCSV(el.csv.files[0]); });
    el.sqlfile.addEventListener('change', function () { if (el.sqlfile.files[0]) loadSQLFile(el.sqlfile.files[0]); });
    return true;
  }
  function init() {
    if (!bind()) return;
    if (window.WM && typeof window.WM.open === 'function') {
      var orig = window.WM.open.bind(window.WM);
      window.WM.open = function (id) { orig(id); if (id === 'win-textsql' && !started) { started = true; loadSample(); } };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
