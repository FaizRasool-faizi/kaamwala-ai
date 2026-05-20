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
const bookingReminderTimers = new Map();

const serviceAliases = {
    "AC Technician": ["ac technician", "ac", "air condition", "air conditioner", "cooling", "electrician"],
    "Electrician": ["electrician", "bijli", "electric", "electrition"],
    "Plumber": ["plumber", "plamber", "pipe", "pani", "leak"],
    "Carpenter": ["carpenter", "carpentar", "lakri", "wood"],
    "Home Cleaning": ["cleaning", "cleaner", "safai", "maid", "house cleaning", "home cleaning"],
    "Tutor": ["tutor", "teacher", "tuition", "math teacher", "home tutor"],
    "Painter": ["painter", "paint", "wall paint", "rang"],
    "Mechanic": ["mechanic", "car mechanic", "bike mechanic", "vehicle repair"]
};

const FUEL_RATE_PER_KM = 50; // Configurable Rs/KM
const LAHORE_FALLBACK = { lat: 31.5204, lng: 74.3587 };

function normalizeWhatsAppNumber(phone, defaultCountryCode = "92") {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0") && digits.length === 11) return `${defaultCountryCode}${digits.slice(1)}`;
    if (digits.length === 10 && !digits.startsWith(defaultCountryCode)) return `${defaultCountryCode}${digits}`;
    return digits;
}

function isValidWhatsAppNumber(phone) {
    const normalized = normalizeWhatsAppNumber(phone);
    return /^\d{11,15}$/.test(normalized);
}

function parseTimeSlotDate(scheduledTime) {
    const match = String(scheduledTime || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;

    const now = new Date();
    const slot = new Date(now);
    slot.setHours(hour, minute, 0, 0);
    return slot;
}

function buildBookingMessage({ expertName, customerName, service, scheduledTime, bookingId }) {
    return [
        `Hi ${expertName},`,
        "",
        "I have booked you through Appointix App.",
        "",
        "Booking Details:",
        `- Client: ${customerName}`,
        `- Service: ${service}`,
        `- Time: ${scheduledTime}`,
        `- Booking ID: ${bookingId}`
    ].join("\n");
}

function buildBookingReminderMessage({ expertName, customerName, service, scheduledTime, bookingId }) {
    return [
        `Hi ${expertName},`,
        "",
        "Reminder from Appointix booking.",
        "",
        "Your scheduled booking is in 1 hour.",
        "",
        "Booking Details:",
        `- Client: ${customerName}`,
        `- Service: ${service}`,
        `- Time Slot: ${scheduledTime}`,
        `- Booking ID: ${bookingId}`
    ].join("\n");
}

async function sendWhatsAppTextMessage(phone, text) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

    if (!token || !phoneNumberId) {
        console.warn("[WHATSAPP] Missing credentials. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.");
        return { sent: false, reason: "missing_credentials" };
    }

    const to = normalizeWhatsAppNumber(phone);
    if (!isValidWhatsAppNumber(to)) {
        return { sent: false, reason: "invalid_number" };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    await axios.post(
        url,
        {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text }
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            timeout: 8000
        }
    );

    return { sent: true };
}

function clearBookingReminderTimer(bookingId) {
    const existing = bookingReminderTimers.get(bookingId);
    if (existing) {
        clearTimeout(existing);
        bookingReminderTimers.delete(bookingId);
    }
}

