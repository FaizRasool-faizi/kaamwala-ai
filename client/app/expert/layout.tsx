"use client";

import { AuthProvider } from "@/context/AuthContext";

/** Expert routes: auth session + Firebase context */
export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
