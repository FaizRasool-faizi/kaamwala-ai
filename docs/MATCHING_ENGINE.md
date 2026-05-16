# Matching Engine

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
- Emits `MATCHING_TRACE` for reasoning transparency.
