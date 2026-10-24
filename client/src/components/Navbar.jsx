import React from 'react';
import { Eye, MapPin, Volume2, VolumeX, Contrast, Battery, BatteryCharging, Mic } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function Navbar({ 
  currentPage, 
  setCurrentPage, 
  highContrast, 
  setHighContrast, 
  isMuted, 
  setIsMuted, 
  isListening,
  onToggleVoiceCommands,
  batteryState = { level: 95, isCharging: false }
}) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div 
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-3 cursor-pointer select-none group"
          role="button"
          tabIndex={0}
          aria-label="NETRA AI Home"
          onKeyDown={(e) => e.key === 'Enter' && setCurrentPage('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
            <Eye className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-wide text-slate-900">NETRA <span className="text-amber-600">AI</span></span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                SPIRIT 3.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Obstacle Detection & Live Location</p>
          </div>
        </div>

        {/* Primary Feature Tabs */}
        <div className="flex items-center gap-2">
          {/* Vision Detection Tab */}
          <button
            onClick={() => {
              speechService.speak("Opening Vision Detection");
              setCurrentPage('vision');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 shadow-xs ${
              currentPage === 'vision'
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Obstacle Detection Camera [Key 1]"
            aria-label="Obstacle Detection Camera [Key 1]"
          >
            <Eye className="w-4 h-4" />
            <span>1. Vision Detection</span>
          </button>

          {/* Live Location Tab */}
          <button
            onClick={() => {
              speechService.speak("Opening Live Location Tracker");
              setCurrentPage('location');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 shadow-xs ${
              currentPage === 'location'
                ? 'bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Live GPS Location Tracker [Key 2]"
            aria-label="Live GPS Location Tracker [Key 2]"
          >
            <MapPin className="w-4 h-4" />
            <span>2. Live Location</span>
          </button>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Battery Status */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300"
            title={`Device Battery: ${batteryState.level}%`}
          >
            {batteryState.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-600" />
            ) : (
              <Battery className="w-4 h-4 text-slate-700" />
            )}
            <span>{batteryState.level}%</span>
          </div>

          {/* Voice Command Mic Pill */}
          <button
            onClick={onToggleVoiceCommands}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
              isListening 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 animate-pulse' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle Hands-Free Voice Commands [V key]"
            aria-label="Toggle Voice Commands"
          >
            <Mic className="w-4 h-4" />
            <span>{isListening ? 'Listening' : 'Voice [V]'}</span>
          </button>

          {/* Audio Speech Mute / Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
              isMuted 
                ? 'bg-rose-50 text-rose-700 border-rose-300' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={isMuted ? "Audio is muted. Click to unmute." : "Mute speech audio"}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-600" /> : <Volume2 className="w-5 h-5 text-amber-600" />}
          </button>

          {/* High Contrast Mode Switch */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
              highContrast 
                ? 'bg-black text-yellow-300 border-black font-black' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle High Contrast Mode"
            aria-label="Toggle High Contrast mode"
          >
            <Contrast className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
