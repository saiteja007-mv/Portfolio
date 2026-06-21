/*
 * Shared LLM chat logic — used by both the Vercel serverless function
 * (api/chat.js) and the local dev server (dev-server.js).
 *
 * Provider: OpenRouter (OpenAI-compatible). Free models only → zero cost.
 * A fallback chain keeps the assistant up if one model is rate-limited.
 * The API key lives ONLY here on the server (process.env.OPENROUTER_API_KEY),
 * never in client-side code.
 */

'use strict';

var ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Fallback chain (OpenRouter tries these in order). All free tier.
// OpenRouter allows at most 3 models in the fallback array. (The 50/day free
// cap is account-wide across all :free models — fallbacks help with per-minute
// limits / outages, not the daily cap.)
var MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',                 // 30B/3B-active — fast
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',  // fallback
  'meta-llama/llama-3.3-70b-instruct:free'               // reliable fallback
];
var PRIMARY_LABEL = 'OpenRouter · Nemotron-3 Nano 30B (free)';

// ── Knowledge base (context-stuffing RAG; corpus is small) ────────────────
var PROFILE = [
  'NAME: Venkata Sai Teja Mothukuri (goes by "Sai Teja").',
  'ROLE: AI/ML Engineer with 3+ years building and shipping machine-learning, deep-learning, and Generative AI systems end to end.',
  '',
  'CURRENT JOB: AI/ML Engineer at Honeywell (Aug 2025 – Present).',
  '- Builds multi-modal deep-learning models (PyTorch, Hugging Face) fusing voice/image/barcode, served at sub-200 ms on edge.',
  '- On-device inference optimization (ARM, NVIDIA Jetson) cut model memory footprint by 35%.',
  '- RAG + transformer NLP pipelines raised operational guidance accuracy by 22% with sub-second retrieval.',
  '- Runs MLOps on AWS + Kubernetes: continuous training/eval/deploy, automated drift detection, model versioning.',
  '',
  'PREVIOUS JOB: Machine Learning Scientist at Accenture, India (Sep 2021 – Dec 2023).',
  '- Built a large-scale ad recommendation engine (PySpark, Spark Streaming) with sub-3-second targeting.',
  '- XGBoost/LightGBM/LSTM ad-performance models on 25+ features lifted CTR by 15% and ad revenue by 20%.',
  '- Ran large-scale A/B experiments with causal inference; built Kafka + Spark Streaming real-time feature pipelines; served models via FastAPI/Docker.',
  '',
  'EDUCATION:',
  '- M.S. in Computer Science, University of Central Missouri (2025).',
  '- B.Tech in Information Technology, SRKR Engineering College.',
  '',
  'SKILLS:',
  '- ML / Deep Learning: PyTorch, TensorFlow/Keras, scikit-learn, XGBoost, LightGBM, CNNs, Bi-LSTM, Transformers, Transfer Learning, Recommendation Systems.',
  '- Generative AI / LLM: RAG, Hugging Face Transformers, Embeddings, Vector Databases, Semantic Search, LangChain, Prompt Engineering.',
  '- NLP / CV / Speech: NLP, Computer Vision, OpenCV, NLTK, Speech-to-Text.',
  '- Data & Distributed: PySpark, Apache Spark, Apache Kafka, ETL, Snowflake, Feature Engineering, A/B Testing, Causal Inference.',
  '- Cloud & MLOps: AWS (S3, EC2, Lambda, SageMaker), Docker, Kubernetes, MLflow, CI/CD (GitHub Actions), FastAPI, Model Monitoring, Drift Detection.',
  '- Languages: Python, SQL.',
  '',
'FEATURED PROJECTS (built during his Data-Analyst -> AI/ML Engineer pivot; projects 1-3 are public with live demos):',
  '1. Hybrid Search RAG (Python, Streamlit, OpenRouter, Nemotron embeddings): a cloud chat-with-your-documents app. Upload PDF/MD/TXT and get answers grounded in them with inline citations. Hybrid retrieval fuses BM25 keyword search with dense embeddings via Reciprocal Rank Fusion; fully API-backed, no local GPU. Live demo: https://saitejamothukuri-hybrid-search-rag.hf.space | Code: https://github.com/saiteja007-mv/hybrid-search-rag',
  '2. Text-to-SQL with Guardrails (Python, DuckDB, sqlglot, OpenRouter): turns natural language into SQL, but a sqlglot AST guardrail validates every query (read-only, single-statement, table-allowlist, no file-access functions) before any row is read, then runs it on DuckDB. Has a self-correction retry and an execution-accuracy eval (order-insensitive result-set match). Live demo: https://saitejamothukuri-text-to-sql-guardrails.hf.space | Code: https://github.com/saiteja007-mv/text-to-sql-guardrails',
  '3. Semantic Cache for LLMs (Python, embeddings, NumPy): a drop-in cache that keys on prompt embeddings instead of exact text, so paraphrased repeat questions hit the cache (cosine similarity >= 0.85) and skip the LLM call to cut latency and token cost. Two-stage lookup (O(1) exact-hash + vectorized cosine), LRU eviction, optional TTL. Live demo: https://saitejamothukuri-semantic-cache.hf.space | Code: https://github.com/saiteja007-mv/semantic-cache',
  '4. Multi-Modal Cyberbullying Detection (PyTorch, Transformers, Bi-LSTM, VGG16, OpenCV): classifies cyberbullying across text + image + audio into 6 harm categories in one pipeline. Bi-LSTM text path 83.4% accuracy (0.83 F1), VGG16 image path 96.1% accuracy (0.96 F1), plus a speech-to-text audio path. Published in the JETIR journal (https://www.jetir.org/view?paper=JETIR2304580).',
  '5. Traffic-Flow Prediction (PyTorch, FastAPI, MLflow, Docker): a seq2seq encoder-decoder LSTM forecasting traffic speed on the METR-LA dataset (207 LA loop detectors), served as a Dockerized FastAPI endpoint with Prometheus metrics. Test MAE 3.80 / 4.51 / 5.62 mph at the 15/30/60-minute horizons, beating classical baselines by 5-16% and within ~0.4 mph of the published FC-LSTM benchmark. Code: https://github.com/saiteja007-mv/traffic-flow-prediction',
  '',
  'CONTACT & LINKS:',
  '- Email: contact@saitejamothukuri.com',
  '- LinkedIn: linkedin.com/in/venkatasaitejam',
  '- GitHub: github.com/saiteja007-mv',
  '- YouTube (TechRex): youtube.com/@The_TechRex',
  '- He is open to new AI/ML opportunities.'
].join('\n');

