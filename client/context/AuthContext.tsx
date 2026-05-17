"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getExpertProfile } from "@/services/expertAuth";
import { getUserProfile } from "@/services/userAuth";
import type { ExpertProfile } from "@/types/expert";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  expert: ExpertProfile | null;
  customer: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  refreshExpert: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
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

  const loadCustomer = useCallback(async (uid: string) => {
    try {
      const profile = await getUserProfile(uid);
      setCustomer(profile);
    } catch {
      setCustomer(null);
    }
  }, []);

  const refreshExpert = useCallback(async () => {
    if (user) await loadExpert(user.uid);
  }, [user, loadExpert]);

  const refreshCustomer = useCallback(async () => {
    if (user) await loadCustomer(user.uid);
  }, [user, loadCustomer]);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch profiles in parallel
        try {
          const [expertProfile, customerProfile] = await Promise.all([
            getExpertProfile(firebaseUser.uid),
            getUserProfile(firebaseUser.uid),
          ]);
          setExpert(expertProfile);
          setCustomer(customerProfile);
        } catch {
          setExpert(null);
          setCustomer(null);
        }
      } else {
        setExpert(null);
        setCustomer(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseReady, loadExpert, loadCustomer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        expert,
        customer,
        loading,
        firebaseReady,
        refreshExpert,
        refreshCustomer,
      }}
    >
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

