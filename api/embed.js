/*
 * Vercel serverless function — POST /api/embed
 * Text-embedding proxy for the native Win95 apps (Semantic Cache, Hybrid RAG).
 * Key stays server-side. Body: { inputs: string[] } -> { vectors, model }.
 */

'use strict';

var or = require('../lib/openrouter');

var MAX_INPUTS = 64;       // cap chunks per request (quota + payload guard)
var MAX_CHARS = 4000;      // cap each input length

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    var body = req.body;
    if (typeof body === 'string') { body = JSON.parse(body || '{}'); }
    var inputs = (body && body.inputs) || [];
    if (!Array.isArray(inputs) || !inputs.length) { res.status(400).json({ error: 'inputs required' }); return; }
    if (inputs.length > MAX_INPUTS) { res.status(413).json({ error: 'Too many inputs (max ' + MAX_INPUTS + ' per request).' }); return; }
    inputs = inputs.map(function (s) { return String(s || '').slice(0, MAX_CHARS); });

    var out = await or.embed(inputs);
    res.status(200).json({ vectors: out.vectors, model: out.model });
  } catch (err) {
    var status, msg;
    if (err.code === 'NO_KEY') { status = 503; msg = 'The app backend is not configured yet.'; }
    else if (err.status === 429) { status = 429; msg = 'Free daily usage limit reached. Try again later.'; }
    else { status = err.status || 500; msg = 'Embedding service error. Please try again.'; }
    console.error('[api/embed]', err && err.message);
    res.status(status).json({ error: msg });
  }
};
