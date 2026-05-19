import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock, User, Phone, Home, Sparkles, Award, Wallet, Clock } from "lucide-react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import tw from "twrnc";

const CATEGORIES = ["Plumbing", "Electrician", "AC Repair", "Home Cleaning", "Tutor", "Carpenter", "Painter"];

export default function ExpertRegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("9:00 AM - 6:00 PM");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !experience.trim() ||
      !rate.trim() ||
      !location.trim() ||
      !password
    ) {
      Alert.alert("Required Fields", "Please fill in all expert details.");
      return;
    }

    setLoading(true);
    try {
      // Create user authentication
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = credential.user;

      // Update displayName
      await updateProfile(user, { displayName: name.trim() });

      // Build skills label
      const skillsLabel = `${category}${skills.trim() ? ` — ${skills.trim()}` : ""}`;

      // Save expert details in Firestore (using the exact same structure as the Next.js app)
      await setDoc(doc(db, "experts", user.uid), {
        id: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        skills: skillsLabel,
        category: category,
        location: location.trim(),
        profileImage: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(name.trim())}`,
        experience: experience.trim(),
        rate: Number(rate),
        hours: hours.trim(),
        role: "expert",
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Expert profile registered successfully!", [
        { text: "Go to Dashboard", onPress: () => navigation.replace("ExpertDashboard") },
      ]);
    } catch (error: any) {
      Alert.alert("Onboarding Failed", error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-[#0b0c10]`}
    >
      <LinearGradient colors={["#1f1105", "#0b0c10"]} style={tw`flex-1`}>
        <SafeAreaView style={tw`flex-1`}>
          <ScrollView contentContainerStyle={tw`flex-grow px-6 py-8`}>
            {/* Header */}
            <View style={tw`items-center mb-6`}>
              <View style={tw`w-14 h-14 bg-orange-500/10 rounded-2xl items-center justify-center mb-3 border border-orange-500/30`}>
                <Sparkles size={28} color="#f97316" />
              </View>
              <Text style={tw`text-white text-2xl font-black tracking-tight`}>
                Expert Onboarding
              </Text>
              <Text style={tw`text-gray-400 text-sm mt-1 text-center`}>
                Register your profile to start receiving service bookings
              </Text>
            </View>

            {/* Form Card */}
            <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl mb-8`}>
              {/* Full Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>FULL NAME</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <User size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    placeholderTextColor="#4b5563"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Email Address */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>EMAIL ADDRESS</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Mail size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor="#4b5563"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>WHATSAPP NUMBER</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Phone size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 03001234567"
                    placeholderTextColor="#4b5563"
                    keyboardType="phone-pad"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Service Category */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>PRIMARY SERVICE CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mt-1 mb-2`}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={tw`px-4 py-2.5 rounded-full mr-2 border ${
                        category === cat
                          ? "bg-orange-500 border-orange-500"
                          : "bg-black/40 border-white/10"
                      }`}
                    >
                      <Text style={tw`text-xs font-bold text-white`}>{cat}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Specific Skills */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>SPECIFIC SKILLS (COMMA SEPARATED)</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Award size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={skills}
                    onChangeText={setSkills}
                    placeholder="e.g. Geyser installation, leaks repair"
                    placeholderTextColor="#4b5563"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Experience */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>YEARS OF EXPERIENCE</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Award size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={experience}
                    onChangeText={setExperience}
                    placeholder="e.g. 5 Years"
                    placeholderTextColor="#4b5563"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Hourly Rate */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>HOURLY RATE (PKR)</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Wallet size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    placeholder="e.g. 1500"
                    placeholderTextColor="#4b5563"
                    keyboardType="numeric"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Work Hours */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>WORKING HOURS</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Clock size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={hours}
                    onChangeText={setHours}
                    placeholder="e.g. 9:00 AM - 6:00 PM"
                    placeholderTextColor="#4b5563"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Location */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>OPERATION AREA / CITY</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Home size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. DHA Phase 6, Lahore"
                    placeholderTextColor="#4b5563"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>PASSWORD</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Lock size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#4b5563"
                    secureTextEntry
                    autoCapitalize="none"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={tw`w-full bg-gradient-to-r from-orange-500 to-amber-600 py-4 rounded-2xl font-bold shadow-lg items-center justify-center flex-row gap-2 ${
                  loading ? "opacity-75" : ""
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw`text-white font-bold text-base`}>Register Profile</Text>
                )}
              </Pressable>
            </View>

            {/* Redirect link */}
            <View style={tw`items-center pb-8`}>
              <Text style={tw`text-gray-400 text-sm`}>
                Already have an account?{" "}
                <Text
                  onPress={() => navigation.navigate("Login")}
                  style={tw`text-orange-500 font-bold hover:underline`}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
