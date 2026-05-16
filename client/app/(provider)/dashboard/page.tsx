import React from "react";
import { Activity, DollarSign, Users, Star } from "lucide-react";

export default function ProviderDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-semibold">Today Earnings</h3>
          </div>
          <p className="text-3xl font-bold text-white">Rs. 4,500</p>
          <p className="text-xs text-emerald-500 mt-2">+12% vs last week</p>
        </div>
        
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Activity className="w-5 h-5" />
            <h3 className="font-semibold">Active Jobs</h3>
          </div>
          <p className="text-3xl font-bold text-white">2</p>
          <p className="text-xs text-blue-500 mt-2">1 pending confirmation</p>
        </div>
        
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-purple-400 mb-2">
            <Star className="w-5 h-5" />
            <h3 className="font-semibold">Rating</h3>
          </div>
          <p className="text-3xl font-bold text-white">4.8</p>
          <p className="text-xs text-purple-500 mt-2">Based on 145 reviews</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-orange-400 mb-2">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">Profile Views</h3>
          </div>
          <p className="text-3xl font-bold text-white">124</p>
          <p className="text-xs text-orange-500 mt-2">This week</p>
        </div>
      </div>
      
      {/* Recent Jobs List */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Requests</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-white/5 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Fix AC cooling issue</p>
                <p className="text-sm text-slate-400">Gulberg III, Lahore • 2.5 km away</p>
              </div>
              <div className="text-right">
                <p className="text-orange-400 font-bold">Rs. 1,500</p>
                <button className="mt-2 px-4 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors shadow-[0_0_10px_rgba(234,88,12,0.3)]">
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