function scheduleOneHourReminder({ bookingId, scheduledTime, expertPhone, providerName, customerName, service }) {
    if (!scheduledTime || !expertPhone) return;

    clearBookingReminderTimer(bookingId);

    const slotDate = parseTimeSlotDate(scheduledTime);
    if (!slotDate) {
        console.warn(`[BOOKING_REMINDER] Invalid scheduledTime for booking ${bookingId}: ${scheduledTime}`);
        return;
    }

    const reminderAtMs = slotDate.getTime() - 60 * 60 * 1000;
    const delayMs = reminderAtMs - Date.now();
    if (delayMs <= 0) {
        console.log(`[BOOKING_REMINDER] Reminder window already passed for booking ${bookingId}.`);
        return;
    }

    const timeoutRef = setTimeout(async () => {
        bookingReminderTimers.delete(bookingId);
        try {
            const reminderText = buildBookingReminderMessage({
                expertName: providerName || "Expert",
                customerName: customerName || "Customer",
                service: service || "Service Request",
                scheduledTime,
                bookingId
            });
            const result = await sendWhatsAppTextMessage(expertPhone, reminderText);
            if (!result.sent) {
                console.warn(`[BOOKING_REMINDER] Reminder not sent for booking ${bookingId}: ${result.reason}`);
            } else {
                console.log(`[BOOKING_REMINDER] Reminder sent for booking ${bookingId}`);
            }
        } catch (err) {
            console.error(`[BOOKING_REMINDER] Failed reminder send for booking ${bookingId}:`, err.message);
        }
    }, delayMs);

    bookingReminderTimers.set(bookingId, timeoutRef);
}

function mapCategoryToService(category) {
    const cat = String(category || "").toLowerCase().trim();
    if (cat === "ac") return "AC Technician";
    if (cat === "electrician") return "Electrician";
    if (cat === "plumber") return "Plumber";
    if (cat === "carpenter") return "Carpenter";
    if (cat === "cleaning") return "Home Cleaning";
    if (cat === "tutor") return "Tutor";
    if (cat === "painter") return "Painter";
    if (cat === "mechanic") return "Mechanic";
    return category ? category.charAt(0).toUpperCase() + category.slice(1) : "AC Technician";
}

async function getRealExperts() {
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || "ai-sales-engine-490611";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/experts`;
        const response = await axios.get(url, { timeout: 4000 });
        const documents = response.data.documents || [];
        
        return documents.map(doc => {
            const fields = doc.fields;
            if (!fields) return null;
            
            const id = fields.id?.stringValue || doc.name.split("/").pop();
            const name = fields.name?.stringValue || "Registered Expert";
            const category = fields.category?.stringValue || "ac";
            const service = mapCategoryToService(category);
            
            let address = "Lahore, Pakistan";
            let lat = LAHORE_FALLBACK.lat;
            let lng = LAHORE_FALLBACK.lng;
            
            if (fields.location?.mapValue?.fields) {
                const locFields = fields.location.mapValue.fields;
                address = locFields.address?.stringValue || address;
                if (locFields.lat?.doubleValue !== undefined) {
                    lat = Number(locFields.lat.doubleValue);
                } else if (locFields.lat?.integerValue !== undefined) {
                    lat = Number(locFields.lat.integerValue);
                }
                if (locFields.lng?.doubleValue !== undefined) {
                    lng = Number(locFields.lng.doubleValue);
                } else if (locFields.lng?.integerValue !== undefined) {
                    lng = Number(locFields.lng.integerValue);
                }
            }
            
            const phone = fields.phone?.stringValue || "";
            const rateVal = fields.rate?.stringValue || "1500";
            
            // Extract rich profile properties from Firestore with sensible defaults
            let rating = 4.7;
            if (fields.rating?.doubleValue !== undefined) rating = Number(fields.rating.doubleValue);
            else if (fields.rating?.integerValue !== undefined) rating = Number(fields.rating.integerValue);

            let jobsCompleted = 120;
            if (fields.jobsCompleted?.integerValue !== undefined) jobsCompleted = Number(fields.jobsCompleted.integerValue);
            else if (fields.jobsCompleted?.doubleValue !== undefined) jobsCompleted = Number(fields.jobsCompleted.doubleValue);

            let reliabilityScore = 95;
            if (fields.reliabilityScore?.integerValue !== undefined) reliabilityScore = Number(fields.reliabilityScore.integerValue);
            else if (fields.reliabilityScore?.doubleValue !== undefined) reliabilityScore = Number(fields.reliabilityScore.doubleValue);

            const profileImage = fields.profileImage?.stringValue || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
            const bio = fields.bio?.stringValue || "Professional technician dedicated to providing outstanding service with top-tier safety and speed.";
            const skills = fields.skills?.stringValue || service;
            const experience = fields.experience?.stringValue || "5 years";
            const hours = fields.hours?.stringValue || "Full Time";
            const status = fields.status?.stringValue || "Available";
            
            return {
                id: id,
                name: name,
                service: service,
                location: address,
                rating: rating,
                status: status,
                lat: lat,
                lng: lng,
                phone: phone,
                reliabilityScore: reliabilityScore,
                jobsCompleted: jobsCompleted,
                rate: rateVal,
                avatarUrl: profileImage,
                skills: skills,
                specialization: skills,
                bio: bio,
                experience: experience,
                hours: hours
            };
        }).filter(Boolean);
    } catch (err) {
        console.error("[FIRESTORE_REST] Failed to fetch real experts:", err.message);
        return [];
    }
}

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

function detectInternalServiceFromText(message) {
    const text = String(message || "").toLowerCase();
    if (!text.trim()) return null;

    return Object.keys(serviceAliases).find((serviceName) => {
        const aliases = [serviceName.toLowerCase(), ...(serviceAliases[serviceName] || [])];
        return aliases.some((alias) => {
            const normalizedAlias = alias.toLowerCase();
            if (normalizedAlias.length <= 3) {
                return new RegExp(`\\b${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
            }
            return text.includes(normalizedAlias);
        });
    }) || null;
}

