"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Languages } from "lucide-react";

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "ur" : "en")}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all text-sm font-medium text-white"
    >
      <Languages className="w-4 h-4" />
      <span>{language === "en" ? "اردو" : "English"}</span>
    </button>
  );
};
