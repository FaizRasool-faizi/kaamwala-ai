# Security & Privacy

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
