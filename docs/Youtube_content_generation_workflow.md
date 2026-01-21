# 🎬 AI-Powered YouTube Content Automation

A comprehensive n8n workflow that automates the entire YouTube content creation process - from script processing to SEO optimization, viral tag generation, and thumbnail creation. This system uses local AI (Ollama with Qwen2.5:7b) and integrates multiple APIs to create a complete content production pipeline.

## 📑 Table of Contents

- [🚀 Overview](#-overview)
- [⚠️ Important Disclaimers](#️-important-disclaimers)
  - [Prerequisites & Requirements](#prerequisites--requirements)
  - [What This Automation Does NOT Include](#what-this-automation-does-not-include)
- [🏗️ Architecture](#️-architecture)
  - [Core Technologies](#core-technologies)
  - [System Components](#system-components)
- [📋 Complete Workflow Process](#-complete-workflow-process)
  - [Phase 1: Content Input & Processing](#phase-1-content-input--processing)
  - [Phase 2: AI-Powered SEO Generation](#phase-2-ai-powered-seo-generation)
  - [Phase 3: Viral Tag Discovery](#phase-3-viral-tag-discovery)
  - [Phase 4: Content Documentation](#phase-4-content-documentation)
  - [Phase 5: Thumbnail Generation](#phase-5-thumbnail-generation)
  - [Phase 6: Notification & Completion](#phase-6-notification--completion)
- [🛠️ Setup Instructions](#️-setup-instructions)
  - [Prerequisites](#prerequisites)
  - [1. n8n Installation](#1-n8n-installation)
  - [2. Ollama Setup](#2-ollama-setup)
  - [3. ngrok Configuration](#3-ngrok-configuration)
  - [4. API Configuration](#4-api-configuration)
  - [5. Content Preparation](#5-content-preparation)
  - [6. n8n Credentials Setup](#6-n8n-credentials-setup)
- [📁 File Structure](#-file-structure)
- [🔧 Configuration Details](#-configuration-details)
  - [Google Drive Folders](#google-drive-folders)
  - [Google Sheets](#google-sheets)
  - [API Endpoints](#api-endpoints)
- [🎯 Key Features](#-key-features)
  - [SEO Optimization](#seo-optimization)
  - [AI Integration](#ai-integration)
  - [Automation Benefits](#automation-benefits)
- [📊 Performance Metrics](#-performance-metrics)
  - [Processing Times](#processing-times)
  - [Output Quality](#output-quality)
- [🔍 Troubleshooting](#-troubleshooting)
  - [Common Issues](#common-issues)
  - [Debug Mode](#debug-mode)
- [🚀 Future Enhancements](#-future-enhancements)
  - [Planned Features](#planned-features)
  - [Customization Options](#customization-options)
- [📄 License](#-license)
- [🤝 Contributing](#-contributing)
- [📞 Support](#-support)

## 🚀 Overview

This automation workflow transforms a simple Telegram message into a complete YouTube content package including:
- **SEO-optimized titles** (5 variations)
- **Engaging descriptions** with CTAs
- **Viral tags** based on trending YouTube searches
- **Pinned comments** with timestamps
- **AI-generated thumbnails**
- **Organized documentation** in Google Drive and Sheets

## ⚠️ Important Disclaimers

### Prerequisites & Requirements
- **Script Content**: Users must manually write and upload their video scripts to the designated Google Drive folder before triggering the automation
- **Video Production**: This automation does NOT include video editing, recording, or video generation - it only handles content optimization and metadata creation
- **Content Responsibility**: All script content must be original and comply with YouTube's community guidelines and copyright policies

### What This Automation Does NOT Include
- ❌ Video recording or editing
- ❌ Audio generation or voice synthesis
- ❌ Video file creation or processing
- ❌ YouTube video upload or publishing
- ❌ Script writing or content creation assistance

## 🏗️ Architecture

### Core Technologies
- **n8n** - Workflow automation platform (Docker)
- **Ollama** - Local LLM hosting (Qwen2.5:7b model)
- **ngrok** - Webhook tunneling for Telegram integration
- **Google APIs** - Drive, Docs, Sheets integration
- **YouTube API** - Video metadata and trending analysis
- **OpenRouter API** - Image generation via Gemini 2.5 Flash

### System Components
```
Telegram Bot → n8n Workflow → Local AI → Google Services → YouTube API → Image Generation
```

![Entire Workflow](Entire%20Workflow.png)
*Complete n8n workflow automation showing all connected nodes and data flow*

## 📋 Complete Workflow Process

### Phase 1: Content Input & Processing
1. **Telegram Trigger** 📱
   - User sends a message with script filename
   - **Prerequisite**: Script must already be written and uploaded to Google Drive folder
   - Webhook receives message via ngrok tunnel
   - Extracts filename for Google Drive search

2. **Google Drive Integration** 📁
   - Searches specific folder for matching script file
   - Downloads Google Doc and converts to plain text
   - Extracts clean text content for AI processing

### Phase 2: AI-Powered SEO Generation
3. **Local AI Processing** 🤖
   - **Model**: Qwen2.5:7b (local Ollama instance)
   - **Input**: Script text content
   - **Output**: Structured JSON with:
     - 5 optimized titles (≤70 chars each)
     - SEO description (≤160 words + bullet points)
     - 10-15 relevant tags
     - Engaging pinned comment with timestamps

4. **JSON Parsing & Validation** 🔧
   - Robust parser handles malformed AI output
   - Strips code fences and normalizes fields
   - Ensures clean, structured data for downstream processing

![Generating SEO Package](Generating%20SEO%20package.png)
*AI Agent generating SEO-optimized content using local Ollama Qwen2.5:7b model*

### Phase 3: Viral Tag Discovery
5. **YouTube API Integration** 📺
   - Searches YouTube for related videos using generated titles
   - Fetches top 25 videos from last 6 months
   - Analyzes engagement metrics (views, likes, comments)

6. **Trending Tag Harvesting** 🔥
   - Extracts tags from high-performing videos
   - Uses Google Suggest API for YouTube autocomplete
   - Generates seed queries from script content
   - Filters and ranks tags by relevance and popularity

7. **Smart Tag Generation** 🎯
   - Combines AI-generated tags with viral trends
   - Removes generic/irrelevant terms
   - Balances head terms vs long-tail keywords
   - Outputs final optimized tag set

![YouTube Viral Tags](Youtube%20viral%20tags%20based%20on%20video.png)
*YouTube API integration harvesting trending tags from high-performing videos*

### Phase 4: Content Documentation
8. **Google Docs Creation** 📄
   - Creates new document with SEO package
   - Formats content with titles, description, tags, and comments
   - Saves to designated Google Drive folder

9. **Google Sheets Tracking** 📊
   - Appends/updates metadata to tracking spreadsheet
   - Records: video idea, date, document URL, editor info
   - Uses appendOrUpdate to prevent duplicates

### Phase 5: Thumbnail Generation
10. **AI Thumbnail Prompt Generation** 🎨
    - Uses Qwen2.5:7b to create detailed image prompts
    - Optimizes for YouTube thumbnail best practices
    - Generates structured JSON with rendering parameters

11. **Image Generation** 🖼️
    - Sends prompt to OpenRouter API (Gemini 2.5 Flash)
    - Creates 1280x720 thumbnail images
    - Converts to binary format for file handling

12. **File Management** 💾
   - Uploads generated thumbnails to Google Drive
   - Organizes files with descriptive naming
   - Maintains folder structure for easy access

![AI Thumbnail Generator](AI%20thumbnail%20generator.png)
*AI-powered thumbnail generation workflow using OpenRouter API and Gemini 2.5 Flash*

### Phase 6: Notification & Completion
13. **Telegram Notification** 📢
    - Sends completion message with:
      - SEO package document link
      - Thumbnail image link
      - Processing timestamp
      - Editor information

## 🛠️ Setup Instructions

### Prerequisites
- Docker installed
- ngrok account
- Google Cloud Platform account
- Telegram Bot Token
- YouTube API Key
- OpenRouter API Key

### 1. n8n Installation
```bash
# Pull n8n Docker image
docker pull n8nio/n8n

# Run n8n with Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Ollama Setup
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Qwen2.5:7b model
ollama pull qwen2.5:7b

# Start Ollama server
ollama serve
```

### 3. ngrok Configuration
```bash
# Install ngrok
npm install -g ngrok

# Start tunnel for n8n webhooks
ngrok http 5678
```

### 4. API Configuration
- **Google APIs**: Enable Drive, Docs, Sheets APIs
- **YouTube API**: Create project and enable YouTube Data API v3
- **Telegram Bot**: Create bot via @BotFather
- **OpenRouter**: Sign up and get API key

### 5. Content Preparation
- **Script Writing**: Manually write your video scripts in Google Docs
- **Upload Location**: Place scripts in the designated Google Drive folder
- **File Naming**: Use descriptive filenames that match your Telegram message

### 6. n8n Credentials Setup
Configure the following credentials in n8n:
- Google Drive OAuth2
- Google Docs OAuth2  
- Google Sheets OAuth2
- Telegram API
- Ollama API
- OpenRouter API

## 📁 File Structure

```
YouTube Content Automation/
├── README.md
├── Youtube content Generation.json    # n8n workflow export
├── setup/
│   ├── docker-compose.yml
│   ├── n8n-config.json
│   └── ollama-config.json
└── docs/
    ├── api-setup.md
    ├── troubleshooting.md
    └── customization.md
```

## 🔧 Configuration Details

### Google Drive Folders
- **Scripts Folder**: `16Eu46EJRVhzZ7rLg9NSFe3gAO5PszkZB`
- **SEO Packages Folder**: `1idWhDfg6aW7StIeT4Gum8QOWCJeha34d`
- **Thumbnails Folder**: `1ZSokhS2u1nZ2IdcB7Nz64eJoMNmWuU2V`

### Google Sheets
- **Tracking Sheet**: `1QEc0mT-OzukZgNM9Nj4hPBVeRFONTyAX86V2shPnroc`
- **Sheet Name**: Sheet1

### API Endpoints
- **YouTube Search**: `https://www.googleapis.com/youtube/v3/search`
- **YouTube Videos**: `https://www.googleapis.com/youtube/v3/videos`
- **Google Suggest**: `https://suggestqueries.google.com/complete/search`
- **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions`

## 🎯 Key Features

### SEO Optimization
- **Title Generation**: 5 variations optimized for CTR
- **Description Writing**: Engaging content with CTAs
- **Tag Research**: Data-driven from trending videos
- **Comment Strategy**: Timestamped pinned comments

### AI Integration
- **Local Processing**: Privacy-focused with Ollama
- **Model**: Qwen2.5:7b for balanced performance/speed
- **Prompt Engineering**: Specialized for YouTube content
- **Error Handling**: Robust JSON parsing and validation

### Automation Benefits
- **Time Savings**: Reduces content prep from hours to minutes
- **Consistency**: Standardized SEO practices
- **Scalability**: Handles multiple videos simultaneously
- **Quality**: AI-optimized for engagement metrics

## 📊 Performance Metrics

### Processing Times
- **Script Processing**: ~30 seconds
- **SEO Generation**: ~45 seconds
- **Tag Research**: ~60 seconds
- **Thumbnail Creation**: ~90 seconds
- **Total Workflow**: ~4-5 minutes

### Output Quality
- **Title CTR Optimization**: Based on trending patterns
- **Tag Relevance**: 95%+ topic alignment
- **Description Engagement**: Includes hooks and CTAs
- **Thumbnail Design**: 1280x720 optimized for mobile

## 🔍 Troubleshooting

### Common Issues
1. **Ollama Connection**: Ensure Ollama server is running
2. **ngrok Tunnel**: Check tunnel status and webhook URLs
3. **Google API Limits**: Monitor quota usage
4. **JSON Parsing**: Verify AI output format

### Debug Mode
Enable debug logging in n8n to trace execution flow:
```json
{
  "settings": {
    "executionOrder": "v1",
    "debug": true
  }
}
```

## 🚀 Future Enhancements

### Planned Features
- **Multi-language Support**: Expand beyond English
- **A/B Testing**: Title and thumbnail variations
- **Analytics Integration**: YouTube Analytics API
- **Scheduling**: Automated publishing workflow
- **Voice Generation**: AI voiceover creation

### Customization Options
- **Model Switching**: Support for other Ollama models
- **Template System**: Customizable output formats
- **Brand Integration**: Logo and branding elements
- **Workflow Variants**: Different content types

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting documentation
- Review n8n community forums

---

**Built with ❤️ using n8n, Ollama, and modern AI technologies**
