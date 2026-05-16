# Product Requirements Document (PRD)
## KaamWala AI - Service Orchestrator for the Informal Economy

### 1. Product Vision
To build an intelligent, multilingual service orchestration platform that automates the complete lifecycle of informal service booking. The platform empowers users to find reliable local professionals (electricians, plumbers, tutors, etc.) using natural language, while providing transparent, fair, and efficient routing.

### 2. Target Audience
- **Customers**: Individuals seeking immediate or scheduled local services. They may speak Urdu, English, or a mix of both (Roman Urdu/slang).
- **Service Providers**: Freelance professionals and informal workers looking for reliable job leads and fair compensation.

### 3. Core Features (Phase 1 - Web App Prototype)
- **Natural Language Booking**: Accept complex, multi-intent queries in mixed languages (e.g., "Mujhe kal morning main AC service chahiye").
- **AI-Powered Orchestration**: Google Antigravity orchestrates the entire flow (Intent -> Match -> Price -> Schedule).
- **Multi-Factor Provider Matching**: Rank providers based on distance, reliability, availability, skills, and user preferences.
- **Dynamic Pricing**: Calculate costs based on base fee, urgency, complexity, distance, and demand surge.
- **Smart Scheduling**: Handle conflict detection, travel buffers, and automatic rescheduling.
- **Reasoning Transparency**: Expose AI decision-making (why a provider was chosen, how price was calculated) in real-time to the user.
- **Quality & Dispute Handling**: Simulate end-to-end job completion, feedback collection, and basic dispute resolution.

### 4. Non-Functional Requirements
- **Performance**: High responsiveness; AI reasoning traces must stream in real-time.
- **Scalability**: Architecture must support seamless migration to an Android native app in Phase 2.
- **UI/UX**: Premium, investor-ready design with dark mode, glassmorphism, and dynamic micro-animations.

### 5. Success Metrics (Hackathon Demo)
- Successful parsing of complex Roman Urdu queries.
- Transparent and logical provider ranking demonstration.
- Smooth simulated booking lifecycle from request to completion.
