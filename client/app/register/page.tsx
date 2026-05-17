"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User as UserIcon, Mail, Lock, Phone, Home, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { registerUser, loginUserWithGoogle, userProfileExists, saveUserDocument } from "@/services/userAuth";
import { isFirebaseConfigured } from "@/lib/firebase";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

const googleCompleteSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

type RegisterData = z.infer<typeof registerSchema>;
type GoogleCompleteData = z.infer<typeof googleCompleteSchema>;

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function UserRegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading, firebaseReady, refreshCustomer } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Google sign in onboarding state
  const [googleOnboardingUser, setGoogleOnboardingUser] = useState<{
    uid: string;
    name: string;
    email: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const {
    register: registerGoogleComp,
    handleSubmit: handleGoogleCompSubmit,
    formState: { errors: googleErrors },
  } = useForm<GoogleCompleteData>({
    resolver: zodResolver(googleCompleteSchema),
  });

  // Redirect if already logged in and has profile
  useEffect(() => {
    if (!authLoading && user && !googleOnboardingUser) {
      router.replace("/");
    }
  }, [user, authLoading, googleOnboardingUser, router]);

  const onSubmit = async (data: RegisterData) => {
    if (!firebaseReady) {
      setAuthError("Firebase is not configured. Check client/.env.local");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        address: data.address,
      });
      
      await refreshCustomer();
      router.push("/");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!firebaseReady) {
      setAuthError("Firebase is not configured. Check client/.env.local");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const firebaseUser = await loginUserWithGoogle();
      const hasProfile = await userProfileExists(firebaseUser.uid);

      if (hasProfile) {
        // If profile exists, log in immediately
        await refreshCustomer();
        router.push("/");
        return;
      }

      // If no profile, start custom onboarding to collect phone & address
      setGoogleOnboardingUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Google sign-up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleOnboardingSubmit = async (data: GoogleCompleteData) => {
    if (!googleOnboardingUser) return;
    
    setIsLoading(true);
    setAuthError(null);

    try {
      await saveUserDocument(googleOnboardingUser.uid, {
        name: googleOnboardingUser.name,
        email: googleOnboardingUser.email,
        phone: data.phone,
        address: data.address,
      });
      
      await refreshCustomer();
      setGoogleOnboardingUser(null);
      router.push("/");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Profile completion failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-tight hover:opacity-80 transition-opacity">
            KaamWala <span className="text-orange-500">AI</span>
          </Link>
          <LanguageToggle />
        </div>

        {!isFirebaseConfigured() && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            Firebase keys missing. Add standard environment configurations inside <code className="text-orange-400">client/.env.local</code>.
          </div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl"
        >
          {googleOnboardingUser ? (
            // Onboarding form for Google users to get phone & address
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Complete Profile</h2>
                <p className="text-gray-400 text-sm">
                  Welcome, <span className="text-white font-semibold">{googleOnboardingUser.name}</span>! Just a couple of details to complete your account registration.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  {authError}
                </div>
              )}

              <form onSubmit={handleGoogleCompSubmit(onGoogleOnboardingSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 px-1">Contact Number</label>
                  <div className="relative">
                    <input
                      {...registerGoogleComp("phone")}
                      type="tel"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. +92 300 1234567"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {googleErrors.phone && <p className="text-red-500 text-xs">{googleErrors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 px-1">Residential Address</label>
                  <div className="relative">
                    <input
                      {...registerGoogleComp("address")}
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. House 45, Street 2, DHA Phase 6, Lahore"
                    />
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {googleErrors.address && <p className="text-red-500 text-xs">{googleErrors.address.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            // Full Registration Form
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold mb-2">Create Customer Account</h2>
                <p className="text-gray-400 text-sm">Join KaamWala AI to hire verified local service experts instantly</p>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading || !firebaseReady}
                className="w-full py-4 rounded-2xl bg-white text-gray-900 border border-white/10 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mb-6 shadow-md"
              >
                <GoogleIcon />
                <span>Sign up with Google</span>
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#141414] px-2 text-gray-500">Or Register with Email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 px-1">User Name</label>
                  <div className="relative">
                    <input
                      {...register("name")}
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. Faiz Rasool"
                    />
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs px-1">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 px-1">Email Address</label>
                  <div className="relative">
                    <input
                      {...register("email")}
                      type="email"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="name@example.com"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs px-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 px-1">Password</label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 pr-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs px-1">{errors.password.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 px-1">Contact Number</label>
                  <div className="relative">
                    <input
                      {...register("phone")}
                      type="tel"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. +92 300 1234567"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs px-1">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 px-1">Residential Address</label>
                  <div className="relative">
                    <input
                      {...register("address")}
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. House 45, Street 2, DHA Phase 6, Lahore"
                    />
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  {errors.address && <p className="text-red-500 text-xs px-1">{errors.address.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !firebaseReady}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
                <p className="text-gray-400 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 font-semibold hover:underline">
                    Login here
                  </Link>
                </p>
                <div className="w-full flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span>Are you a service provider?</span>
                  <Link href="/expert/register" className="text-orange-400 hover:underline font-semibold">
                    Join as Expert
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
