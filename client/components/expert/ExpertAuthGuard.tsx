"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Redirects unauthenticated users to expert login */
export function ExpertAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseReady) return;
      if (!user) {
        router.replace("/expert/login");
      }
    }
  }, [user, loading, firebaseReady, router]);

  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400 text-sm max-w-md">
          Firebase is not configured. Add your keys to{" "}
          <code className="text-orange-400">client/.env.local</code>.
        </p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
