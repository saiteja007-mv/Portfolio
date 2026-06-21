/*
 * Generic OpenRouter helpers for the native Win95 apps (Text-to-SQL,
 * Semantic Cache, Hybrid RAG). Key stays server-side (OPENROUTER_API_KEY).
 *
 * complete() — chat completion with a model fallback chain.
 * embed()    — text embeddings (nvidia/llama-nemotron-embed-vl-1b-v2:free).
 *
 * These power per-app endpoints (api/complete.js, api/embed.js). The portfolio
 * assistant keeps its own lib/llm.js (with the Sai-Teja system prompt).
 */

'use strict';

var CHAT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
var EMBED_ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';

// OpenRouter caps the fallback array at 3. Note: the 50/day free limit is
// account-wide across ALL :free models, so these fallbacks help with
// per-minute limits / a model being down — not the daily cap.
var CHAT_MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'cohere/north-mini-code:free',
  'meta-llama/llama-3.3-70b-instruct:free'
];
var EMBED_MODEL = 'nvidia/llama-nemotron-embed-vl-1b-v2:free';

function key() {
  var k = process.env.OPENROUTER_API_KEY;
  if (!k) { var e = new Error('OPENROUTER_API_KEY is not set on the server.'); e.code = 'NO_KEY'; throw e; }
  return k;
}

function headers() {
  return {
    'Authorization': 'Bearer ' + key(),
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://saitejamothukuri.com',
    'X-Title': 'Sai Teja Portfolio - Win95 Apps'
  };
}

async function fail(resp) {
  var detail = await resp.text();
  var e = new Error('OpenRouter ' + resp.status + ': ' + detail.slice(0, 300));
  e.status = resp.status;
  return e;
}

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{temperature?:number,max_tokens?:number,models?:string[]}} [opts]
 * @returns {Promise<{reply:string, model:string}>}
 */
async function complete(messages, opts) {
  opts = opts || {};
  var body = {
    models: opts.models || CHAT_MODELS,
    messages: messages,
    temperature: opts.temperature != null ? opts.temperature : 0.2,
    max_tokens: opts.max_tokens || 700
  };
  var resp = await fetch(CHAT_ENDPOINT, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!resp.ok) throw await fail(resp);
  var data = await resp.json();
  var choice = data && data.choices && data.choices[0];
  var text = choice && choice.message && choice.message.content && String(choice.message.content).trim();
  if (!text) throw new Error('Empty completion.');
  return { reply: text, model: (data && data.model) || CHAT_MODELS[0] };
}

/**
 * @param {string[]} inputs
 * @returns {Promise<{vectors:number[][], model:string}>}
 */
async function embed(inputs) {
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('No input to embed.');
  var body = { model: EMBED_MODEL, input: inputs };
  var resp = await fetch(EMBED_ENDPOINT, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!resp.ok) throw await fail(resp);
  var data = await resp.json();
  var rows = (data && data.data) || [];
  var vectors = rows.map(function (r) { return r.embedding; });
  if (!vectors.length || !vectors[0]) throw new Error('No embeddings returned.');
  return { vectors: vectors, model: (data && data.model) || EMBED_MODEL };
}

module.exports = { complete: complete, embed: embed, CHAT_MODELS: CHAT_MODELS, EMBED_MODEL: EMBED_MODEL };
