"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Calendar, Wallet, User as UserIcon, Settings, 
  Bell, Search, TrendingUp, Star, Clock, CheckCircle2,
  MoreVertical, Filter, Download, ArrowUpRight, ArrowDownRight,
  ShieldCheck
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/context/AuthContext";
import { logoutExpert } from "@/services/expertAuth";
import { useRouter } from "next/navigation";

// --- Mock Data ---
const stats = [
  { label: "dash.earnings", value: "PKR 45,200", trend: "+12.5%", isPositive: true, icon: Wallet, color: "text-green-500" },
  { label: "dash.jobs", value: "128", trend: "+8.2%", isPositive: true, icon: CheckCircle2, color: "text-blue-500" },
  { label: "dash.rating", value: "4.9", trend: "0.0%", isPositive: true, icon: Star, color: "text-yellow-500" },
  { label: "Response Time", value: "15 min", trend: "-2.4%", isPositive: true, icon: Clock, color: "text-purple-500" },
];

const recentBookings = [
  { id: "BK-8821", customer: "Ahmed Khan", service: "AC Repair", date: "Today, 2:00 PM", amount: "PKR 2,500", status: "Active" },
  { id: "BK-8819", customer: "Sara Ali", service: "AC Installation", date: "Yesterday", amount: "PKR 5,000", status: "Completed" },
  { id: "BK-8815", customer: "Zainab Bibi", service: "Gas Refill", date: "15 May 2024", amount: "PKR 3,500", status: "Completed" },
];

export default function ExpertDashboard() {
  const { t, isRTL } = useLanguage();
  const { expert, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = async () => {
    await logoutExpert();
    router.push("/expert/login");
  };

  const displayName = expert?.name || user?.displayName || "Expert";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className={`w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col p-6 fixed h-full ${isRTL ? "right-0 border-l" : "left-0"}`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-xl">K</div>
          <span className="text-xl font-bold tracking-tight">KaamWala <span className="text-orange-500">AI</span></span>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "bookings", icon: Calendar, label: "My Bookings" },
            { id: "earnings", icon: Wallet, label: "Earnings" },
            { id: "profile", icon: UserIcon, label: "My Profile" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? "bg-orange-500/10 text-orange-500 font-medium border border-orange-500/20" 
                : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl">
            {expert?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={expert.profileImage} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm">{initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{expert?.category || "Expert"}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <button type="button" onClick={handleLogout} className="w-full text-xs text-gray-400 hover:text-white py-2 rounded-lg hover:bg-white/5 mt-3">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isRTL ? "mr-64" : "ml-64"} p-8`}>
        {/* Top Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-bold">{t("dash.welcome")}, {displayName.split(" ")[0]}!</h2>
            <p className="text-gray-500">Here's what's happening with your services today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 w-64"
                placeholder="Search jobs, customers..."
              />
            </div>
            <button className="p-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-black" />
            </button>
            <LanguageToggle />
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] hover:border-orange-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 group-hover:bg-orange-500/10 transition-all`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">{t(stat.label)}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold">Earnings Overview</h3>
                  <p className="text-sm text-gray-500">Weekly performance</p>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs outline-none">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              
              {/* Fake Visual Chart */}
              <div className="h-64 flex items-end justify-between gap-4 px-2">
                {[45, 60, 35, 85, 40, 75, 95].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className={`w-full rounded-t-xl bg-gradient-to-t from-orange-500/20 to-orange-500 ${i === 6 ? "opacity-100" : "opacity-40"}`}
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{"MTWTFSS"[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">{t("dash.bookings")}</h3>
                <button className="text-sm text-orange-500 hover:underline">View All</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-white/5">
                      <th className="pb-4 font-medium uppercase tracking-wider">Customer</th>
                      <th className="pb-4 font-medium uppercase tracking-wider">Service</th>
                      <th className="pb-4 font-medium uppercase tracking-wider">Date/Time</th>
                      <th className="pb-4 font-medium uppercase tracking-wider">Amount</th>
                      <th className="pb-4 font-medium uppercase tracking-wider">Status</th>
                      <th className="pb-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold">{booking.customer[0]}</div>
                            <span className="text-sm font-medium">{booking.customer}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-gray-400">{booking.service}</td>
                        <td className="py-4 text-sm text-gray-400">{booking.date}</td>
                        <td className="py-4 text-sm font-semibold">{booking.amount}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            booking.status === "Active" ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button className="p-2 hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                <ShieldCheck className="w-24 h-24 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Profile Verification</h3>
              <p className="text-sm text-gray-400 mb-6">Complete your verification to get the trusted expert badge.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">ID Verification</span>
                  <span className="text-green-500 flex items-center gap-1 font-medium">Verified <CheckCircle2 className="w-3 h-3" /></span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Experience Review</span>
                  <span className="text-orange-500 font-medium">In Progress</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-orange-500 h-full w-[65%]" />
                </div>
              </div>
              <button className="w-full mt-8 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all">
                Submit Documents
              </button>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem]">
              <h3 className="text-lg font-bold mb-6">Top Rated Reviews</h3>
              <div className="space-y-6">
                {[1, 2].map((r) => (
                  <div key={r} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 text-yellow-500 fill-yellow-500" />)}
                      </div>
                      <span className="text-[10px] text-gray-500">2 days ago</span>
                    </div>
                    <p className="text-sm text-gray-400">"Excellent service! The AC is working perfectly now. Very professional and arrived on time."</p>
                    <p className="text-xs font-medium">— Hamza Yusuf</p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 text-sm text-gray-500 hover:text-white transition-all">Read all 48 reviews</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
