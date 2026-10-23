import React from 'react';
import { Eye, Shield, Volume2, VolumeX, Contrast, Radio, Battery, BatteryCharging, BatteryWarning, User } from 'lucide-react';

export default function Navbar({ 
  currentPage, 
  setCurrentPage, 
  highContrast, 
  setHighContrast, 
  isMuted, 
  setIsMuted, 
  activeSOSCount,
  isListening,
  onToggleVoiceCommands,
  batteryState = { level: 95, isCharging: false, isLow: false }
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
              <span className="text-2xl font-logo tracking-wide text-slate-900">NETRA <span className="text-amber-600">AI</span></span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                SPIRIT 3.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Team UNTAMED • Assistive Vision Companion</p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Active SOS Warning Pill */}
          {activeSOSCount > 0 && (
            <button
              onClick={() => setCurrentPage('sos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs animate-pulse shadow-md shadow-red-600/30"
              aria-label="Active SOS Emergency Alert in progress. Click to view."
            >
              <Radio className="w-4 h-4" />
              <span>SOS ACTIVE ({activeSOSCount})</span>
            </button>
          )}

          {/* Battery Status Indicator & Low Battery (<10%) Alert Pill */}
          <button
            onClick={() => setCurrentPage('sos')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              batteryState.level <= 10 && !batteryState.isCharging
                ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-md shadow-red-600/30'
                : batteryState.level <= 20
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={batteryState.level <= 10 ? "CRITICAL: Battery <= 10%! Auto-SOS message dispatched" : `Device Battery: ${batteryState.level}%`}
            aria-label={`Battery level ${batteryState.level} percent`}
          >
            {batteryState.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-600" />
            ) : batteryState.level <= 10 ? (
              <BatteryWarning className="w-4 h-4 text-white animate-bounce" />
            ) : (
              <Battery className="w-4 h-4 text-slate-700" />
            )}
            <span>{batteryState.level}%</span>
          </button>

          {/* Voice Command Mic Pill */}
          <button
            onClick={onToggleVoiceCommands}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isListening 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 animate-pulse font-bold' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle Hands-Free Voice Commands"
            aria-label={isListening ? "Voice commands active, listening" : "Start hands-free voice commands"}
          >
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-600' : 'bg-slate-400'}`} />
            <span>{isListening ? 'Voice Active' : 'Enable Voice'}</span>
          </button>

          {/* Audio Speech Mute / Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
              isMuted 
                ? 'bg-rose-50 text-rose-700 border-rose-300' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={isMuted ? "Audio speech is muted. Click to unmute." : "Mute speech audio"}
            aria-label={isMuted ? "Unmute speech audio" : "Mute speech audio"}
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
            title="Toggle High Contrast for Visually Impaired Navigation"
            aria-label="Toggle High Contrast mode"
          >
            <Contrast className="w-5 h-5" />
          </button>

          {/* Quick Family Guardian Link */}
          <button
            onClick={() => setCurrentPage('family')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              currentPage === 'family' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            aria-label="Switch to Family Guardian Portal"
          >
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Family Portal</span>
          </button>
          {/* User Profile & Settings Link */}
          <button
            onClick={() => setCurrentPage('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              currentPage === 'settings' 
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            aria-label="Edit User Profile and Settings"
            title="User Profile & Settings"
          >
            <User className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
}
