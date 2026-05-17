"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getExpertProfile } from "@/services/expertAuth";
import type { ExpertProfile } from "@/types/expert";

interface AuthContextValue {
  user: User | null;
  expert: ExpertProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  refreshExpert: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseReady = isFirebaseConfigured();

  const loadExpert = useCallback(async (uid: string) => {
    try {
      const profile = await getExpertProfile(uid);
      setExpert(profile);
    } catch {
      setExpert(null);
    }
  }, []);

  const refreshExpert = useCallback(async () => {
    if (user) await loadExpert(user.uid);
  }, [user, loadExpert]);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await loadExpert(firebaseUser.uid);
      } else {
        setExpert(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseReady, loadExpert]);

  return (
    <AuthContext.Provider value={{ user, expert, loading, firebaseReady, refreshExpert }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
