# Venkata Sai Teja Portfolio

A modern, fully responsive portfolio website showcasing my skills, projects, and professional journey as a Data Analyst & AI Enthusiast. Deployed on Vercel with a serverless contact form using AWS Lambda and SES.

🌐 **Live Site:** [saitejamothukuri.com](https://saitejamothukuri.com)
📺 **YouTube:** [TechRex](https://youtube.com/@The_TechRex)

---

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Semantic, accessible markup with JSON-LD structured data
- **CSS3**: Custom properties, CSS Grid & Flexbox, animations, media queries
- **JavaScript (Vanilla)**: IntersectionObserver animations, parallax, contact form handling
- **Font Awesome 6**: Iconography via CDN
- **Google Fonts**: Inter & JetBrains Mono

### Hosting & Infrastructure
- **Vercel**: Static website hosting with edge CDN and automatic deployments from GitHub
- **AWS Lambda (Node.js 22)**: Serverless contact form handler
- **AWS API Gateway**: REST API endpoint for form submissions
- **Amazon SES**: Email delivery with custom HTML templates
- **AWS CloudWatch**: Logging and monitoring

### SEO
- XML Sitemap & robots.txt
- Open Graph & Twitter Card meta tags
- JSON-LD structured data (Person + WebSite schemas)

---

## ✨ Features

### UI/UX
- Animated hero section with flip-card (profile photo ↔ TechRex logo)
- Interactive timeline with organization logos (Accenture, UCM, SRKR)
- Skills grid with tech logos and 3D hover effects
- Project cards with live links to GitHub and dashboards
- Data visualization section with embedded Tableau & Power BI dashboards
- Smooth scroll animations via IntersectionObserver
- Custom cursor follower effect
- Typing effect on hero title
- Loading screen with progress bar
- Mobile-responsive navigation with scroll lock
- Resume modal with PDF viewer

### Contact Form
- **Serverless architecture** using AWS Lambda + SES
- **Real-time validation** (client-side and server-side)
- **Animated feedback** (loading states, success/error messages)
- **Email notifications** with formatted HTML templates (`ses_html.html`)
- **CORS-enabled** API for secure form submissions
- **Error handling** with detailed logging in CloudWatch

---

## 📁 Project Structure

```
Portfolio/
├── index.html                  # Single-page HTML (all sections)
├── ses_html.html               # SES email template for contact form
├── assets/
│   ├── css/
│   │   └── styles.css          # All styling, themes, and animations
│   ├── js/
│   │   └── script.js           # Interactivity, animations, form handling
│   └── images/                 # Logos, profile photos, icons (PNG/SVG/JPG)
├── docs/
│   ├── Certifications/         # PDF/JPG certificates and badges
│   ├── resume.md               # Markdown resume
│   ├── AI_RagChatbot_using_AWS.md      # RAG Chatbot project writeup
│   └── Youtube_content_generation_workflow.md  # YouTube automation writeup
├── AWS Domain/                 # DNS configuration CSVs (reference)
├── sitemap.xml                 # XML sitemap for SEO
├── robots.txt                  # Crawler directives
├── CLAUDE.md                   # Claude Code guidance
└── README.md                   # This file
```

---

## 🚀 Featured Projects

| Project | Tech | Links |
|---------|------|-------|
| **AI-Powered RAG Chatbot** | AWS Bedrock, Claude 3.5, Lambda, DynamoDB, Python | [Live Demo](http://rag-chatbot-website-101002668362.s3-website.us-east-2.amazonaws.com/) · [GitHub](https://github.com/saiteja007-mv/AI-Rag-Chatbot-using-AWS-Services) |
| **YouTube Content Automation** | n8n, Ollama, Qwen2.5, YouTube API, OpenRouter | [GitHub](https://github.com/saiteja007-mv/Youtube-Content-Generation-Workflow) |
| **Employee Retention Analysis** | Python, Selenium, Power BI, JavaScript | [GitHub](https://github.com/saiteja007-mv/Employee-Retention-Analysis) |
| **Target Brazil E-commerce Analysis** | BigQuery, SQL, Tableau | [GitHub](https://github.com/saiteja007-mv/-Target-Brazil-Ecommerce-Data-Analysis-using-SQL) |
| **AI Cyberbullying Detection** | Machine Learning, NLP, Deep Learning | [GitHub](https://github.com/saiteja007-mv/Cyberbully-Detection-in-Texts-Images-and-Audios) · [Paper](https://www.jetir.org/view?paper=JETIR2304580) |
| **LinkedIn Job Application Automation** | Make.com, OpenAI GPT-4, Google Sheets | [GitHub](https://github.com/saiteja007-mv/LinkedIn-Job-Application-Automation-using-Make.com-Apify-OpenAI) |

---

## 📊 Data Visualizations

- [IPL Analysis Dashboard](https://public.tableau.com/app/profile/venkata.sai.teja.mothukuri/viz/IPLAnalysis_16983213756910/IPLAnalysis) — Tableau
- [Sales Performance Analysis](https://public.tableau.com/views/SaleAnalysis_17388930656530/Sales_Performance) — Tableau
- [Prism Insurance Data Analysis](https://app.powerbi.com/view?r=eyJrIjoiODhiNTAwNzAtYmY5YS00ZWM0LTk2ODMtZjQ5YjBjNTVmOTRhIiwidCI6IjdhZmI5ZTIyLTkzMDgtNDE4Ni04ZTI5LWVhMjMxZmYzYmFmNyIsImMiOjN9) — Power BI
- [Glassdoor Companies Review Analysis](https://app.powerbi.com/view?r=eyJrIjoiODdiNzRlMjktNTc3ZS00NjkyLTk1MzYtZjU0NmQyYzJhZjcwIiwidCI6IjdhZmI5ZTIyLTkzMDgtNDE4Ni04ZTI5LWVhMjMxZmYzYmFmNyIsImMiOjN9) — Power BI

---

## 🧰 Skills

SQL · Python · Tableau · Power BI · BigQuery · Databricks · MS Excel · Snowflake · AWS

---

## 🏅 Certifications

- **Microsoft Power BI Data Analyst Associate (PL-300)** — June 2025
- **Data Analysis with Databricks** — April 2025
- **Complete Data Analyst Bootcamp** (Udemy) — April 2025
- **Accenture Data Analysis Simulation** — April 2025
- **NPTEL Data Analytics with Python** — April 2022
- **Published Research**: "Cyberbullying Detection in Text, Images, and Audio" — JETIR, 2023

---

## 🏗️ Architecture

### Frontend (Vercel)
```
User Browser
    ↓
Vercel Edge CDN (index.html, CSS, JS)
    ↓
Form Submission
```

### Contact Form (Serverless)
```
User submits form
    ↓
API Gateway (POST /contact)
    ↓
Lambda Function (Node.js 22)
    ↓ [Validates & Processes]
Amazon SES (ses_html.html template)
    ↓ [Sends Formatted Email]
Recipient Email Inbox ✅
```

---

## 📬 Contact

- **Email:** saiteja.motukuri@icloud.com
- **LinkedIn:** [linkedin.com/in/venkatasaitejam](https://www.linkedin.com/in/venkatasaitejam)
- **GitHub:** [github.com/saiteja007-mv](https://github.com/saiteja007-mv)
- **YouTube:** [TechRex](https://youtube.com/@The_TechRex)
- **Portfolio:** [saitejamothukuri.com](https://saitejamothukuri.com)

---

## 📄 License

This project is open source and available for reference. Feel free to use the code structure and architecture for your own portfolio, but please don't copy the content directly.

---

**Built with ❤️ by Venkata Sai Teja Mothukuri**

*Data Analyst | AI Enthusiast | Content Creator*

⭐ Star this repo if you find it helpful!
