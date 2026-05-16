# Scheduling Engine

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
