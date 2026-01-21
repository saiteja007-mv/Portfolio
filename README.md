# Venkata Sai Teja Portfolio

A modern, fully responsive portfolio website showcasing my skills, projects, and professional journey as a Data Analyst & AI Enthusiast. Deployed on AWS S3 with serverless contact form using AWS Lambda and SES.

🌐 **Live Site:** [saitejamothukuri.com](http://saitejamothukuri.com)

---

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Semantic, accessible markup
- **CSS3**: Custom styles, CSS Grid & Flexbox, animations, media queries
- **JavaScript (Vanilla)**: Interactivity, animations, dynamic charts
- **Font Awesome**: Iconography
- **SVG & Custom Images**: For logos and data visualizations

### Backend & Infrastructure
- **AWS S3**: Static website hosting
- **AWS Lambda (Node.js 22)**: Serverless contact form handler
- **AWS API Gateway**: REST API endpoint for form submissions
- **Amazon SES**: Email delivery service
- **AWS CloudWatch**: Logging and monitoring
- **AWS SDK v3**: AWS service integration

---

## 📚 Project Overview

This portfolio is designed to be:
- **Visually impressive**: Modern UI, animated hero, interactive timeline, and glowing skill cards
- **Mobile-first & responsive**: Looks great on all devices
- **Production-ready**: AWS serverless architecture with 99.99% uptime
- **Cost-effective**: Leverages AWS Free Tier (virtually free hosting)
- **Showcase-focused**: Highlights my data, AI, and analytics skills, certifications, and featured work
- **Easy to maintain**: Clean code, no frameworks, comprehensive documentation

---

## ✨ Features

### UI/UX
- Animated hero section with flip-card code visualization
- Interactive timeline with organization logos (Accenture, UCM, SRKR)
- Skills grid with tech logos and 3D hover effects
- Project cards with live links to GitHub and dashboards
- Smooth scroll animations and transitions
- Custom cursor follower effect
- Loading screen with progress bar
- Mobile-responsive navigation

### Contact Form
- **Serverless architecture** using AWS Lambda + SES
- **Real-time validation** (client-side and server-side)
- **Animated feedback** (loading states, success/error messages)
- **Email notifications** with formatted HTML templates
- **CORS-enabled** API for secure form submissions
- **Error handling** with detailed logging in CloudWatch

## 📁 Project Structure

```
Portfolio/
├── index.html                  # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css         # All styling and animations
│   ├── js/
│   │   └── script.js          # Interactivity and form handling
│   └── images/                # Logos, profile image, icons
├── docs/
│   ├── Certifications/        # PDF certificates and badges
│   ├── DA Venkata sai teja.pdf  # Resume
│   └── resume.md              # Markdown resume
├── deploy-to-s3.ps1           # PowerShell deployment script
└── README.md                  # This file
```

---

## 🏗️ Architecture

### Frontend (S3 Static Website)
```
User Browser
    ↓
S3 Static Website (index.html, CSS, JS)
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
Amazon SES
    ↓ [Sends Email]
Recipient Email Inbox ✅
```

---

## 📬 Contact

- **Email:** saiteja.motukuri@icloud.com
- **LinkedIn:** [linkedin.com/in/venkatasaitejam](https://www.linkedin.com/in/venkatasaitejam)
- **GitHub:** [github.com/saiteja007-mv](https://github.com/saiteja007-mv)
- **Portfolio:** [saitejamothukuri.com](http://saitejamothukuri.com)

---

## 📄 License

This project is open source and available for reference. Feel free to use the code structure and architecture for your own portfolio, but please don't copy the content directly.

---

## 🙏 Acknowledgments

- Font Awesome for icons
- AWS for cloud infrastructure
- iCloud for email services
- All the open-source tools and libraries used

---

**Built with ❤️ by Venkata Sai Teja Mothukuri**

*Data Analyst | AI Enthusiast | Cloud Developer*

⭐ Star this repo if you find it helpful!

