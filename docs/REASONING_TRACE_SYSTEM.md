# Reasoning Trace System

## Purpose & Scope
Exposes AI thought processes to the user to build trust.

## UI Implementation
- Expandable "Terminal" sidebar on desktop, bottom sheet on Android.
- Monospaced font, typewriter effect.

## Trace Schema
```json
{
  "timestamp": "2026-05-14T...",
  "agent": "MatchingEngine",
  "action": "Filtering providers",
  "reasoning": "User requested high urgency. Filtering for providers < 5km radius.",
  "confidence": 0.95
}
```

## Demo Mode
- In hackathon demo mode, traces are artificially slowed down by 200ms to allow judges to read the reasoning process.
