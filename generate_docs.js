const fs = require('fs');
const path = require('path');

const docsDir = path.join('d:', 'Faiz', 'hackhthon', 'kaamwala-ai', 'docs');

const files = {
  "DATABASE_SCHEMA.md": `# Database Schema (KaamWala AI)

## Purpose & Scope
Defines the core data models, relationships, and indexing strategies for the KaamWala AI platform. Designed to support high read/write throughput for up to 10K+ concurrent users with scalability in mind.

## ER Diagram
\`\`\`mermaid
erDiagram
    USERS ||--o{ BOOKINGS : makes
    PROVIDERS ||--o{ BOOKINGS : assigned_to
    PROVIDERS ||--o{ PROVIDER_REPUTATION : has
    BOOKINGS ||--o{ AI_TRACES : generated_for
    BOOKINGS ||--o{ DISPUTES : involved_in
    BOOKINGS ||--o{ AUDIT_LOGS : tracked_by
\`\`\`

## Core Entities
1. **Users**: Customers booking services.
2. **Providers**: Professionals delivering services.
3. **Bookings**: Service appointments with lifecycle states (PENDING, MATCHING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED).
4. **Disputes**: Issue tickets tied to bookings.
5. **AI_Traces**: Stores reasoning steps for transparency.
6. **Provider_Reputation**: Historical rating and fairness index for matching algorithm.
7. **Audit_Logs**: Append-only table tracking system changes.

## Relationships & Indexing Strategy
- **Indexes**: B-Tree on (provider_id, status) for fast availability checks. Geospacial indexing (PostGIS or similar) on provider locations for proximity matching.
- **Foreign Keys**: Enforce referential integrity between Bookings, Users, and Providers.

## AI Orchestration
- Antigravity parses booking history to personalize interactions.
- Stores trace summaries directly in \`AI_Traces\` for the Reasoning Trace System.

## Future Scalability
- Sharding strategy based on geographic regions.
- Read replicas for heavy analytics queries.
- Android compatibility ensures API can serve mobile offline-sync payloads via Last-Modified tracking.
`,
  "API_DESIGN.md": `# API Design

## Purpose & Scope
Outlines the REST and WebSocket interfaces for the platform, ensuring robust communication between frontend, backend, and mobile apps (future-proofing for Android).

## REST Endpoint Structure (v1)
- \`POST /api/v1/auth/login\`
- \`POST /api/v1/bookings\`
- \`GET /api/v1/bookings/:id\`
- \`GET /api/v1/providers/match\`

## Request/Response Example
\`\`\`json
// POST /api/v1/bookings
{
  "service_type": "plumbing",
  "urgency": "high",
  "description": "Urgent pipe leak in kitchen"
}

// Response (200 OK)
{
  "booking_id": "b_12345",
  "status": "MATCHING",
  "estimated_price": { "min": 500, "max": 1200, "currency": "PKR" }
}
\`\`\`

## WebSocket Events
- \`booking_updated\`: Sent when provider accepts/rejects.
- \`ai_trace_stream\`: Streams reasoning tokens to the UI.

## Resilience Strategy
- **Retry**: Exponential backoff on 500s.
- **Rate Limiting**: 100 req/min per IP/Token using Redis.
- **Versioning**: URI-based (\`/v1/\`) to prevent breaking changes for mobile clients.
`,
  "MATCHING_ENGINE.md": `# Matching Engine

## Purpose & Scope
The core AI orchestration logic determining which provider gets which job, optimizing for speed, quality, and fairness.

## Weighted Scoring Formula
Score = (Proximity * 0.4) + (Rating * 0.3) + (Fairness Index * 0.2) + (Availability Confidence * 0.1)

## Fairness Strategy & Provider Balancing
- **Fairness Index**: Boosts visibility of newer providers or those with fewer recent jobs to ensure equitable distribution of work.

## Confidence Scoring & Edge Cases
- **Confidence Score**: AI agent outputs a 0-100 score on how likely the provider can fulfill the job based on skill match.
- **Edge Cases**: If no provider > 60% confidence, triggers **Fallback Strategy** (expands radius or asks user to reschedule).

## Antigravity Responsibilities
- Calculates weights dynamically based on user urgency.
- Emits \`MATCHING_TRACE\` for reasoning transparency.
`,
  "PRICING_ENGINE.md": `# Pricing Engine

## Purpose & Scope
Calculates dynamic pricing for services to balance provider earnings and user affordability.

## Pricing Formula
Base Rate = (Standard Category Rate) + (Complexity Modifier)
Final Price = Base Rate * Urgency Multiplier * Demand Surge Multiplier - Loyalty Discount

## Surge & Urgency Logic
- **Urgency Multiplier**: 1.5x for < 2 hours SLA.
- **Demand Surge**: 1.2x if active bookings in region > available providers.

## Transparency & Breakdown
\`\`\`json
{
  "base": 1000,
  "surge": 200,
  "loyalty_discount": -100,
  "total": 1100
}
\`\`\`
- Breakdown provided explicitly in AI chat to build trust.

## Android/Future
- Pricing tiers cached locally on Android to avoid latency on initial service browsing.
`,
  "SCHEDULING_ENGINE.md": `# Scheduling Engine

## Purpose & Scope
Handles time management, conflict prevention, and routing for providers.

## Core Logic
- **Conflict Prevention**: Hard locks on provider calendars.
- **Travel-Time Buffer**: Adds Google Maps API estimated travel time + 15 min buffer between jobs.

## Cancellation & Recovery
- **Auto-rescheduling**: If provider cancels, triggers high-priority rematching without user intervention.
- **Workflow**: Notifies user -> Pauses billing -> Re-enters MATCHING state.

## Antigravity AI Role
- Detects schedule anomalies ("Provider took 3x longer on previous job, auto-delay next job and inform user").
`,
  "DISPUTE_WORKFLOW.md": `# Dispute Workflow

## Purpose & Scope
Standardized resolution path for customer/provider conflicts.

## Workflow
1. **Initiation**: User flags issue.
2. **AI Triage**: Antigravity agent categorizes severity.
3. **Automated Resolution**: For minor issues (< $10 value), AI offers instant wallet credit.
4. **Human Escalation**: For major issues, freezes payout and alerts admin.

## Audit & Tracking
- All messages during dispute logged securely.
- Provider reputation heavily tied to dispute resolution rates.
`,
  "FALLBACK_STRATEGY.md": `# Fallback Strategy

## Purpose & Scope
Defines how the system behaves when AI fails, APIs timeout, or no matches are found.

## Graceful Degradation
- **LLM Failure**: If Gemini/Antigravity API fails, fallback to rule-based keyword matching.
- **No Providers**: Offer waitlist or scheduled booking instead of instant booking.
- **Database Latency**: Serve read-only cached data for provider listings.

## AI Fallback Prompts
- "I'm having trouble processing that exact request. Could you select from these standard options?"
`,
  "MULTILINGUAL_PIPELINE.md": `# Multilingual Pipeline

## Purpose & Scope
Handles English, Urdu, and Roman Urdu processing seamlessly.

## Processing Steps
1. **Language Detection**: Fast heuristic or LLM-based detection.
2. **Normalization**:
   - *Roman Urdu*: Maps slang ("bhai", "jaldi") to standard intent markers (relationship, urgency).
   - *Misspellings*: Fuzzy matching against known vocabulary.
3. **Intent Extraction**: Core mapping to service types.

## Fallback & Confirmation
- If intent confidence < 80%: "Aapko plumber chahiye pipe theek karne ke liye? (Yes/No)"
- **Code-switching**: Handles mixed sentences natively via Gemini 3.1 Pro context.
`,
  "SECURITY_AND_PRIVACY.md": `# Security & Privacy

## Purpose & Scope
Protects user data, provider locations, and prevents abuse.

## Core Policies
- **User Data**: PII encrypted at rest.
- **Provider Privacy**: Exact location masked until booking is CONFIRMED.
- **API Security**: JWT for auth, HTTPS strict.
- **Secrets Handling**: Managed via environment variables, never committed to VCS.

## AI Safety & Prompt Injection
- Input sanitization layer before LLM processing.
- System prompts enforce boundaries: "You are a service booking assistant. Do NOT answer non-service questions."
`,
  "ENVIRONMENT_VARIABLES.md": `# Environment Variables

## Purpose & Scope
Required config for different environments.

## Schema
\`\`\`env
# App
NODE_ENV=development|production
PORT=3000

# AI Services
GEMINI_API_KEY=xxx
ANTIGRAVITY_ENDPOINT=xxx

# Database
DATABASE_URL=postgres://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=xxx
\`\`\`
`,
  "STATE_MANAGEMENT_PLAN.md": `# State Management Plan

## Purpose & Scope
Frontend state architecture for React/Next.js.

## Strategy
- **Server State**: React Query / SWR for caching API responses (bookings, profile).
- **Client State**: Zustand for lightweight UI state (sidebar open, dark mode).
- **AI Chat State**: Local reducer for instant optimistic UI updates on chat messages.

## Android Consistency
- Prepares for React Native Redux/Zustand sharing logic across platforms.
`,
  "FRONTEND_ARCHITECTURE.md": `# Frontend Architecture

## Purpose & Scope
Defines the React/Next.js UI structure.

## Core Design
- **Framework**: Next.js App Router.
- **Styling**: Tailwind CSS + Framer Motion (Glassmorphism).
- **Components**: Atomic design pattern (Atoms, Molecules, Organisms).

## Interactions
- Terminal-style AI reasoning trace sidebar.
- Spring-based staggered animations.
`,
  "BACKEND_ARCHITECTURE.md": `# Backend Architecture

## Purpose & Scope
Node.js/Express (or Next.js API Routes) architecture.

## Structure
- **Controller Layer**: Handles HTTP.
- **Service Layer**: Business logic (Pricing, Matching).
- **AI Orchestration Layer**: Antigravity agents (Router, Matcher, Support).
- **Data Access Layer**: Repositories for DB interaction.

## Scalability
- Stateless services suitable for horizontal scaling via Docker/K8s.
`,
  "ANALYTICS_AND_LOGGING.md": `# Analytics & Logging

## Purpose & Scope
Observability and business metrics.

## Implementation
- **Logging**: Winston/Pino. Structured JSON logs.
- **Metrics**: Prometheus/Grafana or PostHog.
- **Events Tracked**: Booking funnel drop-offs, AI intent resolution time, matching latency.
`,
  "REASONING_TRACE_SYSTEM.md": `# Reasoning Trace System

## Purpose & Scope
Exposes AI thought processes to the user to build trust.

## UI Implementation
- Expandable "Terminal" sidebar on desktop, bottom sheet on Android.
- Monospaced font, typewriter effect.

## Trace Schema
\`\`\`json
{
  "timestamp": "2026-05-14T...",
  "agent": "MatchingEngine",
  "action": "Filtering providers",
  "reasoning": "User requested high urgency. Filtering for providers < 5km radius.",
  "confidence": 0.95
}
\`\`\`

## Demo Mode
- In hackathon demo mode, traces are artificially slowed down by 200ms to allow judges to read the reasoning process.
`,
  "FINAL_ARCHITECTURE_SUMMARY.md": `# Final Architecture Summary

## 1. Overview
The KaamWala AI architecture is a robust, modular system designed for the hackathon demo, emphasizing real-time AI orchestration, transparent reasoning, and high scalability.

## 2. Recommended Folder Structure
\`\`\`
/client
  /app (Next.js pages)
  /components
  /store (Zustand)
  /lib
/server
  /api (REST routes)
  /agents (Antigravity logic)
  /services (Business logic)
  /models (DB schemas)
/docs (Architecture blueprints)
\`\`\`

## 3. Implementation Priority Order
1. **Foundation**: Setup DB schemas and Base Next.js app.
2. **AI Core**: Connect Gemini 3.1 Pro & Antigravity routing.
3. **Core Workflow**: Booking creation -> Matching -> Confirmation.
4. **UI/UX**: Glassmorphism, Animations, Reasoning Trace sidebar.
5. **Edge Cases**: Multilingual fallback, waitlist.

## 4. Engineering Milestone Plan
- **Milestone 1**: Mock Data & Core Chat Interface (Day 1).
- **Milestone 2**: AI Agent Pipeline & Reasoning Traces (Day 1).
- **Milestone 3**: Database Integration & Real Matching Engine (Day 2).
- **Milestone 4**: UI Polish & Demo Prep (Day 2).

## 5. Recommendation: Backend/Frontend Strategy
**Frontend-First Strategy**. For a hackathon, visual feedback and perceived intelligence win. Build the premium UI and Chat Interface first using mocked provider data, then swap in the real backend.

## 6. MVP Scope for Hackathon
- **Include**: 1 Service Type (Plumbing/Electrician), English/Roman Urdu chat, Mock Matching, Real AI traces, Premium UI.
- **Exclude**: Real payment gateways, real geocoding routing (use mock coordinates), complex dispute resolution.

## 7. Mock vs Implement
- **Mock**: Payment processing, SMS/Email notifications, Live provider GPS tracking.
- **Fully Implement**: LLM Multilingual Pipeline, Reasoning Trace UI, State Management, Core Matching Formula logic.
`,
  "CHANGELOG.md": `# Changelog
## [Unreleased]
### Added
- Completed comprehensive architectural documentation (Database, API, Matching Engine, Pricing, Scheduling, etc.)
- Added Final Architecture Summary with implementation priority and MVP scope.
`,
  "TASK_TRACKER.md": `# Task Tracker
- [x] Generate architecture documentation
- [ ] Initialize project folder structure
- [ ] Implement MVP Frontend Core
`
};

Object.keys(files).forEach(filename => {
  fs.writeFileSync(path.join(docsDir, filename), files[filename], 'utf8');
});
console.log('Successfully wrote all files.');
