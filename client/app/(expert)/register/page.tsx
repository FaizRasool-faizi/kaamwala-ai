"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, Phone, Mail, Lock, ShieldCheck, MapPin, 
  Briefcase, Clock, DollarSign, CheckCircle2, 
  ChevronRight, ChevronLeft, Mic, Camera,
  Zap, Wrench, GraduationCap, Home, Paintbrush, Hammer, Car
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { VoiceButton } from "@/components/expert/VoiceButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MapPicker } from "@/components/expert/MapPicker";
import { useRouter } from "next/navigation";

// --- Types & Constants ---

const categories = [
  { id: "electrician", icon: Zap, label: "reg.cat.electrician", color: "bg-yellow-500" },
  { id: "plumber", icon: Wrench, label: "reg.cat.plumber", color: "bg-blue-500" },
  { id: "tutor", icon: GraduationCap, label: "reg.cat.tutor", color: "bg-purple-500" },
  { id: "ac", icon: Zap, label: "reg.cat.ac", color: "bg-cyan-500" },
  { id: "cleaning", icon: Home, label: "reg.cat.cleaning", color: "bg-green-500" },
  { id: "painter", icon: Paintbrush, label: "reg.cat.painter", color: "bg-orange-500" },
  { id: "carpenter", icon: Hammer, label: "reg.cat.carpenter", color: "bg-amber-700" },
  { id: "mechanic", icon: Car, label: "reg.cat.mechanic", color: "bg-red-500" },
];

const registrationSchema = z.object({
  fullName: z.string().min(3, "Name too short"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone"),
  password: z.string().min(6, "Password too short"),
  category: z.string().min(1, "Select a category"),
  address: z.string().min(5, "Address too short"),
  city: z.string().min(2, "City too short"),
  experience: z.string(),
  rate: z.string(),
  hours: z.string(),
});

type RegistrationData = z.infer<typeof registrationSchema>;

// --- Components ---

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-8">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-gradient-to-r from-orange-500 to-red-500"
      />
    </div>
  );
};

