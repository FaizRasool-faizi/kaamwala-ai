"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { loginExpert, loginWithGoogle, expertProfileExists } from "@/services/expertAuth";
import { isFirebaseConfigured } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function ExpertLoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  // Already logged in → dashboard
  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace("/expert/dashboard");
    }
  }, [user, authLoading, router]);

  const onSubmit = async (data: LoginData) => {
    if (!firebaseReady) {
      setAuthError("Firebase is not configured. Check client/.env.local");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const firebaseUser = await loginExpert(data.email, data.password);
      const hasProfile = await expertProfileExists(firebaseUser.uid);

      if (!hasProfile) {
        setAuthError("No expert profile found. Please complete registration first.");
        return;
      }

      router.push("/expert/dashboard");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      setAuthError("Firebase is not configured. Check client/.env.local");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const firebaseUser = await loginWithGoogle();
      const hasProfile = await expertProfileExists(firebaseUser.uid);

      if (!hasProfile) {
        router.push("/expert/register");
        return;
      }

      router.push("/expert/dashboard");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">{t("app.name")}</h1>
          <LanguageToggle />
        </div>

        {!isFirebaseConfigured() && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            Firebase keys missing. Copy <code className="text-orange-400">.env.local.example</code> to{" "}
            <code className="text-orange-400">.env.local</code> and add your project credentials.
          </div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{t("auth.login")}</h2>
            <p className="text-gray-400">Welcome back, Expert</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 px-1">{t("auth.email")}</label>
              <div className="relative">
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pl-12 focus:border-orange-500 transition-all outline-none"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between px-1">
                <label className="text-sm font-medium text-gray-400">{t("auth.password")}</label>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="current-password"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pl-12 focus:border-orange-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !firebaseReady}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#141414] px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || !firebaseReady}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Sign-In
          </button>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              {t("auth.noAccount")}{" "}
              <Link href="/expert/register" className="text-orange-500 font-semibold hover:underline">
                Register Now
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
