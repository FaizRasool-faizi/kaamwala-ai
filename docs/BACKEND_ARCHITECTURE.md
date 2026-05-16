# Backend Architecture

## Purpose & Scope
Node.js/Express (or Next.js API Routes) architecture.

## Structure
- **Controller Layer**: Handles HTTP.
- **Service Layer**: Business logic (Pricing, Matching).
- **AI Orchestration Layer**: Antigravity agents (Router, Matcher, Support).
- **Data Access Layer**: Repositories for DB interaction.

## Scalability
- Stateless services suitable for horizontal scaling via Docker/K8s.
