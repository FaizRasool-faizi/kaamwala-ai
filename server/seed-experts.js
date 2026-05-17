// server/seed-experts.js
require('dotenv').config();
const axios = require('axios');

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "ai-sales-engine-490611";

const expertsToSeed = [
  {
    id: "seed_expert_rizwan",
    name: "Muhammad Rizwan",
    email: "rizwan.ac@kaamwala.ai",
    phone: "03001234561",
    category: "ac",
    skills: "AC Repair, Gas Charging, Compressor Leak Fix",
    rate: "2000",
    hours: "Full Time",
    experience: "6 years",
    bio: "AC repair and installation expert specializing in inverter units and compressor leak fixes.",
    rating: 4.9,
    jobsCompleted: 248,
    reliabilityScore: 99,
    profileImage: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200",
    location: {
      address: "DHA Phase 5, Lahore",
      city: "lahore",
      lat: 31.4684,
      lng: 74.4093
    }
  },
  {
    id: "seed_expert_sajid",
    name: "Sajid Mehmood",
    email: "sajid.plumber@kaamwala.ai",
    phone: "03001234562",
    category: "plumber",
    skills: "Pipe Leaks, Sanitary Installation, Water Pump Repair",
    rate: "1200",
    hours: "Full Time",
    experience: "8 years",
    bio: "Professional plumber offering water leakage detection, pipeline layout installation, and pump repair.",
    rating: 4.7,
    jobsCompleted: 195,
    reliabilityScore: 94,
    profileImage: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200",
    location: {
      address: "Johar Town, Lahore",
      city: "lahore",
      lat: 31.4694,
      lng: 74.2728
    }
  },
  {
    id: "seed_expert_imran",
    name: "Imran Malik",
    email: "imran.carpenter@kaamwala.ai",
    phone: "03001234563",
    category: "carpenter",
    skills: "Furniture Repair, Door Fitting, Polish Work",
    rate: "1800",
    hours: "Flexible Hours",
    experience: "10 years",
    bio: "Expert carpenter. Specializes in custom wood work, furniture structural repairs, and door installations.",
    rating: 4.8,
    jobsCompleted: 312,
    reliabilityScore: 96,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    location: {
      address: "Gulberg III, Lahore",
      city: "lahore",
      lat: 31.5078,
      lng: 74.3395
    }
  },
  {
    id: "seed_expert_zafar",
    name: "Zafar Iqbal",
    email: "zafar.ac@kaamwala.ai",
    phone: "03001234564",
    category: "ac",
    skills: "AC Cleaning, General Service, Thermostat Repair",
    rate: "1500",
    hours: "Full Time",
    experience: "4 years",
    bio: "AC maintenance technician offering split AC washing, general servicing, and electrical connections.",
    rating: 4.6,
    jobsCompleted: 114,
    reliabilityScore: 91,
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    location: {
      address: "Model Town, Lahore",
      city: "lahore",
      lat: 31.4840,
      lng: 74.3250
    }
  },
  {
    id: "seed_expert_yasir",
    name: "Yasir Mahmood",
    email: "yasir.electrician@kaamwala.ai",
    phone: "03001234565",
    category: "electrician",
    skills: "Short Circuit Fix, Wiring, UPS & Solar Installation",
    rate: "1000",
    hours: "Full Time",
    experience: "5 years",
    bio: "Licensed industrial and residential electrician. Expert in short circuit diagnosis, DB dressing, and solar setups.",
    rating: 4.85,
    jobsCompleted: 180,
    reliabilityScore: 97,
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
    location: {
      address: "DHA Phase 3, Lahore",
      city: "lahore",
      lat: 31.4885,
      lng: 74.3920
    }
  }
];

async function seed() {
  console.log(`Seeding experts in Firestore for project: ${projectId}`);
  for (const expert of expertsToSeed) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/experts/${expert.id}`;
    
    // Construct Firestore fields payload
    const payload = {
      fields: {
        id: { stringValue: expert.id },
        name: { stringValue: expert.name },
        email: { stringValue: expert.email },
        phone: { stringValue: expert.phone },
        category: { stringValue: expert.category },
        skills: { stringValue: expert.skills },
        rate: { stringValue: expert.rate },
        hours: { stringValue: expert.hours },
        experience: { stringValue: expert.experience },
        bio: { stringValue: expert.bio },
        rating: { doubleValue: expert.rating },
        jobsCompleted: { integerValue: expert.jobsCompleted },
        reliabilityScore: { integerValue: expert.reliabilityScore },
        profileImage: { stringValue: expert.profileImage },
        status: { stringValue: "Available" },
        location: {
          mapValue: {
            fields: {
              address: { stringValue: expert.location.address },
              city: { stringValue: expert.location.city },
              lat: { doubleValue: expert.location.lat },
              lng: { doubleValue: expert.location.lng }
            }
          }
        }
      }
    };
    
    try {
      // Use PATCH to upsert document (create or overwrite)
      await axios.patch(url, payload);
      console.log(`Successfully seeded: ${expert.name} (${expert.id})`);
    } catch (err) {
      console.error(`Failed to seed ${expert.name}:`, err.response?.data || err.message);
    }
  }
  console.log("Seeding process completed!");
}

seed();
