/*
 * Vercel serverless function — POST /api/complete
 * Generic LLM completion proxy for the native Win95 apps (NL->SQL, RAG answer).
 * Key stays server-side. Frontend modules: assets/js/apps/*.js
 */

'use strict';

var or = require('../lib/openrouter');

function errorPayload(err) {
  if (err.code === 'NO_KEY') return { status: 503, msg: 'The app backend is not configured yet.' };
  if (err.status === 429) return { status: 429, msg: 'Free daily usage limit reached. Try again later.' };
  return { status: err.status || 500, msg: 'The app backend hit an error. Please try again.' };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    var body = req.body;
    if (typeof body === 'string') { body = JSON.parse(body || '{}'); }
    var messages = (body && body.messages) || [];
    if (!Array.isArray(messages) || !messages.length) { res.status(400).json({ error: 'messages required' }); return; }
    // Guards: cap turns + per-message length + output size.
    messages = messages.slice(-8).map(function (m) {
      return { role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
               content: String(m.content || '').slice(0, 8000) };
    });
    var max_tokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 700, 1), 1024);
    // Optional model preference (only :free OpenRouter ids, max 3).
    var models;
    if (Array.isArray(body.models)) {
      models = body.models.filter(function (m) { return typeof m === 'string' && /:free$/.test(m); }).slice(0, 3);
      if (!models.length) models = undefined;
    }
    var out = await or.complete(messages, { temperature: body.temperature, max_tokens: max_tokens, models: models });
    res.status(200).json({ reply: out.reply, model: out.model });
  } catch (err) {
    var p = errorPayload(err);
    console.error('[api/complete]', err && err.message);
    res.status(p.status).json({ error: p.msg });
  }
};
