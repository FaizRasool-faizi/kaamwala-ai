# Agent Workflow Design
## KaamWala AI Orchestration

Google Antigravity acts as the central router, passing context between specialized sub-agents.

### 1. Workflow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Main Orchestrator
    participant Language & Intent Agent
    participant Matching Agent
    participant Pricing & Scheduling Agent
    
    User->>Main Orchestrator: "Kal subah 10 baje AC theek karwana hai"
    Main Orchestrator->>Language & Intent Agent: Parse input
    Language & Intent Agent-->>Main Orchestrator: Context: {intent: 'ac_repair', time: 'tomorrow 10am', urgency: medium, language: 'ur-latn'}
    
    Main Orchestrator->>Matching Agent: Find providers for 'ac_repair' at location
    Matching Agent-->>Main Orchestrator: Top 3 Providers [P1, P2, P3] + Reasoning
    
    Main Orchestrator->>Pricing & Scheduling Agent: Calculate cost & confirm slot
    Pricing & Scheduling Agent-->>Main Orchestrator: Final Quote & Schedule Config
    
    Main Orchestrator-->>User: Present Options & Reasoning Trace
```

### 2. Agent Definitions

#### A. Intent & Language Normalization Agent
- **Input**: Raw user text/voice transcript.
- **Responsibilities**: Detect language, correct spelling, extract intent (service type), extract temporal/spatial constraints, determine urgency/complexity.
- **Output**: Standardized JSON context object.

#### B. Provider Discovery & Matching Agent
- **Input**: Standardized context, user location.
- **Responsibilities**: Query DB for available providers, apply multi-factor scoring (distance, reliability, experience, rating).
- **Output**: Ranked list of providers with specific matching reasoning.

#### C. Pricing & Scheduling Agent
- **Input**: Ranked providers, service complexity, urgency.
- **Responsibilities**: Apply dynamic pricing multipliers, verify calendar availability, add travel buffers.
- **Output**: Finalized price breakdown and time slots.

#### D. Quality & Dispute Agent (Post-Booking)
- **Input**: User feedback, completion status.
- **Responsibilities**: Analyze sentiment of reviews, flag anomalies, handle simulated refund requests or escalations.
- **Output**: Reputation updates to DB, escalation triggers.
