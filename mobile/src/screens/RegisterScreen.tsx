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
import { Mail, Lock, User, Phone, Home, Sparkles } from "lucide-react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import tw from "twrnc";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim() || !password) {
      Alert.alert("Required Fields", "Please fill in all details.");
      return;
    }

    setLoading(true);
    try {
      // Create user authentication
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = credential.user;

      // Update displayName
      await updateProfile(user, { displayName: name.trim() });

      // Save customer details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        role: "user",
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Account created successfully!", [
        { text: "Continue", onPress: () => navigation.replace("CustomerDashboard") },
      ]);
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "An error occurred.");
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
          <ScrollView contentContainerStyle={tw`flex-grow justify-center px-6 py-8`}>
            {/* Header */}
            <View style={tw`items-center mb-6`}>
              <View style={tw`w-14 h-14 bg-orange-500/10 rounded-2xl items-center justify-center mb-3 border border-orange-500/30`}>
                <Sparkles size={28} color="#f97316" />
              </View>
              <Text style={tw`text-white text-2xl font-black tracking-tight`}>
                Customer Register
              </Text>
              <Text style={tw`text-gray-400 text-sm mt-1 text-center`}>
                Join as a customer to instantly hire experts
              </Text>
            </View>

            {/* Register Card */}
            <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl`}>
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

              {/* Contact Phone */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>CONTACT NUMBER</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Phone size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +92 300 1234567"
                    placeholderTextColor="#4b5563"
                    keyboardType="phone-pad"
                    style={tw`flex-1 text-white font-medium`}
                  />
                </View>
              </View>

              {/* Address */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>RESIDENTIAL ADDRESS</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3`}>
                  <Home size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="DHA Phase 6, Lahore"
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
                  <Text style={tw`text-white font-bold text-base`}>Create Account</Text>
                )}
              </Pressable>
            </View>

            {/* Redirect link */}
            <View style={tw`mt-6 items-center`}>
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
