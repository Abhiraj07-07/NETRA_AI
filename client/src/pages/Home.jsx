import React, { useEffect } from 'react';
import { Eye, Mic, AlertOctagon, MapPin, AlertTriangle, ShieldCheck, Settings, Headphones, Radio, Volume2 } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function Home({ onSelectPage, activeSOSCount, locationSharingActive }) {
  useEffect(() => {
    speechService.speak("Welcome to NETRA AI. Vision companion is ready. Press 1 for Vision Assistant, 2 for Voice, 3 for Emergency SOS, 4 for Location Sharing, 5 for Hazard Map, 6 for Family Portal.", { minIntervalMs: 8000 });
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Welcome banner - Frosted glass so background illustration shines through */}
      <div className="bg-white/80 hover:bg-white/95 backdrop-blur-md border border-white/90 rounded-3xl p-6 sm:p-8 text-left shadow-md relative overflow-hidden transition-all">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black mb-3 shadow-xs">
            <Headphones className="w-3.5 h-3.5 text-amber-700" />
            AI-Powered Environmental Awareness & Safety Companion
          </div>
          <h1 className="main-heading text-slate-950 mb-3">
            See Beyond • Move Safely • Live Independently
          </h1>
          <p className="body-text text-slate-800 mb-4">
            Combining real-time camera computer vision obstacle detection, directional 3D spatial audio, continuous GPS safety monitoring, and community hazard alerts on your smartphone.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-800 font-bold">
            <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-lg border border-slate-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Keyboard: Keys 1 - 6
            </span>
            <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-lg border border-slate-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Spatial Stereo Cues: Ready
            </span>
            <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-lg border border-slate-300 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${locationSharingActive ? 'bg-emerald-600' : 'bg-slate-500'}`}></span>
              GPS: {locationSharingActive ? 'Live Streaming' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid of Accessible Action Tiles - Frosted glass translucent styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
        {/* Tile 1: Vision Assistant & Smart Assist Suite */}
        <button
          onClick={() => onSelectPage('vision')}
          className="group relative bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-amber-500 focus:border-amber-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left"
          aria-label="Key 1: Start Vision Assistant. Real-time camera obstacle detection, AI scene description, medicine OCR, and color identifier"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform shadow-xs">
              <Eye className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shadow-xs">
              KEY [1]
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-amber-700 transition-colors flex items-center gap-2">
              Vision & Smart Suite
              <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-1.5 py-0.5 rounded">NEW</span>
            </h2>
            <p className="text-sm text-slate-700 font-medium mb-3">
              Obstacle radar with spatial audio, AI multimodal scene description, medicine strip OCR, and clothing colors.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md border border-emerald-200">✨ AI Describe</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-900 rounded-md border border-sky-200">💊 Medicine OCR</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md border border-purple-200">🎨 Colors</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-200">🔦 Torch</span>
            </div>
          </div>
        </button>

        {/* Tile 2: Voice Assistance */}
        <button
          onClick={() => onSelectPage('voice')}
          className="group relative bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-sky-500 focus:border-sky-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left"
          aria-label="Key 2: Voice Assistance. Hands-free speech guidance and voice commands"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 group-hover:scale-110 transition-transform shadow-xs">
              <Mic className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shadow-xs">
              KEY [2]
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-sky-700 transition-colors">
              Voice Guidance
            </h2>
            <p className="text-sm text-slate-700 font-medium">
              Control the app hands-free with speech recognition and configurable audio readouts.
            </p>
          </div>
        </button>

        {/* Tile 3: Panic SOS Alert */}
        <button
          onClick={() => onSelectPage('sos')}
          className={`group relative bg-rose-50/85 hover:bg-rose-50/95 backdrop-blur-md border-2 ${
            activeSOSCount > 0 ? 'border-red-600 animate-pulse bg-red-100' : 'border-rose-300 hover:border-red-500'
          } focus:border-red-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left`}
          aria-label="Key 3: Emergency Panic SOS. Dispatches immediate siren and alerts to family"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-400 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform shadow-xs">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-red-200 text-red-950 px-2.5 py-1 rounded-md border border-red-300">
              KEY [3]
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-red-950 group-hover:text-red-700 transition-colors">
                Panic SOS Alert
              </h2>
              {activeSOSCount > 0 && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm text-red-900 font-medium">
              Immediate siren, location dispatch to trusted contacts, with test & live modes.
            </p>
          </div>
        </button>

        {/* Tile 4: Live GPS Location Sharing */}
        <button
          onClick={() => onSelectPage('location')}
          className="group relative bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-emerald-500 focus:border-emerald-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left"
          aria-label="Key 4: Live GPS Location Sharing. Track and share live coordinates with family"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform shadow-xs">
              <MapPin className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shadow-xs">
              KEY [4]
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-emerald-700 transition-colors">
              Live Location Sharing
            </h2>
            <p className="text-sm text-slate-700 font-medium">
              Real-time GPS coordinate streaming, privacy permissions, and safe route validation.
            </p>
          </div>
        </button>

        {/* Tile 5: Crowd-Sourced Hazard Map */}
        <button
          onClick={() => onSelectPage('hazards')}
          className="group relative bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-amber-500 focus:border-amber-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left"
          aria-label="Key 5: Crowd-sourced Hazard Map. View and report open manholes, trenches and barriers"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shadow-xs">
              KEY [5]
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-amber-700 transition-colors">
              Hazard Community Map
            </h2>
            <p className="text-sm text-slate-700 font-medium">
              Report and receive alerts about open manholes, broken walkways, and construction zones.
            </p>
          </div>
        </button>

        {/* Tile 6: Family Guardian Dashboard */}
        <button
          onClick={() => onSelectPage('family')}
          className="group relative bg-white/80 hover:bg-white/95 backdrop-blur-md border-2 border-white/90 hover:border-sky-500 focus:border-sky-500 focus:outline-none rounded-2xl p-6 transition-all hover:shadow-xl shadow-md flex flex-col justify-between text-left"
          aria-label="Key 6: Parent and Guardian Access Portal. Real-time GPS location tracking, Geofence shield, and remote controls"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 group-hover:scale-110 transition-transform shadow-xs">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shadow-xs">
              KEY [6]
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 mb-1 group-hover:text-sky-700 transition-colors flex items-center gap-2">
              Parent & Guardian Panel
              <span className="text-[10px] bg-sky-200 text-sky-950 font-black px-1.5 py-0.5 rounded">PARENT ACCESS</span>
            </h2>
            <p className="text-sm text-slate-700 font-medium mb-2">
              Real-time live GPS map, campus safe geofence alerts, remote find-me buzzer, and instant emergency alerts.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 bg-sky-100 text-sky-900 rounded-md border border-sky-200">📍 Live GPS Tracking</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md border border-emerald-200">🛡️ Geofence 500m</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-200">🔊 Remote Buzzer</span>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Settings & Audio Test bar */}
      <div className="bg-white/80 hover:bg-white/95 backdrop-blur-md border border-white/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md transition-all">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-bold text-slate-800">Accessibility & Device Preferences</span>
        </div>
        <button
          onClick={() => onSelectPage('settings')}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black border border-slate-300 shadow-xs transition-colors"
          aria-label="Open Settings and Calibration"
        >
          Open Calibration & Settings
        </button>
      </div>
    </div>
  );
}
