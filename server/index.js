// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Server } = require('socket.io');
const { engine, AGENTS } = require('./antigravity.config');
const providers = require('./data/providers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// In-memory store for active bookings and locations
const activeBookings = new Map();
const expertLocations = new Map(); // Store latest location of each expert

const serviceAliases = {
    "AC Technician": ["ac technician", "ac", "air condition", "air conditioner", "cooling", "electrician"],
    "Electrician": ["electrician", "bijli", "electric", "electrition"],
    "Plumber": ["plumber", "plamber", "pipe", "pani", "leak"],
    "Carpenter": ["carpenter", "carpentar", "lakri", "wood"]
};

const FUEL_RATE_PER_KM = 50; // Configurable Rs/KM
const LAHORE_FALLBACK = { lat: 31.5204, lng: 74.3587 };

function validateUserLocation(location) {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return { ...LAHORE_FALLBACK };
    }
    return { lat: location.lat, lng: location.lng };
}

function toRad(value) {
    return (value * Math.PI) / 180;
}

function getDistanceKm(from, to) {
    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;

    const earthRadiusKm = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function serviceMatches(requestedService, providerService) {
    const requested = String(requestedService || "").toLowerCase();
    const provider = String(providerService || "").toLowerCase();

    if (!requested || !provider) return false;
    if (requested === provider || requested.includes(provider) || provider.includes(requested)) return true;

    const aliases = serviceAliases[providerService] || [];
    return aliases.some((alias) => requested.includes(alias) || alias.includes(requested));
}

function parseIntentFallback(message) {
    const text = String(message || "").toLowerCase();
    const service = Object.keys(serviceAliases).find((serviceName) => {
        const aliases = [serviceName.toLowerCase(), ...(serviceAliases[serviceName] || [])];
        return aliases.some((alias) => text.includes(alias));
    }) || "AC Technician";

    const knownLocations = ["dha", "gulberg", "lahore"];
    const location = knownLocations.find((area) => text.includes(area)) || "DHA";
    const urgency = /(urgent|emergency|abhi|jaldi|foran|فوراً|ایمرجنسی)/i.test(message || "")
        ? "High"
        : "Medium";
    const language = /[\u0600-\u06FF]/.test(message || "")
        ? "Urdu"
        : "Roman Urdu";

    return {
        service,
        location: location.toUpperCase() === "DHA" ? "DHA" : location[0].toUpperCase() + location.slice(1),
        urgency,
        language
    };
}

// =========================
// DISTANCE UTILITIES
// =========================

async function getBulkRoadDistances(userLocation, destinations) {
    if (!userLocation || !destinations.length) return {};
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const results = {};

    // Initialize results with Haversine fallback
    destinations.forEach(dest => {
        const haversineDist = getDistanceKm(userLocation, { lat: dest.lat, lng: dest.lng });
        const roadEstimate = haversineDist ? haversineDist * 1.3 : null;
        results[dest.id] = {
            distanceKm: roadEstimate,
            durationMins: roadEstimate ? Math.max(5, Math.round(roadEstimate * 3.5)) : null,
            method: 'haversine_estimate'
        };
    });

    // Try Routes API (New)
    try {
        const response = await axios.post('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
            origins: [{ waypoint: { location: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } } } }],
            destinations: destinations.map(d => ({ waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } } })),
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
            },
            timeout: 3000
        });

        if (Array.isArray(response.data)) {
            response.data.forEach(element => {
                const destIndex = element.destinationIndex;
                const providerId = destinations[destIndex]?.id;
                if (providerId && element.status?.code === undefined && element.condition === 'ROUTE_EXISTS') {
                    results[providerId] = {
                        distanceKm: element.distanceMeters / 1000,
                        durationMins: Math.round(parseInt(element.duration) / 60),
                        method: 'google_routes_api'
                    };
                }
            });
            return results;
        }
    } catch (err) {
        // Log to console but keep moving
        console.log(`[DISTANCE_ENGINE] Routes API unavailable (403/Forbidden or 404). Switching to fallback...`);
    }

    // Try Legacy Distance Matrix fallback
    try {
        const destStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${userLocation.lat},${userLocation.lng}&destinations=${destStr}&key=${apiKey}`;
        const response = await axios.get(url, { timeout: 3000 });
        
        if (response.data.status === "OK") {
            response.data.rows[0].elements.forEach((element, idx) => {
                const providerId = destinations[idx]?.id;
                if (providerId && element.status === "OK") {
                    results[providerId] = {
                        distanceKm: element.distance.value / 1000,
                        durationMins: Math.round(element.duration.value / 60),
                        method: 'google_legacy_api'
                    };
                }
            });
        }
    } catch (err) {
        console.log(`[DISTANCE_ENGINE] All Google APIs failed. Using Haversine city-factor estimation.`);
    }

    return results;
}

async function buildRankedOptions(intentData, availableProviders, userLocation, radiusKm = null) {
    const requestedLocation = String(intentData?.location || "").toLowerCase();
    
    // Filter by service first
    const eligibleProviders = availableProviders.filter(p => serviceMatches(intentData?.service, p.service));
    
    // Get bulk distances
    const distanceMatrix = userLocation 
        ? await getBulkRoadDistances(userLocation, eligibleProviders.map(p => ({
            id: p.id,
            lat: expertLocations.get(p.id)?.lat || p.lat,
            lng: expertLocations.get(p.id)?.lng || p.lng
          })))
        : {};

    const ranked = eligibleProviders
        .map(provider => {
            const roadData = distanceMatrix[provider.id] || { distanceKm: null, durationMins: null, method: 'none' };
            const distanceKm = roadData.distanceKm;
            
            const isSameArea = requestedLocation && provider.location.toLowerCase().includes(requestedLocation);
            const isAvailable = provider.status === "Available";
            
            // Advanced Scoring logic
            const distanceScore = distanceKm === null ? 0 : Math.max(0, 40 - distanceKm * 3);
            const reliabilityFactor = (provider.reliabilityScore || 90) / 10; // 0-10
            const volumeFactor = Math.min(10, (provider.jobsCompleted || 0) / 50); // 0-10
            
            const score =
                provider.rating * 15 +
                (isAvailable ? 30 : -50) +
                (isSameArea ? 10 : 0) +
                distanceScore +
                reliabilityFactor * 2 +
                volumeFactor * 2;

            const travelCharges = distanceKm ? Math.max(150, Math.round(distanceKm * FUEL_RATE_PER_KM)) : 0;

            return {
                ...provider,
                distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(1)),
                etaMinutes: roadData.durationMins,
                travelCharges,
                score,
                calcMethod: roadData.method
            };
        })
        .filter(p => {
            if (radiusKm && p.distanceKm !== null) return p.distanceKm <= radiusKm;
            return true;
        })
        .sort((a, b) => b.score - a.score)
        .map((provider, index) => {
            const reasonParts = [
                `${provider.rating}★ Rating`,
                provider.distanceKm !== null ? `ETA ${provider.etaMinutes}m` : null,
                `${provider.jobsCompleted}+ Jobs`
            ].filter(Boolean);

            return {
                id: provider.id,
                name: provider.name,
                service: provider.service,
                location: provider.location,
                rating: provider.rating,
                status: provider.status,
                lat: provider.lat,
                lng: provider.lng,
                distanceKm: provider.distanceKm,
                etaMinutes: provider.etaMinutes,
                travelCharges: provider.travelCharges,
                reliabilityScore: provider.reliabilityScore,
                jobsCompleted: provider.jobsCompleted,
                badge: index === 0 ? "Top Recommendation" : provider.status === "Available" ? "Nearest" : "High Quality",
                reason: reasonParts.join(" • "),
                reasoning: index === 0
                    ? `AI Analysis: ${provider.name} is the optimal choice for your ${provider.service} request. Ranked #1 with ${provider.reliabilityScore}% reliability across ${provider.jobsCompleted} jobs. ETA is ${provider.etaMinutes} mins with high matching confidence.`
                    : `${provider.name} is a strong backup with ${provider.rating} rating and ${provider.jobsCompleted} successful jobs.`,
                isBestFit: index === 0,
                calcMethod: provider.calcMethod
            };
        });

    return ranked;
}