export default function RegisterPage() {
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState(0);
  const router = useRouter();
  const stepsCount = 6;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      category: "",
    }
  });

  const selectedCategory = watch("category");

  const onSubmit = (data: RegistrationData) => {
    console.log("Final Submission:", data);
    // Here we would call Firebase
    router.push("/expert/dashboard");
  };

  const nextStep = () => {
    if (step < stepsCount - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t("app.name")}
            </h1>
            <p className="text-gray-400">{t("auth.register")}</p>
          </div>
          <LanguageToggle />
        </div>

        <ProgressBar currentStep={step} totalSteps={stepsCount} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: BASIC INFO */}
            {step === 0 && (
              <motion.div
                key="step1"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                    <User className="w-10 h-10 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-semibold">{t("reg.step1.title")}</h2>
                  <p className="text-gray-400">{t("reg.step1.desc")}</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.name")} / نام</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register("fullName")}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
                          placeholder="John Doe"
                        />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                      <VoiceButton onTranscript={(text) => setValue("fullName", text)} />
                    </div>
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("auth.email")} / ای میل</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register("email")}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
                          placeholder="email@example.com"
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                      <VoiceButton onTranscript={(text) => setValue("email", text.replace(/\s/g, "").toLowerCase())} />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.phone")} / فون نمبر</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register("phone")}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
                          placeholder="0300 1234567"
                        />
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                      <VoiceButton onTranscript={(text) => setValue("phone", text.replace(/\D/g, ""))} />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("auth.password")} / پاس ورڈ</label>
                    <div className="relative">
                      <input
                        {...register("password")}
                        type="password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CATEGORY SELECTION */}
            {step === 1 && (
              <motion.div
                key="step2"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold">{t("reg.step2.title")}</h2>
                  <p className="text-gray-400">{t("reg.step2.desc")}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setValue("category", cat.id)}
                      className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${
                        selectedCategory === cat.id 
                        ? "bg-orange-500/20 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${cat.color} bg-opacity-20`}>
                        <cat.icon className={`w-8 h-8 ${cat.color.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="font-medium text-center">{t(cat.label)}</span>
                      {selectedCategory === cat.id && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-5 h-5 text-orange-500" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: LOCATION */}
            {step === 2 && (
              <motion.div
                key="step3"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold">{t("reg.step3.title")}</h2>
                  <p className="text-gray-400">{t("reg.step3.desc")}</p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.address")}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register("address")}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 outline-none focus:border-orange-500"
                          placeholder="Street, Area, etc."
                        />
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                      <VoiceButton onTranscript={(text) => setValue("address", text)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.city")}</label>
                      <select 
                        {...register("city")}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 appearance-none"
                      >
                        <option value="lahore">Lahore</option>
                        <option value="karachi">Karachi</option>
                        <option value="islamabad">Islamabad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.radius")}</label>
                      <input
                        {...register("rate")}
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="h-80 relative">
                    <MapPicker 
                      onLocationSelect={(loc) => {
                        setValue("address", loc.address);
                        // We could also save lat/lng
                      }} 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SKILLS & DYNAMIC FIELDS */}
            {step === 3 && (
              <motion.div
                key="step4"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold">{t("reg.step4.title")}</h2>
                  <p className="text-gray-400">{selectedCategory} {t("reg.step4.desc")}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.exp")}</label>
                    <div className="flex gap-4">
                      {["1-2", "3-5", "5-10", "10+"].map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setValue("experience", range)}
                          className={`flex-1 py-3 rounded-xl border transition-all ${
                            watch("experience") === range ? "bg-orange-500 border-orange-500" : "bg-white/5 border-white/10"
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Fields based on category */}
                  {selectedCategory === "tutor" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <label className="block text-sm font-medium text-gray-400">Subjects / مضامین</label>
                      <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="Maths, Physics, etc." />
                    </motion.div>
                  )}

                  {selectedCategory === "electrician" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <label className="block text-sm font-medium text-gray-400">Expertise / مہارت</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Wiring", "Solar", "Repair", "Industrial"].map(s => (
                          <button key={s} type="button" className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm">{s}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.skills")}</label>
                    <div className="flex gap-2">
                      <textarea
                        {...register("experience")}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[100px]"
                        placeholder="List your specific skills..."
                      />
                      <VoiceButton onTranscript={(text) => setValue("experience", text)} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: AVAILABILITY & PRICING */}
            {step === 4 && (
              <motion.div
                key="step5"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold">{t("reg.step5.title")}</h2>
                  <p className="text-gray-400">{t("reg.step5.desc")}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.hours")}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" className="p-4 bg-orange-500/20 border border-orange-500 rounded-2xl flex flex-col items-center">
                        <Clock className="w-6 h-6 mb-2 text-orange-500" />
                        <span className="text-sm">Full Time</span>
                      </button>
                      <button type="button" className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center opacity-50">
                        <Clock className="w-6 h-6 mb-2" />
                        <span className="text-sm">Part Time</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t("reg.rate")} (PKR)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register("rate")}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 outline-none focus:border-orange-500"
                          placeholder="e.g. 500"
                        />
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                      <VoiceButton onTranscript={(text) => setValue("rate", text.replace(/\D/g, ""))} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: VERIFICATION & REVIEW */}
            {step === 5 && (
              <motion.div
                key="step6"
                initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold">{t("reg.step6.title")}</h2>
                  <p className="text-gray-400">{t("reg.step6.desc")}</p>
                </div>

                <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center font-bold text-xl">
                      {watch("fullName")?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{watch("fullName")}</h3>
                      <p className="text-orange-500 text-sm">{t(categories.find(c => c.id === selectedCategory)?.label || "")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="text-gray-400">{t("reg.phone")}</div>
                    <div className="text-right">{watch("phone")}</div>
                    <div className="text-gray-400">{t("reg.address")}</div>
                    <div className="text-right">{watch("address")}</div>
                    <div className="text-gray-400">{t("reg.rate")}</div>
                    <div className="text-right">PKR {watch("rate")}</div>
                  </div>

                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-400 mb-3">Upload CNIC / Document</label>
                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-orange-500/50 transition-all cursor-pointer">
                      <Camera className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">Tap to upload your ID card or certifications</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
                {t("common.back")}
              </button>
            )}
            
            {step < stepsCount - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={step === 1 && !selectedCategory}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {t("common.next")}
                <ChevronRight className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <button
                type="submit"
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 font-semibold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {t("common.submit")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
