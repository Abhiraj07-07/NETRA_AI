import React, { useEffect } from 'react';
import { Eye, MapPin, Mic, Radio, Volume2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function Home({ onSelectPage, locationSharingActive = true }) {
  useEffect(() => {
    speechService.speak(
      "Welcome to NETRA AI. Press 1 for Vision and Obstacle Detection. Press 2 for Live Location Tracking. Or say Start to begin walking.",
      { minIntervalMs: 8000 }
    );
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left">
      {/* Hero Welcome banner */}
      <div className="bg-white/80 hover:bg-white/95 backdrop-blur-md border border-white/90 rounded-3xl p-6 sm:p-8 text-left shadow-md relative overflow-hidden transition-all">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            Assistive Vision & Autonomous Navigation Companion
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 mb-2">
            See Beyond • Move Safely • Live Independently
          </h1>
          <p className="text-sm text-slate-700 font-medium mb-4">
            Real-time camera obstacle detection with spoken bilingual warnings, and continuous live GPS location tracking for your safety.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-800 font-bold">
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Key [1]: Vision Detection
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              Key [2]: Live Location
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
              <span className={`w-2 h-2 rounded-full ${locationSharingActive ? 'bg-emerald-600' : 'bg-slate-500'}`}></span>
              GPS: {locationSharingActive ? 'Broadcasting' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary One-Touch Walking Starter Button */}
      <button
        onClick={() => {
          speechService.startListening();
          speechService.speak("Starting NETRA walking guide. Camera and obstacle detection active.", { priority: true });
          onSelectPage('vision');
        }}
        className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-3xl p-6 shadow-xl border-2 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-emerald-400"
        aria-label="Start Walking Guide and Obstacle Radar Now. Or speak Start"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
            <Mic className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                One-Touch Walking Guide
              </span>
              <span className="text-[11px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                VOICE: SAY "START" OR "WALK"
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Start Walking Companion & Obstacle Radar 🚶
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-0.5">
              टैप करें या 'Start' बोलें — कैमरा रास्ते की सभी रुकावटें देखकर तुरंत आवाज़ में बताएगा
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-900 font-black text-sm shadow-md shrink-0">
          <span>START NOW ⚡</span>
        </div>
      </button>

      {/* The 2 Core Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
        {/* Core Card 1: Vision & Obstacle Detection */}
        <button
          onClick={() => {
            speechService.speak("Opening Vision and Obstacle Detection", { priority: true });
            onSelectPage('vision');
          }}
          className="group bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-amber-500 rounded-3xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left min-h-[220px]"
          aria-label="Key 1: Vision and Obstacle Detection"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
                <Eye className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono font-black bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-300">
                KEY [1]
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-amber-700 transition-colors">
              Vision & Obstacle Detection
            </h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Live smartphone camera scanner. Detects persons, chairs, vehicles, and pathways with spoken distance warnings in Hindi & English.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 text-xs font-bold text-amber-700">
            <span>Open Detection Camera</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Core Card 2: Live GPS Location Tracking */}
        <button
          onClick={() => {
            speechService.speak("Opening Live Location Tracking", { priority: true });
            onSelectPage('location');
          }}
          className="group bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-sky-500 rounded-3xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left min-h-[220px]"
          aria-label="Key 2: Live GPS Location Tracking"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 group-hover:scale-105 transition-transform">
                <MapPin className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono font-black bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-300">
                KEY [2]
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-sky-700 transition-colors">
              Live GPS Location Tracker
            </h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Real-time satellite GPS tracking with live visual radar, spoken location readout, 1-tap WhatsApp sharing, and instant SOS beacon.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 text-xs font-bold text-sky-700">
            <span>Open Live Tracker</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}