async function analyzeImageAndText(message, base64Image) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in .env file.");
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Parse base64 prefix
    let base64Data = base64Image;
    let mimeType = "image/jpeg"; // default

    if (base64Image.startsWith("data:")) {
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            mimeType = match[1];
            base64Data = match[2];
        }
    }

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: mimeType
        }
    };

    const prompt = `
    Analyze this uploaded maintenance problem picture along with user's written message: "${message || 'No message provided'}".
    Extract the following details as a valid JSON object:
    - service: Best fitting standard service out of (Electrician, Plumber, AC Technician, Carpenter)
    - urgency: Level of emergency (High, Medium, Low) based on water damage, sparking hazard, safety threat, etc.
    - intent: Clean summary statement of what is broken.
    - normalized_query: Detailed technical summary of what needs to be fixed.
    - language: "Roman Urdu" or "Urdu" or "English" based on user message.

    Return JSON format:
    {
        "action": "Vision Analysis Complete",
        "reasoning": "Detected [service] request with [urgency] urgency based on image analysis.",
        "confidence": 98,
        "service": "string",
        "urgency": "string",
        "intent": "string",
        "normalized_query": "string",
        "language": "string"
    }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = await result.response.text();
    
    // Clean up markdown block styling from model output
    const cleanJsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJsonText);
}

// server/index.js - Updated chat pipeline

app.post('/api/chat', async (req, res) => {
    const { message, image, userLocation, radius } = req.body;

    try {
        engine.logs = []; // Reset logs for new request

        const validatedUserLocation = validateUserLocation(userLocation);

        let intentResult = null;

        // 1. INTENT & SERVICE DETECTION (VISION AGENT OR TEXT FALLBACK)
        if (image) {
            try {
                console.log(`[VISION_ENGINE] Initiating Gemini vision analysis...`);
                engine.emitTrace("Vision Agent", "Thinking...", "Analyzing image and text context together using Gemini Multimodal API...", 98, 0, "info", "pending");
                const startTime = Date.now();
                intentResult = await analyzeImageAndText(message, image);
                const latencyMs = Date.now() - startTime;
                
                engine.emitTrace("Vision Agent", "Vision Analysis Complete", intentResult.reasoning || "Successfully analyzed visual and textual context.", 98, latencyMs, "info", "success", intentResult);
            } catch (err) {
                console.error("[VISION ERROR]:", err);
                engine.emitTrace("Vision Agent", "Vision Analysis Failed", `Fallback to text analysis: ${err.message}`, 0, 0, "warning", "error");
            }
        }

        if (!intentResult) {
            intentResult = await engine.runAgent(
                AGENTS.INTENT_AGENT.name,
                AGENTS.INTENT_AGENT.prompt,
                message
            );
        }
        
        const service = intentResult.service || "AC Technician";
        
        // 2. LOCATION INTELLIGENCE
        const locationResult = await engine.runAgent(
            AGENTS.LOCATION_AGENT.name,
            AGENTS.LOCATION_AGENT.prompt,
            message,
            { intent: intentResult }
        );

        // 3. DISTANCE & ETA ENGINE — experts use fixed Lahore hotspot coordinates
        const localProviders = JSON.parse(JSON.stringify(providers));

        // Filter by service, but if none match, take all (for demo robustness)
        let eligibleProviders = localProviders.filter(p => serviceMatches(service, p.service));
        if (eligibleProviders.length === 0) {
            eligibleProviders = localProviders.slice(0, 3); // Fallback to first 3 experts
        }
        
        const distanceMatrix = await getBulkRoadDistances(validatedUserLocation, eligibleProviders.map(p => ({
            id: p.id,
            lat: expertLocations.get(p.id)?.lat || p.lat,
            lng: expertLocations.get(p.id)?.lng || p.lng
        })));

        // Recalculate and align DISTANCE and ARRIVAL payload metrics for Orchestration Trace
        const traceDistance = {};
        const traceArrival = {};
        eligibleProviders.forEach(p => {
            const roadData = distanceMatrix[p.id];
            if (roadData) {
                traceDistance[p.name] = `${roadData.distanceKm.toFixed(1)} KM`;
                traceArrival[p.name] = `${roadData.durationMins} MIN`;
            } else {
                traceDistance[p.name] = "N/A";
                traceArrival[p.name] = "N/A";
            }
        });

        const distanceLog = await engine.runAgent(
            AGENTS.DISTANCE_AGENT.name,
            AGENTS.DISTANCE_AGENT.prompt,
            `Analyzed ${eligibleProviders.length} providers. Location: ${userLocation ? 'Real' : 'Default'}.`,
            { 
                matrix: distanceMatrix, 
                userLocation: validatedUserLocation,
                DISTANCE: traceDistance,
                ARRIVAL: traceArrival
            }
        );

        // 4. EXPERT RANKING AGENT
        const rankedOptions = await buildRankedOptions(intentResult, eligibleProviders, validatedUserLocation, radius);
        
        const rankingResult = await engine.runAgent(
            AGENTS.RANKING_AGENT.name,
            AGENTS.RANKING_AGENT.prompt,
            `Ranking ${rankedOptions.length} experts for ${service} in ${locationResult.area}.`,
            { 
                intent: intentResult, 
                location: locationResult, 
                ranked_count: rankedOptions.length,
                top_match: rankedOptions[0]?.name 
            }
        );

        // 5. RECOMMENDATION ENGINE
        const recommendationResult = await engine.runAgent(
            AGENTS.RECOMMENDATION_ENGINE.name,
            AGENTS.RECOMMENDATION_ENGINE.prompt,
            `Generating final response for top match: ${rankedOptions[0]?.name}`,
            { top_match: rankedOptions[0], language: intentResult.language }
        );

        // Final Response construction
        const finalData = rankedOptions.length > 0
            ? {
                status: "success",
                options: rankedOptions,
                ai_reasoning: recommendationResult.summary,
                booking: {
                    status: "Awaiting_User",
                    message: recommendationResult.user_message,
                    provider_id: rankedOptions[0]?.id
                }
              }
            : {
                status: "waitlist",
                message: "Maazrat, is waqt is area mein service available nahi hai."
              };

        res.json({
            success: true,
            data: {
                intent: intentResult,
                location: locationResult,
                recommendation: finalData,
                booking: finalData.booking
            },
            logs: engine.getExecutionLogs()
        });

    } catch (error) {
        console.error("[API ERROR]:", error);
        res.status(500).json({
            success: false,
            error: "Something went wrong in AI pipeline",
            details: error.message
        });
    }
});




async function getRoadDistance(origin, destination) {
    const matrix = await getBulkRoadDistances(origin, [{ id: 'single', lat: destination.lat, lng: destination.lng }]);
    return matrix['single'] || null;
}

app.post('/api/booking/create', async (req, res) => {
    const { providerId, clientLocation, service } = req.body;
    const bookingId = `BK-${Date.now()}`;

    const validatedClientLocation = validateUserLocation(clientLocation);

    const baseProvider = providers.find(p => p.id === Number(providerId));
    const provider = baseProvider ? JSON.parse(JSON.stringify(baseProvider)) : null;

    const booking = {
        id: bookingId,
        providerId,
        providerName: provider?.name,
        service,
        clientLocation: validatedClientLocation,
        expertLocation: { lat: provider?.lat, lng: provider?.lng },
        status: "SCHEDULED",
        scheduledTime: null,
        startTime: null,
        arrivalTime: null,
        workStartTime: null,
        completionTime: null,
        timestamp: new Date().toISOString(),
        travelCharges: 0,
        distanceKm: 0,
        etaMinutes: 0
    };

    if (req.body.scheduledTime) {
        booking.scheduledTime = req.body.scheduledTime;
    }

    // Calculate initial distance and charges
    const roadData = await getRoadDistance(booking.expertLocation, validatedClientLocation);
    if (roadData) {
        booking.distanceKm = Number(roadData.distanceKm.toFixed(1));
        booking.etaMinutes = roadData.durationMins;
        booking.travelCharges = Math.max(150, Math.round(booking.distanceKm * FUEL_RATE_PER_KM));
    } else {
        const dist = getDistanceKm(booking.expertLocation, clientLocation);
        booking.distanceKm = Number(dist?.toFixed(1) || 0);
        booking.etaMinutes = Math.round(booking.distanceKm * 4);
        booking.travelCharges = Math.max(150, Math.round(booking.distanceKm * FUEL_RATE_PER_KM));
    }

    activeBookings.set(bookingId, booking);
    
    // Tracking DOES NOT start automatically. 
    // It waits for scheduled time or manual trigger.
    
    res.json({ success: true, bookingId, booking });
});

// Helper for realistic movement interpolation
function interpolate(p1, p2, fraction) {
    return {
        lat: p1.lat + (p2.lat - p1.lat) * fraction,
        lng: p1.lng + (p2.lng - p1.lng) * fraction
    };
}


app.get('/api/booking/:id', (req, res) => {
    const booking = activeBookings.get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, booking });
});

// Socket.IO Events
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    engine.setSocket(socket);

    socket.on('join_booking', (bookingId) => {
        socket.join(bookingId);
        console.log(`Socket ${socket.id} joined booking ${bookingId}`);
    });

    socket.on('update_location', (data) => {
        const { bookingId, expertId, location, speed, heading } = data;
        
        // Update expert location in memory
        if (expertId) {
            expertLocations.set(expertId, location);
        }

        // Update booking if exists
        if (bookingId && activeBookings.has(bookingId)) {
            const booking = activeBookings.get(bookingId);
            booking.expertLocation = location;
            
            // Recalculate ETA and distance
            const distance = getDistanceKm(location, booking.clientLocation);
            if (distance !== null) {
                booking.distanceKm = Number(distance.toFixed(1));
                booking.etaMinutes = Math.max(1, Math.round(distance * 4));
            }

            // Emit to customer in the booking room
            io.to(bookingId).emit('location_changed', {
                location,
                speed,
                heading,
                distanceKm: booking.distanceKm,
                etaMinutes: booking.etaMinutes
            });
        }
    });

    socket.on('update_status', (data) => {
        const { bookingId, status } = data;
        if (activeBookings.has(bookingId)) {
            const booking = activeBookings.get(bookingId);
            booking.status = status;
            
            if (status === "ON_THE_WAY") {
                booking.startTime = new Date().toISOString();
            } else if (status === "WORK_STARTED") {
                booking.workStartTime = new Date().toISOString();
            } else if (status === "COMPLETED") {
                booking.completionTime = new Date().toISOString();
            }

            // Emit status change to customer
            io.to(bookingId).emit('status_changed', { status });
            
            console.log(`Booking ${bookingId} status updated to ${status}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
