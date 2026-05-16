import React from "react";
import { Activity, ShieldAlert, Cpu, Users } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/60 backdrop-blur-xl flex flex-col fixed h-full z-40">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white tracking-widest font-mono">
            KAAMWALA<span className="text-purple-500">_ADMIN</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2 font-mono text-sm">
          <a href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 rounded text-white/70 hover:text-white hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-500/30">
            <Activity className="w-4 h-4 text-purple-400" />
            [ SYSTEM_ANALYTICS ]
          </a>
          <a href="/admin/providers" className="flex items-center gap-3 px-3 py-2 rounded text-white/70 hover:text-white hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-500/30">
            <Users className="w-4 h-4 text-blue-400" />
            [ PROVIDER_MONITOR ]
          </a>
          <a href="/admin/disputes" className="flex items-center gap-3 px-3 py-2 rounded text-white/70 hover:text-white hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-500/30">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            [ DISPUTES ]
          </a>
          <a href="/admin/traces" className="flex items-center gap-3 px-3 py-2 rounded text-white/70 hover:text-white hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-500/30">
            <Cpu className="w-4 h-4 text-green-400" />
            [ AI_TRACES ]
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="font-mono text-xs text-green-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            SYSTEM ONLINE - ALL AGENTS OPERATIONAL
          </div>
        </header>
        <main className="flex-1 p-6 font-mono text-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
