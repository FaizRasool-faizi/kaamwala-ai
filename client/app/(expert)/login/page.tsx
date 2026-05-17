"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, LogIn, ArrowRight, Github } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRouter } from "next/navigation";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password too short"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function ExpertLoginPage() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      router.push("/expert/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">{t("app.name")}</h1>
          <LanguageToggle />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{t("auth.login")}</h2>
            <p className="text-gray-400">Welcome back, Expert</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 px-1">{t("auth.email")}</label>
              <div className="relative">
                <input
                  {...register("email")}
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
                <a href="#" className="text-xs text-orange-500 hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type="password"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pl-12 focus:border-orange-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 group"
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

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              {t("auth.noAccount")} <Link href="/expert/register" className="text-orange-500 font-semibold hover:underline">Register Now</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
