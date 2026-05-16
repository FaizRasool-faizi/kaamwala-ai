# Fallback Strategy

## Purpose & Scope
Defines how the system behaves when AI fails, APIs timeout, or no matches are found.

## Graceful Degradation
- **LLM Failure**: If Gemini/Antigravity API fails, fallback to rule-based keyword matching.
- **No Providers**: Offer waitlist or scheduled booking instead of instant booking.
- **Database Latency**: Serve read-only cached data for provider listings.

## AI Fallback Prompts
- "I'm having trouble processing that exact request. Could you select from these standard options?"
