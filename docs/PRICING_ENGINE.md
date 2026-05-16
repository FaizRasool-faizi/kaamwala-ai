# Pricing Engine

## Purpose & Scope
Calculates dynamic pricing for services to balance provider earnings and user affordability.

## Pricing Formula
Base Rate = (Standard Category Rate) + (Complexity Modifier)
Final Price = Base Rate * Urgency Multiplier * Demand Surge Multiplier - Loyalty Discount

## Surge & Urgency Logic
- **Urgency Multiplier**: 1.5x for < 2 hours SLA.
- **Demand Surge**: 1.2x if active bookings in region > available providers.

## Transparency & Breakdown
```json
{
  "base": 1000,
  "surge": 200,
  "loyalty_discount": -100,
  "total": 1100
}
```
- Breakdown provided explicitly in AI chat to build trust.

## Android/Future
- Pricing tiers cached locally on Android to avoid latency on initial service browsing.