var SYSTEM_PROMPT =
  'You are Sai Teja Mothukuri\'s friendly AI assistant, embedded in his portfolio website ' +
  '(a Windows 95 themed desktop). Visitors — often recruiters — ask about his background. ' +
  'Answer ONLY from the PROFILE below. Refer to him as "Sai Teja" or "he". ' +
  'Be warm, concise, and specific — usually 2-4 sentences. Reply in plain conversational text only: ' +
  'no markdown, no **bold** or asterisks, no bullet lists or headings. ' +
  'If a question is not covered by the profile, say you don\'t have that detail and suggest emailing ' +
  'contact@saitejamothukuri.com. Never invent facts, employers, dates, or numbers. ' +
  'If asked something off-topic (not about Sai Teja), politely steer back to his work.\n\n' +
  'PROFILE:\n' + PROFILE;

var SUGGESTIONS = [
  'What does Sai Teja do?',
  'Tell me about his ML projects',
  'What\'s his experience with LLMs and RAG?',
  'What\'s his tech stack?',
  'How do I contact him?'
];

/**
 * Generate a reply from chat history.
 * @param {Array<{role:string, content:string}>} messages
 * @returns {Promise<string>} assistant reply text
 */
async function chatReply(messages) {
  var key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    var err = new Error('OPENROUTER_API_KEY is not set on the server.');
    err.code = 'NO_KEY';
    throw err;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No messages provided.');
  }

  // System prompt + last 12 turns, each capped.
  var convo = messages.slice(-12).map(function (m) {
    return {
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000)
    };
  });
  var payloadMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(convo);

  var body = {
    models: MODELS,            // OpenRouter falls back through the list
    messages: payloadMessages,
    temperature: 0.5,
    max_tokens: 512,
    top_p: 0.9
  };

  var resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://saitejamothukuri.com',
      'X-Title': 'Sai Teja Portfolio - Ask AI'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    var detail = await resp.text();
    var e = new Error('OpenRouter error ' + resp.status + ': ' + detail.slice(0, 300));
    e.status = resp.status;
    throw e;
  }

  var data = await resp.json();
  var choice = data && data.choices && data.choices[0];
  var text = choice && choice.message && choice.message.content &&
    String(choice.message.content).trim();

  if (!text) {
    throw new Error('No reply generated (empty completion).');
  }
  // Strip stray markdown emphasis the model may still emit (bubbles are plain text).
  text = text.replace(/\*\*/g, '').replace(/__/g, '').replace(/^\s*[*-]\s+/gm, '');
  return { reply: text.trim(), model: (data && data.model) || MODELS[0] };
}

module.exports = { chatReply: chatReply, SUGGESTIONS: SUGGESTIONS, MODEL: PRIMARY_LABEL };
