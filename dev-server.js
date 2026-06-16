/*
 * Local preview server — mirrors the Vercel setup so you can test the AI
 * assistant without `vercel dev`.
 *
 *   1. Get a free key: https://aistudio.google.com/apikey
 *   2. PowerShell:  $env:GEMINI_API_KEY = "your-key";  node dev-server.js
 *   3. Open http://localhost:8099
 *
 * Serves static files AND handles POST /api/chat using lib/gemini.js
 * (the exact same logic the production function uses).
 */

'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

// Minimal .env loader (no dependency) — local preview only.
(function loadEnv() {
  try {
    var raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    raw.split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    });
  } catch (e) { /* no .env — rely on real env vars */ }
})();

var llm = require('./lib/llm');

var ROOT = __dirname;
var PORT = process.env.PORT || 8099;

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

function sendJson(res, code, obj) {
  var s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
}

async function handleChat(req, res) {
  var chunks = [];
  req.on('data', function (c) { chunks.push(c); });
  req.on('end', async function () {
    try {
      var body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      var out = await llm.chatReply(body.messages || []);
      sendJson(res, 200, { reply: out.reply, model: out.model });
    } catch (err) {
      console.error('[dev /api/chat]', err && err.message);
      var code = err.code === 'NO_KEY' ? 503 : (err.status || 500);
      var msg = err.code === 'NO_KEY'
        ? 'OPENROUTER_API_KEY not set. Put it in .env, then: node dev-server.js'
        : 'AI assistant error: ' + (err.message || 'unknown');
      sendJson(res, code, { error: msg });
    }
  });
}

function serveStatic(req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') { urlPath = '/index.html'; }
  var filePath = path.join(ROOT, urlPath);

  // Prevent path traversal outside ROOT.
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer(function (req, res) {
  if (req.url.split('?')[0] === '/api/chat') {
    if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return; }
    handleChat(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(PORT, '127.0.0.1', function () {
  var hasKey = !!process.env.OPENROUTER_API_KEY;
  console.log('Portfolio dev server: http://localhost:' + PORT);
  console.log('LLM: ' + llm.MODEL + ' | API key set: ' + hasKey);
  if (!hasKey) {
    console.log('  ! No OPENROUTER_API_KEY — chat will return a config error until you set it.');
  }
});
