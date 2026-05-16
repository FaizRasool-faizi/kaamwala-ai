# API Design

## Purpose & Scope
Outlines the REST and WebSocket interfaces for the platform, ensuring robust communication between frontend, backend, and mobile apps (future-proofing for Android).

## REST Endpoint Structure (v1)
- `POST /api/v1/auth/login`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/:id`
- `GET /api/v1/providers/match`

## Request/Response Example
```json
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
```

## WebSocket Events
- `booking_updated`: Sent when provider accepts/rejects.
- `ai_trace_stream`: Streams reasoning tokens to the UI.

## Resilience Strategy
- **Retry**: Exponential backoff on 500s.
- **Rate Limiting**: 100 req/min per IP/Token using Redis.
- **Versioning**: URI-based (`/v1/`) to prevent breaking changes for mobile clients.