function hasInternalServiceMatch({ message, service, localProviders }) {
    const rawDetectedService = detectInternalServiceFromText(message);
    if (!rawDetectedService) return false;

    return localProviders.some((provider) =>
        serviceMatches(rawDetectedService, provider.service) ||
        serviceMatches(service, provider.service) ||
        serviceMatches(message, provider.service)
    );
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
        const roadEstimate = haversineDist !== null ? haversineDist * 1.3 : null;
        results[dest.id] = {
            distanceKm: roadEstimate,
            durationMins: roadEstimate !== null ? Math.max(5, Math.round(roadEstimate * 3.5)) : null,
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

function buildMapsSearchQuery(intentData, message) {
    const normalized = String(intentData?.normalized_query || "").trim();
    const service = String(intentData?.service || "").trim();
    const rawMessage = String(message || "").trim();

    if (normalized && !["ac technician", "electrician", "plumber", "carpenter", "cleaner"].includes(normalized.toLowerCase())) {
        return normalized;
    }
    if (rawMessage) return rawMessage;
    return service || "home service";
}

async function fetchGooglePlaceDetails(placeId) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !placeId) return {};

    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
            params: {
                place_id: placeId,
                fields: "formatted_phone_number,international_phone_number,website,opening_hours,url",
                key: apiKey
            },
            timeout: 4000
        });

        if (response.data?.status !== "OK") return {};
        return response.data.result || {};
    } catch (err) {
        console.warn(`[MAPS_DISCOVERY] Place details unavailable for ${placeId}: ${err.message}`);
        return {};
    }
}

