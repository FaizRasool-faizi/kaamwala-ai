---
title: Appointix Backend
emoji: 💼
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Appointix Backend

This is the Express.js / Node.js backend server for Appointix, deployed as a Docker container on Hugging Face Spaces.

## Technical Details

- **Runtime:** Node.js 18 (Alpine)
- **Sockets:** Socket.IO for real-time tracking, chat, and matching
- **Database:** Firebase Firestore
- **AI Integrations:** Google Gemini & Groq
- **Port:** Running on port 7860 (Hugging Face default)
