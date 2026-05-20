import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star, ShieldCheck, Clock, SlidersHorizontal, CheckCircle2, MoreVertical, BadgeCheck, Send, MapPin, Bike, Zap } from 'lucide-react';
import { ProviderOption } from '../../store/useOrchestratorStore';

interface ProviderCardProps {
  provider: ProviderOption;
  onBook: (id: string) => void;
  onCompare?: () => void;
  isSelected?: boolean;
  isTopMatch?: boolean;
}

export function ProviderCard({ provider, onBook, onCompare, isSelected, isTopMatch }: ProviderCardProps) {
  const avatarUrl = provider.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(provider.name)}`;
  const isExternal = provider.source === "google_maps";
  const profileHref = isExternal ? provider.mapsUrl || provider.website || "#" : `/expert/${provider.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`relative group overflow-hidden rounded-[24px] border transition-all duration-500 h-full flex flex-col ${
        isSelected 
          ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.15)]' 
        : provider.isBestFit 
            ? 'border-orange-500/40 bg-[#1d1b19]/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:border-orange-500/60' 
            : 'border-white/10 bg-[#111216]/90 hover:border-white/20 hover:bg-[#16171c]'
      } backdrop-blur-xl`}
    >
      {/* Top Gradient for Best Fit */}
      {provider.isBestFit && !isSelected && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent z-20" />
      )}
      
      {/* Image Container */}
      <Link href={profileHref} target={isExternal ? "_blank" : undefined} className="block relative aspect-[4/3] overflow-hidden">
        <img 
          src={avatarUrl} 
          alt={provider.name} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {(isTopMatch || provider.isBestFit) && (
            <motion.span 
              initial={{ scale: 0.9 }}
              animate={{ scale: [0.9, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="backdrop-blur-md bg-green-500/20 border border-green-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-green-400 flex items-center gap-1 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
            >
              <Zap className="h-3 w-3 fill-green-400" /> Top Match
            </motion.span>
          )}
          {isTopMatch && (
            <span className="backdrop-blur-md bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Nearest Expert
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
            <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
            <span className="text-xs font-bold text-white">{provider.rating}</span>
            <span className="text-[10px] text-slate-400">({provider.jobsCompleted})</span>
          </div>
          <div className="backdrop-blur-md bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-bold text-white">
            {provider.priceEstimate}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link href={profileHref} target={isExternal ? "_blank" : undefined} className="min-w-0 flex-1 block group/title">
            <h3 className="flex items-center gap-1.5 text-lg font-bold text-white group-hover/title:text-orange-400 transition-colors truncate">
              {provider.name}
              <BadgeCheck className="h-4 w-4 shrink-0 fill-blue-500 text-white" />
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{provider.specialization}</p>
          </Link>
          <button className="text-slate-500 hover:text-white transition p-1">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Proximity Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
            <MapPin className="h-3.5 w-3.5 text-orange-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Distance</span>
              <span className="text-xs font-bold text-white">{provider.distanceKm} KM</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Arrival</span>
              <span className="text-xs font-bold text-white">{provider.etaMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={() => {
              if (isExternal && provider.mapsUrl) {
                window.open(provider.mapsUrl, "_blank", "noopener,noreferrer");
                return;
              }
              onBook(provider.id);
            }}
            disabled={isSelected}
            className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 ${
              isSelected 
                ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40'
                : 'bg-orange-500 text-black shadow-[0_8px_20px_rgba(249,115,22,0.2)] hover:bg-orange-400 hover:shadow-[0_12px_28px_rgba(249,115,22,0.3)]'
            }`}
          >
            {isExternal ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> View on Maps
              </span>
            ) : isSelected ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Selected
              </span>
            ) : 'Book Now'}
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="p-3 rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white hover:bg-white/10 active:scale-95"
            title="Compare"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {provider.comparisonHighlight && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[10px] leading-relaxed text-slate-400 line-clamp-2 italic">
              "{provider.comparisonHighlight}"
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
