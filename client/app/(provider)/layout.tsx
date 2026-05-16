import React from "react";
import { Briefcase, Calendar, DollarSign, Star, LayoutDashboard } from "lucide-react";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col fixed h-full z-40">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-orange to-amber-500">
            Provider <span className="text-white">Portal</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <LayoutDashboard className="w-5 h-5 text-neon-orange" />
            Dashboard
          </a>
          <a href="/jobs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Active Jobs
          </a>
          <a href="/schedule" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Schedule
          </a>
          <a href="/earnings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            Earnings
          </a>
          <a href="/reputation" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <Star className="w-5 h-5 text-purple-400" />
            Reputation
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-end px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">Status: <span className="text-emerald-400 font-medium">Available</span></span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-orange to-purple-600 border border-white/20"></div>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
