/* ════════════════════════════════════════════════════════════════════
   content.js — ALL portfolio content, ported VERBATIM from the original
   index.html. Single global: window.PORTFOLIO.
   Static apps are rendered from this by render.js. Do NOT alter wording.
═══════════════════════════════════════════════════════════════════════ */
window.PORTFOLIO = {

  identity: {
    name: "Sai Teja Mothukuri",
    tagline: "AI/ML Engineer · Deep Learning · Generative AI · MLOps",
    photo: "assets/images/Profile photo no bg.png",
    statusLine: "AI/ML Engineer · 3+ years",
    availability: "Available for opportunities",
    // 3-paragraph bio EXACT (HTML preserved as in original)
    bio: [
      "<strong>AI/ML Engineer with 3+ years</strong> building and deploying machine-learning, deep-learning, and Generative AI systems end to end — from experimentation through real-time production inference.",
      "I train multi-modal deep-learning models (<strong>PyTorch, Hugging Face</strong>) and ship them to real-time edge and cloud inference, build <strong>RAG and transformer-based NLP</strong> pipelines for production, and run the <strong>MLOps</strong> behind them — CI/CD, drift detection, and model versioning on <strong>AWS and Kubernetes</strong>.",
      "<strong>M.S. in Computer Science</strong> from University of Central Missouri (2025). Currently an <strong>AI/ML Engineer at Honeywell</strong>. I also document the journey on YouTube at <a href=\"https://youtube.com/@The_TechRex\" target=\"_blank\" rel=\"noopener noreferrer\"><i class=\"fab fa-youtube\"></i> TechRex</a>."
    ]
  },

  links: {
    email: "contact@saitejamothukuri.com",
    phone: "913-263-4856",
    linkedin: "https://www.linkedin.com/in/venkatasaitejam",
    github: "https://github.com/saiteja007-mv",
    techrex: "https://youtube.com/@The_TechRex",
    techrexSite: "https://techrex.saitejamothukuri.com"
  },

  // ── PROJECTS (5, verbatim) ───────────────────────────────────────────
  projects: [
    {
      title: "Hybrid Search RAG",
      badge: "Featured · RAG / LLM",
      desc: "Chat-with-your-docs: upload PDF/MD/TXT and get answers grounded in them with <strong>inline citations</strong>. Hybrid retrieval fuses <strong>BM25 + dense embeddings via Reciprocal Rank Fusion</strong>; fully API-backed, no GPU. Deployed live.",
      tech: ["Python", "RAG", "BM25", "Embeddings (RRF)", "OpenRouter", "Streamlit", "Docker"],
      links: [
        { label: "Live Demo", icon: "fas fa-external-link-alt", href: "https://saitejamothukuri-hybrid-search-rag.hf.space" },
        { label: "GitHub", icon: "fab fa-github", href: "https://github.com/saiteja007-mv/hybrid-search-rag" }
      ]
    },
    {
      title: "Text-to-SQL with Guardrails",
      badge: "Featured · LLM Safety",
      desc: "Natural-language → SQL where the LLM writes the query but a <strong>sqlglot AST guardrail</strong> validates it (read-only, single-statement, table-allowlist, no file functions) <strong>before any row is read</strong>, then runs on DuckDB. Self-correction retry + execution-accuracy eval.",
      tech: ["Python", "DuckDB", "sqlglot", "LLM Guardrails", "OpenRouter", "Streamlit"],
      links: [
        { label: "Live Demo", icon: "fas fa-external-link-alt", href: "https://saitejamothukuri-text-to-sql-guardrails.hf.space" },
        { label: "GitHub", icon: "fab fa-github", href: "https://github.com/saiteja007-mv/text-to-sql-guardrails" }
      ]
    },
    {
      title: "Semantic Cache for LLMs",
      badge: "Featured · LLM Infra",
      desc: "Drop-in cache that keys on <strong>prompt embeddings</strong>, not exact text — paraphrased repeat questions hit the cache (<strong>cosine ≥ 0.85</strong>) and skip the LLM call to cut latency and token cost. O(1) hash + vectorized cosine, LRU + TTL, 13 offline tests.",
      tech: ["Python", "Embeddings", "Semantic Cache", "OpenRouter", "NumPy", "pytest"],
      links: [
        { label: "Live Demo", icon: "fas fa-external-link-alt", href: "https://saitejamothukuri-semantic-cache.hf.space" },
        { label: "GitHub", icon: "fab fa-github", href: "https://github.com/saiteja007-mv/semantic-cache" }
      ]
    },
    {
      title: "Multi-Modal Cyberbullying Detection",
      badge: "Featured · Deep Learning",
      desc: "Classifies cyberbullying across <strong>text + image + audio</strong> into 6 harm categories through a unified inference pipeline. <strong>Bi-LSTM text path 83.4%</strong> acc (0.83 F1) · <strong>VGG16 image path 96.1%</strong> acc (0.96 F1) · speech-to-text audio path. Published research in JETIR journal.",
      tech: ["PyTorch", "Transformers", "Bi-LSTM", "VGG16", "OpenCV", "NLP", "Speech-to-Text"],
      links: [
        { label: "GitHub", icon: "fab fa-github", href: "https://github.com/saiteja007-mv/Cyberbully-Detection-in-Texts-Images-and-Audios.git" },
        { label: "Research Paper", icon: "fas fa-file-alt", href: "https://www.jetir.org/view?paper=JETIR2304580" }
      ]
    },
    {
      title: "Traffic-Flow Prediction",
      badge: "Featured · Deep Learning",
      desc: "<strong>Seq2Seq encoder–decoder LSTM</strong> forecasting traffic speed on METR-LA (207 LA loop detectors), served as a Dockerized <strong>FastAPI</strong> endpoint. <strong>Test MAE 3.80 / 4.51 / 5.62 mph</strong> @ 15/30/60 min — beats classical baselines by 5–16% and lands within ~0.4 mph of the published FC-LSTM benchmark.",
      tech: ["PyTorch", "Seq2Seq LSTM", "FastAPI", "MLflow", "Hydra", "Prometheus", "Docker"],
      links: [
        { label: "GitHub", icon: "fab fa-github", href: "https://github.com/saiteja007-mv/traffic-flow-prediction" }
      ]
    }
  ],

  // ── JOURNEY (5 entries, verbatim) ────────────────────────────────────
  journey: [
    {
      role: "Content Creator — TechRex",
      company: "YouTube & Instagram",
      date: "Present",
      logoType: "fa",
      logoFa: "fab fa-youtube",
      logoClass: "journey-logo--yt",
      blurb: "Currently creating content on YouTube and Instagram as <a href=\"https://youtube.com/@The_TechRex\" target=\"_blank\" rel=\"noopener\">TechRex</a> — documenting what I build and analyze: AI-powered apps, data projects, dashboards, and the journey behind them.",
      bullets: [
        "Sharing data analysis walkthroughs and AI build tutorials",
        "Building in public on YouTube &amp; Instagram",
        "More at <a href=\"https://techrex.saitejamothukuri.com\" target=\"_blank\" rel=\"noopener\">techrex.saitejamothukuri.com</a>"
      ]
    },
    {
      role: "AI/ML Engineer",
      company: "Honeywell",
      date: "Aug 2025 – Present · Richmond, VA",
      logoType: "fa",
      logoFa: "fas fa-microchip",
      logoBg: "#ee2724",
      blurb: "Building multi-modal deep-learning models and shipping them to real-time edge and cloud inference, with the MLOps to keep them running in production.",
      bullets: [
        "Multi-modal deep-learning models (PyTorch, Hugging Face) fusing voice/image/barcode, served at sub-200 ms on edge",
        "On-device inference optimization (ARM, NVIDIA Jetson) → 35% smaller model memory footprint",
        "RAG + transformer NLP pipelines → +22% operational guidance accuracy at sub-second retrieval",
        "MLOps on AWS + Kubernetes: continuous training/eval/deploy, automated drift detection, model versioning"
      ]
    },
    {
      role: "M.S. Computer Science",
      company: "University of Central Missouri",
      date: "2024 – 2025",
      logoType: "img",
      logoImg: "assets/images/UCM Logo.png",
      logoAlt: "UCM",
      blurb: "Graduate studies with a focus on machine learning, deep learning, and large-scale data systems.",
      bullets: [
        "Advanced coursework in machine learning &amp; deep learning",
        "Applied research in multi-modal ML",
        "Distributed data systems and optimization"
      ]
    },
    {
      role: "Machine Learning Scientist",
      company: "Accenture",
      date: "Sep 2021 – Dec 2023 · India",
      logoType: "img",
      logoImg: "assets/images/Accenture-Logo.png",
      logoAlt: "Accenture",
      blurb: "Built a large-scale ad recommendation engine and the real-time feature pipelines behind it, lifting click-through and ad revenue through rigorous experimentation.",
      bullets: [
        "Large-scale ad recommendation engine (PySpark, Spark Streaming) with sub-3-second targeting",
        "XGBoost/LightGBM/LSTM ad-performance models on 25+ features → +15% CTR, +20% ad revenue",
        "Large-scale A/B experiments with causal inference to validate model impact",
        "Kafka + Spark Streaming real-time feature pipelines; FastAPI/Docker model serving"
      ]
    },
    {
      role: "B.Tech Information Technology",
      company: "SRKR Engineering College",
      date: "2019 – 2023",
      logoType: "img",
      logoImg: "assets/images/SRKR Logo.png",
      logoAlt: "SRKR Engineering College",
      blurb: "Undergraduate studies with a focus on data structures, algorithms, and emerging AI technologies.",
      bullets: [
        "Published research on multi-modal AI cyberbullying detection (JETIR)",
        "Event organizer for technical education society",
        "Comprehensive IT curriculum completion"
      ]
    }
  ],

  // ── SKILLS (6 domains, verbatim) ─────────────────────────────────────
  skills: [
    {
      title: "ML / Deep Learning",
      faIcon: "fas fa-brain",
      items: ["PyTorch", "TensorFlow/Keras", "scikit-learn", "XGBoost", "LightGBM", "CNNs", "Bi-LSTM", "Transformers", "Transfer Learning", "Recommendation Systems"]
    },
    {
      title: "Generative AI / LLM",
      faIcon: "fas fa-robot",
      items: ["RAG", "Hugging Face Transformers", "Embeddings", "Vector Databases", "Semantic Search", "LangChain", "Prompt Engineering"]
    },
    {
      title: "NLP / CV / Speech",
      faIcon: "fas fa-comments",
      items: ["NLP", "Computer Vision", "OpenCV", "NLTK", "Speech-to-Text"]
    },
    {
      title: "Data & Distributed",
      faIcon: "fas fa-database",
      items: ["PySpark", "Apache Spark", "Apache Kafka", "ETL", "Snowflake", "Feature Engineering", "A/B Testing", "Causal Inference"]
    },
    {
      title: "Cloud & MLOps",
      faIcon: "fas fa-cloud",
      items: ["AWS (S3, EC2, Lambda, SageMaker)", "Docker", "Kubernetes", "MLflow", "CI/CD (GitHub Actions)", "FastAPI", "Model Monitoring", "Drift Detection"]
    },
    {
      title: "Languages",
      faIcon: "fas fa-code",
      items: ["Python", "SQL"]
    }
  ],

  // ── ACHIEVEMENTS (JETIR paper + certificate files) ───────────────────
  achievements: {
    paper: {
      title: "Published Research Paper",
      desc: "\"Cyberbullying Detection in Text, Images, and Audio\" — JETIR Journal",
      date: "2023",
      href: "https://www.jetir.org/view?paper=JETIR2304580"
    },
    // Certificate files under IOS - portfolio/docs/Certifications/
    certs: [
      { name: "Accenture Data Analysis Simulation", file: "docs/Certifications/Accenture Data Analysis Simulation.pdf", icon: "fas fa-certificate" },
      { name: "DataBricks Data Analysis", file: "docs/Certifications/DataBricks Data Analysis.pdf", icon: "fas fa-certificate" },
      { name: "Microsoft PowerBI — Data Analysis Associate", file: "docs/Certifications/Microsoft PowerBI - Data Analysis Associate.pdf", icon: "fas fa-certificate" },
      { name: "NPTEL — Data Analytics with Python", file: "docs/Certifications/NPTEL_data analytics with python.jpg", icon: "fas fa-certificate" },
      { name: "Udemy Data Analyst Bootcamp", file: "docs/Certifications/Udemy Data Analyst Bootcamp.pdf", icon: "fas fa-certificate" }
    ]
  },

  // ── CONTACT (Messages app) ───────────────────────────────────────────
  contact: {
    email: "contact@saitejamothukuri.com",
    phone: "913-263-4856",
    linkedin: "https://www.linkedin.com/in/venkatasaitejam",
    github: "https://github.com/saiteja007-mv",
    techrex: "https://youtube.com/@The_TechRex",
    // Same AWS API Gateway endpoint as the live site (from assets/js/script.js)
    apiEndpoint: "https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact",
    intro: "I'm always open to discussing new opportunities, interesting projects, or just having a chat about machine learning and AI."
  },

  // ── Resume PDF (Safari app) ──────────────────────────────────────────
  resume: {
    file: "docs/Sai Teja Mothukuri - AIML Engineer.pdf",
    title: "Resume — Sai Teja Mothukuri"
  }
};