async function discoverExternalProvidersFromMaps({ intentData, message, userLocation, radiusKm = 10 }) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("[MAPS_DISCOVERY] Missing GOOGLE_MAPS_API_KEY. Cannot run external provider discovery.");
        return [];
    }

    const location = validateUserLocation(userLocation);
    const keyword = buildMapsSearchQuery(intentData, message);
    const radiusMeters = Math.min(Math.max(Number(radiusKm || 10) * 1000, 1000), 50000);
    const startTime = Date.now();

    engine.emitTrace(
        "Maps Discovery Agent",
        "External Discovery Started",
        `No Appointix expert matched "${keyword}". Searching Google Maps near the customer for available providers.`,
        88,
        0,
        "info",
        "pending"
    );

    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
            params: {
                location: `${location.lat},${location.lng}`,
                radius: radiusMeters,
                keyword,
                key: apiKey
            },
            timeout: 6000
        });

        if (!["OK", "ZERO_RESULTS"].includes(response.data?.status)) {
            console.warn(`[MAPS_DISCOVERY] Nearby search status: ${response.data?.status} ${response.data?.error_message || ""}`);
            return [];
        }

        const places = (response.data.results || []).slice(0, 8);
        if (places.length === 0) return [];

        const baseProviders = places
            .map((place, index) => {
                const lat = place.geometry?.location?.lat;
                const lng = place.geometry?.location?.lng;
                if (typeof lat !== "number" || typeof lng !== "number") return null;

                return {
                    id: `google-${place.place_id}`,
                    placeId: place.place_id,
                    name: place.name || "Nearby Provider",
                    service: intentData?.service || keyword,
                    location: place.vicinity || place.formatted_address || "Nearby",
                    rating: Number(place.rating || 4.2),
                    status: place.opening_hours?.open_now === false ? "Available Later" : "Available",
                    lat,
                    lng,
                    reliabilityScore: Math.min(99, Math.round(Number(place.rating || 4.2) * 18 + 8)),
                    jobsCompleted: Number(place.user_ratings_total || 0),
                    avatarUrl: place.icon || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(place.name || `Provider ${index + 1}`)}`,
                    skills: keyword,
                    specialization: keyword,
                    bio: "Discovered from Google Maps because Appointix does not have this service in its internal expert network yet.",
                    experience: "Google Maps listing",
                    hours: place.opening_hours?.open_now === false ? "May be closed now" : "May be open now",
                    rate: null,
                    source: "google_maps"
                };
            })
            .filter(Boolean);

        const distanceMatrix = await getBulkRoadDistances(location, baseProviders);
        const withDetails = await Promise.all(
            baseProviders.map(async (provider) => {
                const details = await fetchGooglePlaceDetails(provider.placeId);
                const roadData = distanceMatrix[provider.id] || {};
                const distanceKm = typeof roadData.distanceKm === "number"
                    ? Number(roadData.distanceKm.toFixed(1))
                    : Number((getDistanceKm(location, provider) || 0).toFixed(1));

                return {
                    ...provider,
                    phone: details.international_phone_number || details.formatted_phone_number || "",
                    website: details.website,
                    mapsUrl: details.url,
                    distanceKm,
                    etaMinutes: roadData.durationMins || Math.max(5, Math.round(distanceKm * 4)),
                    travelCharges: Math.max(150, Math.round(distanceKm * FUEL_RATE_PER_KM)),
                    calcMethod: roadData.method || "google_places",
                    score: (provider.rating || 4) * 20 + Math.max(0, 40 - distanceKm * 3) + Math.min(15, provider.jobsCompleted / 10)
                };
            })
        );

        const ranked = withDetails
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((provider, index) => ({
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
                badge: index === 0 ? "Nearest External Match" : "Google Maps Match",
                reason: `${provider.rating}★ Google rating • ETA ${provider.etaMinutes}m • ${provider.distanceKm} KM away`,
                reasoning: `${provider.name} was discovered through Google Maps because Appointix has no internal expert for this service yet.`,
                isBestFit: index === 0,
                calcMethod: provider.calcMethod,
                avatarUrl: provider.avatarUrl,
                skills: provider.skills,
                specialization: provider.specialization,
                bio: provider.bio,
                experience: provider.experience,
                hours: provider.hours,
                rate: provider.rate,
                phone: provider.phone,
                priceEstimate: "Contact for quote",
                source: "google_maps",
                mapsUrl: provider.mapsUrl,
                website: provider.website
            }));

        engine.emitTrace(
            "Maps Discovery Agent",
            "External Providers Found",
            `Found ${ranked.length} nearby Google Maps providers for "${keyword}".`,
            ranked.length ? 92 : 30,
            Date.now() - startTime,
            ranked.length ? "info" : "medium",
            ranked.length ? "success" : "warning",
            { keyword, count: ranked.length }
        );

        return ranked;
    } catch (err) {
        engine.emitTrace(
            "Maps Discovery Agent",
            "External Discovery Failed",
            `Google Maps provider discovery failed: ${err.message}`,
            0,
            Date.now() - startTime,
            "high",
            "error"
        );
        return [];
    }
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
                calcMethod: provider.calcMethod,
                
                // Add rich database fields
                avatarUrl: provider.avatarUrl,
                skills: provider.skills,
                specialization: provider.specialization,
                bio: provider.bio,
                experience: provider.experience,
                hours: provider.hours,
                rate: provider.rate,
                phone: provider.phone,
                priceEstimate: provider.rate ? `PKR ${Number(provider.rate).toLocaleString()}` : "PKR 1,500"
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
        
        const rawDetectedService = detectInternalServiceFromText(message);
        const service = rawDetectedService || intentResult.service || String(message || "home service");
        
        // 2. LOCATION INTELLIGENCE
        const locationResult = await engine.runAgent(
            AGENTS.LOCATION_AGENT.name,
            AGENTS.LOCATION_AGENT.prompt,
            message,
            { intent: intentResult }
        );

        // 3. DISTANCE & ETA ENGINE — experts use fixed Lahore hotspot coordinates
        const realExperts = await getRealExperts();
        const localProviders = realExperts;

        // Filter by service. If the raw user query does not match an Appointix
        // internal service, hand off to Maps Discovery Agent instead of trusting
        // the LLM to force unknown services into AC/Plumber/etc.
        const hasInternalMatch = hasInternalServiceMatch({ message, service, localProviders });
        let eligibleProviders = hasInternalMatch
            ? localProviders.filter(p =>
                serviceMatches(service, p.service) ||
                serviceMatches(rawDetectedService, p.service) ||
                serviceMatches(message, p.service)
            )
            : [];

        if (!hasInternalMatch || eligibleProviders.length === 0) {
            const mapsOptions = await discoverExternalProvidersFromMaps({
                intentData: {
                    ...intentResult,
                    service: rawDetectedService || intentResult.service || String(message || "home service"),
                    normalized_query: intentResult.normalized_query || message
                },
                message,
                userLocation: validatedUserLocation,
                radiusKm: radius || 10
            });

            const mapsMessage = mapsOptions.length > 0
                ? `Appointix ke internal experts mein ye service abhi available nahi thi, is liye maine Google Maps se aap ke qareeb ${mapsOptions.length} providers dhoond liye hain.`
                : "Maazrat, Appointix aur Google Maps dono se is waqt is service ke nearby providers nahi mil sake. Backend par GOOGLE_MAPS_API_KEY aur Places API enabled honi chahiye.";

            const finalData = mapsOptions.length > 0
                ? {
                    status: "external_discovery",
                    options: mapsOptions,
                    ai_reasoning: `No internal Appointix expert matched "${service}". Maps Discovery Agent found ${mapsOptions.length} nearby providers.`,
                    booking: {
                        status: "External_Provider_Discovered",
                        message: mapsMessage,
                        provider_id: mapsOptions[0]?.id
                    }
                  }
                : {
                    status: "waitlist",
                    options: [],
                    ai_reasoning: "No internal or external provider found for this request.",
                    booking: {
                        status: "Unavailable",
                        message: mapsMessage,
                        provider_id: null
                    }
                  };

            return res.json({
                success: true,
                data: {
                    intent: intentResult,
                    location: locationResult,
                    recommendation: finalData,
                    booking: finalData.booking,
                    discovery: {
                        source: mapsOptions.length > 0 ? "google_maps" : "unavailable",
                        internalMatch: false,
                        query: message
                    }
                },
                logs: engine.getExecutionLogs()
            });
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
            if (roadData && roadData.distanceKm !== null) {
                traceDistance[p.name] = `${roadData.distanceKm.toFixed(1)} KM`;
                traceArrival[p.name] = roadData.durationMins !== null ? `${roadData.durationMins} MIN` : "N/A";
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
                booking: finalData.booking,
                discovery: {
                    source: "appointix",
                    internalMatch: true,
                    query: message
                }
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
    const { providerId, clientLocation, service, customerName } = req.body;
    const bookingId = `BK-${Date.now()}`;

    const validatedClientLocation = validateUserLocation(clientLocation);

    const realExperts = await getRealExperts();
    const allProviders = realExperts;
    const baseProvider = allProviders.find(p => String(p.id) === String(providerId));
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
    if (roadData && roadData.distanceKm !== null) {
        booking.distanceKm = Number(roadData.distanceKm.toFixed(1));
        booking.etaMinutes = roadData.durationMins || 0;
        booking.travelCharges = Math.max(150, Math.round(booking.distanceKm * FUEL_RATE_PER_KM));
    } else {
        const dist = getDistanceKm(booking.expertLocation, clientLocation);
        booking.distanceKm = Number(dist?.toFixed(1) || 0);
        booking.etaMinutes = Math.round(booking.distanceKm * 4);
        booking.travelCharges = Math.max(150, Math.round(booking.distanceKm * FUEL_RATE_PER_KM));
    }

    activeBookings.set(bookingId, booking);

    // Fully automated WhatsApp notifications to expert:
    // 1) immediate booking message
    // 2) one-hour-before reminder
    const expertPhone = provider?.phone || "";
    const safeCustomerName = customerName || "Customer";
    if (isValidWhatsAppNumber(expertPhone)) {
        try {
            const bookingMessage = buildBookingMessage({
                expertName: provider?.name || "Expert",
                customerName: safeCustomerName,
                service: service || "Service Request",
                scheduledTime: booking.scheduledTime || "As soon as possible",
                bookingId
            });
            const sendResult = await sendWhatsAppTextMessage(expertPhone, bookingMessage);
            if (!sendResult.sent) {
                console.warn(`[BOOKING_MESSAGE] Initial message not sent for booking ${bookingId}: ${sendResult.reason}`);
            } else {
                console.log(`[BOOKING_MESSAGE] Initial message sent for booking ${bookingId}`);
            }

            if (booking.scheduledTime) {
                scheduleOneHourReminder({
                    bookingId,
                    scheduledTime: booking.scheduledTime,
                    expertPhone,
                    providerName: provider?.name,
                    customerName: safeCustomerName,
                    service: service || "Service Request"
                });
            }
        } catch (err) {
            console.error(`[BOOKING_MESSAGE] Failed automated message flow for booking ${bookingId}:`, err.message);
        }
    } else {
        console.warn(`[BOOKING_MESSAGE] Expert phone invalid for booking ${bookingId}, skipping automation.`);
    }
    
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

app.post('/api/chat/moderate', async (req, res) => {
    const { message, violationsCount } = req.body;
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.json({ inappropriate: false, warning: null, restricted: false });
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are a professional chat moderation AI agent for the "Appointix" home service marketplace.
        Analyze the following chat message between a user and a service expert:
        "${message}"
        
        Your task is to detect inappropriate, abusive, offensive, vulgar, sexual, disrespectful, or "below the belt" language in English, Urdu, or Roman Urdu.
        
        Respond ONLY with a JSON object in this format:
        {
            "inappropriate": true or false,
            "reason": "Brief reason in English if inappropriate, otherwise null",
            "warningMessage": "Please maintain respectful communication"
        }
        `;
        
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        const cleanJsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const analysis = JSON.parse(cleanJsonText);
        
        const isViolated = analysis.inappropriate === true;
        
        res.json({
            success: true,
            inappropriate: isViolated,
            reason: analysis.reason || null,
            warning: isViolated ? (analysis.warningMessage || "Please maintain respectful communication") : null,
            restricted: isViolated && Number(violationsCount) >= 1 // Restrict if this is the 2nd violation (violationsCount starts at 1 from first violation)
        });
    } catch (err) {
        console.error("Moderation Error:", err.message);
        res.json({ success: true, inappropriate: false, warning: null, restricted: false });
    }
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
                clearBookingReminderTimer(bookingId);
            } else if (status === "CANCELLED") {
                clearBookingReminderTimer(bookingId);
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
