"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ur";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    "app.name": "Appointix",
    "common.next": "Next",
    "common.back": "Back",
    "common.submit": "Submit",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    
    // Auth
    "auth.login": "Expert Login",
    "auth.register": "Register as Expert",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.noAccount": "Don't have an account?",
    "auth.haveAccount": "Already have an account?",
    "auth.forgotPassword": "Forgot password?",
    "auth.resetPassword": "Reset password",
    "auth.resetPasswordDesc": "Enter your email and we will send you a link to reset your password.",
    "auth.sendResetLink": "Send reset link",
    "auth.resetEmailSent": "Check your inbox for a password reset link.",
    "auth.backToLogin": "Back to login",
    "auth.signIn": "Sign In",
    "auth.continueWithGmail": "Continue with Gmail",
    "auth.orContinueWith": "Or continue with",
    "auth.showPassword": "Show password",
    "auth.hidePassword": "Hide password",
    
    // Registration Steps
    "reg.step1.title": "Basic Information",
    "reg.step1.desc": "Tell us about yourself",
    "reg.name": "Full Name",
    "reg.phone": "Phone Number",
    "reg.cnic": "CNIC (Optional)",
    "reg.profilePic": "Profile Picture",
    
    "reg.step2.title": "Service Category",
    "reg.step2.desc": "What is your profession?",
    "reg.cat.electrician": "Electrician",
    "reg.cat.plumber": "Plumber",
    "reg.cat.tutor": "Tutor",
    "reg.cat.ac": "AC Technician",
    "reg.cat.cleaning": "Home Cleaning",
    "reg.cat.painter": "Painter",
    "reg.cat.carpenter": "Carpenter",
    "reg.cat.mechanic": "Mechanic",
    
    "reg.step3.title": "Location",
    "reg.step3.desc": "Where do you want to work?",
    "reg.address": "Current Address",
    "reg.city": "City",
    "reg.radius": "Service Radius (km)",
    
    "reg.step4.title": "Experience & Skills",
    "reg.step4.desc": "Showcase your expertise",
    "reg.exp": "Years of Experience",
    "reg.skills": "Specific Skills",
    
    "reg.step5.title": "Availability & Pricing",
    "reg.step5.desc": "Set your working hours",
    "reg.hours": "Working Hours",
    "reg.rate": "Expected Rate",
    
    "reg.step6.title": "Verification",
    "reg.step6.desc": "Final review and documents",
    
    // Dashboard
    "dash.welcome": "Welcome back",
    "dash.earnings": "Total Earnings",
    "dash.jobs": "Completed Jobs",
    "dash.rating": "Rating",
    "dash.bookings": "Recent Bookings",
    "dash.status": "Status",
    "dash.action": "Action",
  },
  ur: {
    // General
    "app.name": "کام والا AI",
    "common.next": "اگلا",
    "common.back": "پیچھے",
    "common.submit": "جمع کرائیں",
    "common.loading": "لوڈنگ ہو رہی ہے...",
    "common.error": "کچھ غلط ہو گیا",
    
    // Auth
    "auth.login": "ماہر لاگ ان",
    "auth.register": "ماہر کے طور پر رجسٹر ہوں",
    "auth.email": "ای میل ایڈریس",
    "auth.password": "پاس ورڈ",
    "auth.noAccount": "اکاؤنٹ نہیں ہے؟",
    "auth.haveAccount": "پہلے سے ہی اکاؤنٹ ہے؟",
    "auth.forgotPassword": "پاس ورڈ بھول گئے؟",
    "auth.resetPassword": "پاس ورڈ ری سیٹ کریں",
    "auth.resetPasswordDesc": "اپنا ای میل درج کریں، ہم آپ کو پاس ورڈ ری سیٹ کرنے کا لنک بھیجیں گے۔",
    "auth.sendResetLink": "ری سیٹ لنک بھیجیں",
    "auth.resetEmailSent": "پاس ورڈ ری سیٹ لنک کے لیے اپنا ان باکس چیک کریں۔",
    "auth.backToLogin": "لاگ ان پر واپس",
    "auth.signIn": "سائن ان",
    "auth.continueWithGmail": "Gmail سے جاری رکھیں",
    "auth.orContinueWith": "یا اس کے ساتھ جاری رکھیں",
    "auth.showPassword": "پاس ورڈ دکھائیں",
    "auth.hidePassword": "پاس ورڈ چھپائیں",
    
    // Registration Steps
    "reg.step1.title": "بنیادی معلومات",
    "reg.step1.desc": "اپنے بارے میں بتائیں",
    "reg.name": "پورا نام",
    "reg.phone": "فون نمبر",
    "reg.cnic": "شناختی کارڈ نمبر (اختیاری)",
    "reg.profilePic": "پروفائل تصویر",
    
    "reg.step2.title": "سروس کی قسم",
    "reg.step2.desc": "آپ کا پیشہ کیا ہے؟",
    "reg.cat.electrician": "الیکٹریشن",
    "reg.cat.plumber": "پلمبر",
    "reg.cat.tutor": "ٹیوٹر",
    "reg.cat.ac": "اے سی ٹیکنیشن",
    "reg.cat.cleaning": "گھر کی صفائی",
    "reg.cat.painter": "پینٹر",
    "reg.cat.carpenter": "بڑھئی",
    "reg.cat.mechanic": "مکینک",
    
    "reg.step3.title": "مقام",
    "reg.step3.desc": "آپ کہاں کام کرنا چاہتے ہیں؟",
    "reg.address": "موجودہ پتہ",
    "reg.city": "شہر",
    "reg.radius": "سروس کا دائرہ (کلو میٹر)",
    
    "reg.step4.title": "تجربہ اور مہارت",
    "reg.step4.desc": "اپنی مہارت دکھائیں",
    "reg.exp": "تجربے کے سال",
    "reg.skills": "خاص مہارتیں",
    
    "reg.step5.title": "دستیابی اور قیمت",
    "reg.step5.desc": "اپنے کام کے اوقات مقرر کریں",
    "reg.hours": "کام کے اوقات",
    "reg.rate": "متوقع ریٹ",
    
    "reg.step6.title": "تصدیق",
    "reg.step6.desc": "آخری جائزہ اور دستاویزات",
    
    // Dashboard
    "dash.welcome": "خوش آمدید",
    "dash.earnings": "کل آمدنی",
    "dash.jobs": "مکمل شدہ کام",
    "dash.rating": "درجہ بندی",
    "dash.bookings": "حالیہ بکنگ",
    "dash.status": "صورتحال",
    "dash.action": "عمل",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ur";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
