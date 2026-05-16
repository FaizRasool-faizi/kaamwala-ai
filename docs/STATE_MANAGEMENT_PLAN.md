# State Management Plan

## Purpose & Scope
Frontend state architecture for React/Next.js.

## Strategy
- **Server State**: React Query / SWR for caching API responses (bookings, profile).
- **Client State**: Zustand for lightweight UI state (sidebar open, dark mode).
- **AI Chat State**: Local reducer for instant optimistic UI updates on chat messages.

## Android Consistency
- Prepares for React Native Redux/Zustand sharing logic across platforms.
