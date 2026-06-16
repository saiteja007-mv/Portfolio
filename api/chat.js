/*
 * Vercel serverless function — POST /api/chat
 * Proxies chat requests to Gemini 2.0 Flash (free tier), keeping the API key
 * server-side. Frontend: assets/js/ai-chat.js.
 */

'use strict';

var llm = require('../lib/llm');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Vercel parses JSON bodies automatically; fall back to manual parse.
    var body = req.body;
    if (typeof body === 'string') { body = JSON.parse(body || '{}'); }
    var messages = (body && body.messages) || [];

    var out = await llm.chatReply(messages);
    res.status(200).json({ reply: out.reply, model: out.model });
  } catch (err) {
    var status = err.code === 'NO_KEY' ? 503 : (err.status || 500);
    var msg = err.code === 'NO_KEY'
      ? 'The AI assistant is not configured yet.'
      : 'Sorry — the AI assistant hit an error. Please try again.';
    // Log full detail server-side only.
    console.error('[api/chat]', err && err.message);
    res.status(status).json({ error: msg });
  }
};
