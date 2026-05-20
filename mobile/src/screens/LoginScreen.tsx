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
import { Mail, Lock, User, Briefcase, Sparkles, Eye, EyeOff } from "lucide-react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import tw from "twrnc";

export default function LoginScreen({ navigation }: any) {
  const [role, setRole] = useState<"user" | "expert">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address first to reset your password.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert("Email Sent", "A password reset link has been sent to your email address.");
    } catch (error: any) {
      Alert.alert("Reset Failed", error.message || "Failed to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Required Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // Firebase auth login
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const uid = credential.user.uid;

      // Verify profile in Firestore based on chosen role
      if (role === "user") {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          navigation.replace("CustomerDashboard");
        } else {
          // Fallback check: check if it's an expert instead
          const expertSnap = await getDoc(doc(db, "experts", uid));
          if (expertSnap.exists()) {
            Alert.alert(
              "Account Mismatch",
              "This email is registered as an Expert. Would you like to log in as an Expert?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Switch Role",
                  onPress: () => {
                    setRole("expert");
                  },
                },
              ]
            );
          } else {
            Alert.alert("Account Not Found", "No customer profile exists for this account.");
          }
        }
      } else {
        const docRef = doc(db, "experts", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          navigation.replace("ExpertDashboard");
        } else {
          // Fallback check: check if it's a customer instead
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            Alert.alert(
              "Account Mismatch",
              "This email is registered as a Customer. Would you like to log in as a Customer?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Switch Role",
                  onPress: () => {
                    setRole("user");
                  },
                },
              ]
            );
          } else {
            Alert.alert("Account Not Found", "No expert profile exists for this account.");
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials.");
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
            {/* Header / Brand */}
            <View style={tw`items-center mb-8`}>
              <View style={tw`w-16 h-16 bg-orange-500/10 rounded-3xl items-center justify-center mb-4 border border-orange-500/30`}>
                <Sparkles size={32} color="#f97316" />
              </View>
              <Text style={tw`text-white text-3xl font-black tracking-tight`}>
                KaamWala <Text style={tw`text-orange-500`}>AI</Text>
              </Text>
              <Text style={tw`text-gray-400 text-sm mt-1 text-center`}>
                Instant On-Demand Expert Matching & Dispatch
              </Text>
            </View>

            {/* Form Card */}
            <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl`}>
              <Text style={tw`text-white text-xl font-bold mb-6 text-center`}>
                Sign In to Your Account
              </Text>

              {/* Role Selection */}
              <View style={tw`flex-row bg-black/40 p-1.5 rounded-2xl mb-6`}>
                <Pressable
                  onPress={() => setRole("user")}
                  style={tw`flex-grow flex-row items-center justify-center py-3 rounded-xl gap-2 ${
                    role === "user" ? "bg-orange-500 shadow-md" : ""
                  }`}
                >
                  <User size={16} color={role === "user" ? "#ffffff" : "#9ca3af"} />
                  <Text style={tw`font-bold ${role === "user" ? "text-white" : "text-gray-400"}`}>
                    Customer
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRole("expert")}
                  style={tw`flex-grow flex-row items-center justify-center py-3 rounded-xl gap-2 ${
                    role === "expert" ? "bg-orange-500 shadow-md" : ""
                  }`}
                >
                  <Briefcase size={16} color={role === "expert" ? "#ffffff" : "#9ca3af"} />
                  <Text style={tw`font-bold ${role === "expert" ? "text-white" : "text-gray-400"}`}>
                    Service Expert
                  </Text>
                </Pressable>
              </View>

              {/* Email Input */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>EMAIL ADDRESS</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5`}>
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

              {/* Password Input */}
              <View style={tw`mb-2`}>
                <Text style={tw`text-xs font-semibold text-gray-400 mb-2 px-1`}>PASSWORD</Text>
                <View style={tw`relative flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5`}>
                  <Lock size={20} color="#6b7280" style={tw`mr-3`} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#4b5563"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={tw`flex-1 text-white font-medium`}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#6b7280" />
                    ) : (
                      <Eye size={20} color="#6b7280" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <View style={tw`items-end mb-6 pr-1`}>
                <Pressable onPress={handleForgotPassword} disabled={resetLoading}>
                  <Text style={tw`text-xs font-bold text-orange-500`}>
                    {resetLoading ? "Sending..." : "Forgot Password?"}
                  </Text>
                </Pressable>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={tw`w-full bg-gradient-to-r from-orange-500 to-amber-600 py-4 rounded-2xl font-bold shadow-lg items-center justify-center flex-row gap-2 ${
                  loading ? "opacity-75" : ""
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw`text-white font-bold text-base`}>Sign In</Text>
                )}
              </Pressable>
            </View>

            {/* Footer / Links */}
            <View style={tw`mt-8 items-center`}>
              <Text style={tw`text-gray-400 text-sm`}>
                Don't have an account?{" "}
                <Text
                  onPress={() => {
                    if (role === "user") {
                      navigation.navigate("Register");
                    } else {
                      navigation.navigate("ExpertRegister");
                    }
                  }}
                  style={tw`text-orange-500 font-bold hover:underline`}
                >
                  Register Now
                </Text>
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
