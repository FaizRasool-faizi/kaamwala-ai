"use client";

import React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, className }) => {
  const { language } = useLanguage();
  const { isListening, startListening } = useVoiceToText(onTranscript, language);

  return (
    <button
      type="button"
      onClick={startListening}
      className={`relative p-2 rounded-full transition-all duration-300 ${
        isListening 
          ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
          : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
      } ${className}`}
      title="Speak to fill"
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.div
            key="listening"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center justify-center"
          >
            <Mic className="w-5 h-5 animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <Mic className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
