# Technology Stack Decision
## KaamWala AI

### 1. Frontend
- **Framework**: Next.js (App Router)
  - *Why*: Excellent performance, seamless API route integration, and industry standard for React apps. Prepares us well for future scaling.
- **Styling**: Tailwind CSS + ShadCN UI
  - *Why*: Allows rapid development of complex, highly customized premium interfaces without bloated CSS files.
- **Animations**: Framer Motion
  - *Why*: Essential for the "investor-ready" dynamic UI, providing smooth spring physics for reasoning panels and chat interactions.

### 2. Backend
- **Runtime**: Node.js (Express)
  - *Why*: Lightweight, non-blocking I/O is perfect for acting as a middleman for streaming AI responses and managing WebSockets.
- **Real-time**: Socket.IO
  - *Why*: Crucial for streaming the AI's internal reasoning traces and real-time booking status updates to the client.

### 3. Database
- **Primary DB**: PostgreSQL (hosted on Supabase)
  - *Why*: Relational structure is mandatory for complex joins between Users, Bookings, and Providers. PostGIS support is invaluable for location-based queries.

### 4. AI & Orchestration
- **Core Engine**: Google Antigravity
  - *Why*: Required by hackathon constraints. Acts as the primary brain for intelligent routing and multi-agent coordination.
- **LLM Models**: Gemini 3.1 Pro / 2.5 Flash
  - *Why*: High performance in understanding regional languages (Urdu) and rapid reasoning generation.

### 5. Infrastructure
- **Deployment**: Vercel (Frontend) + Railway/Render (Backend API)
- **Mapping**: Google Maps API & Places API
