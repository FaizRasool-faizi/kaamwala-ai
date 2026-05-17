// server/antigravity.config.js

const AntigravityEngine = require('./antigravity-engine');
require('dotenv').config();

// Initialize Engine
const engine = new AntigravityEngine({
    apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
});

// AGENTS CONFIG
const AGENTS = {
    // 1. INTENT & SERVICE DETECTION AGENT
    INTENT_AGENT: {
        name: "Intent Agent",
        prompt: `
        Analyze the user's request and extract structured intent.
        - service: Normalize to (Electrician, Plumber, AC Technician, Carpenter, Cleaner)
        - urgency: (High, Medium, Low)
        - intent: (home service request, price inquiry, complaint, general query)
        - normalized_query: Cleaned version of the user request.
        - language: (English, Urdu, Roman Urdu)

        Return JSON format:
        {
            "action": "Intent Extracted",
            "reasoning": "Detected [service] request with [urgency] urgency in [language].",
            "confidence": 98,
            "service": "string",
            "urgency": "string",
            "intent": "string",
            "normalized_query": "string",
            "language": "string"
        }
        `
    },

    // 2. LOCATION INTELLIGENCE AGENT
    LOCATION_AGENT: {
        name: "Location Agent",
        prompt: `
        Analyze the user's query and extract the specific area/location.
        - area: The specific neighborhood or landmark (e.g., DHA Phase 6, Gulberg, Model Town)
        - city: Default to Lahore if not specified.
        
        Return JSON format:
        {
            "action": "Location Identified",
            "reasoning": "User is requesting service in [area], Lahore. Initiating expert discovery in this sector.",
            "confidence": 95,
            "area": "string",
            "city": "string"
        }
        `
    },

    // 3. DISTANCE & ETA ENGINE AGENT
    DISTANCE_AGENT: {
        name: "Distance Agent",
        prompt: `
        Analyze the travel data provided.
        - calculate_road_distance: Confirm if road distance was calculated successfully.
        - fallback_used: Boolean, true if Haversine or other fallback was used.
        - avg_eta: Average time for nearby experts to arrive.
        - DISTANCE: Map of provider names to their calculated distance in KM (e.g., {"Aslam Electrician": "4.5 KM"})
        - ARRIVAL: Map of provider names to their calculated arrival time in minutes (e.g., {"Aslam Electrician": "15 MIN"})

        Return JSON format:
        {
            "action": "Proximity Analysis",
            "reasoning": "Calculated road distances for [count] experts. Routes API used for precision. Average ETA is [time] mins.",
            "confidence": 92,
            "success": true,
            "fallback_used": false,
            "avg_eta": 25,
            "DISTANCE": {
                "Aslam Electrician": "4.5 KM"
            },
            "ARRIVAL": {
                "Aslam Electrician": "15 MIN"
            }
        }
        `
    },

    // 4. EXPERT RANKING AGENT
    RANKING_AGENT: {
        name: "Ranking Agent",
        prompt: `
        Score and rank experts based on:
        - ratings (high priority)
        - distance (lower is better)
        - availability (Available Now is top)
        - reliability score
        - completed jobs

        Compare the provided providers and pick the absolute 'Top Match'.
        Provide a detailed reasoning for the top choice.

        Return JSON format:
        {
            "action": "Expert Ranking Complete",
            "reasoning": "Scored [count] experts. Found optimal match based on [factor].",
            "confidence": 90,
            "top_match_id": "string",
            "scoring_logic": "string",
            "total_analyzed": number
        }
        `
    },

    // 5. RECOMMENDATION ENGINE
    RECOMMENDATION_ENGINE: {
        name: "Recommendation Agent",
        prompt: `
        Generate a cinematic, production-grade recommendation summary for the user.
        - summary: A persuasive 1-2 sentence explanation of why the top expert was chosen.
        - user_message: A polite message in the user's language confirming the choice.

        Return JSON format:
        {
            "action": "Recommendation Generated",
            "reasoning": "Synthesized scoring metrics into a final recommendation for the user.",
            "confidence": 98,
            "summary": "string",
            "user_message": "string"
        }
        `
    }
};

module.exports = { engine, AGENTS };
