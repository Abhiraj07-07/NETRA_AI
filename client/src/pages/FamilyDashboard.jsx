import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Radio, BellRing, MapPin, CheckCircle, Clock, Battery, Wifi, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socketService';
import { audioService } from '../services/audioService';

export default function FamilyDashboard({ onBack }) {
  const [latestLocation, setLatestLocation] = useState(null);
  const [sosEvents, setSosEvents] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [deviceBattery, setDeviceBattery] = useState({ level: 92, isCharging: false });
  const [userName, setUserName] = useState(() => localStorage.getItem('netra_user_name') || 'Rupesh Kushwaha');

  useEffect(() => {
    loadDashboardData();

    // Listen to real-time events via Socket.IO
    socketService.on('location:update', (loc) => {
      setLatestLocation(loc);
    });

    socketService.on('battery:update', (batt) => {
      setDeviceBattery(batt);
    });

    socketService.on('battery:critical', (data) => {
      setDeviceBattery({ level: data.level, isCharging: false });
      if (data.event) {
        setActiveAlert(data.event);
        setSosEvents(prev => [data.event, ...prev]);
        audioService.playTone(880, 0.4);
      }
    });

    socketService.on('sos:alert', (sosEvent) => {
      setActiveAlert(sosEvent);
      setSosEvents(prev => [sosEvent, ...prev]);
      // Play alert chime on guardian screen
      audioService.playTone(880, 0.4);
      setTimeout(() => audioService.playTone(880, 0.4), 500);
    });

    socketService.on('sos:resolved', ({ id }) => {
      setActiveAlert(null);
      setSosEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e));
    });

    return () => {
      // cleanup
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [locRes, sosRes] = await Promise.all([
        api.getLatestLocation(),
        api.getSOSHistory()
      ]);
      if (locRes.success) setLatestLocation(locRes.location);
      if (sosRes.success) {
        setSosEvents(sosRes.history);
        const active = sosRes.history.find(e => e.status === 'active');
        if (active) setActiveAlert(active);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await api.resolveSOS(id);
      setActiveAlert(null);
      loadDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            aria-label="Back to Main View"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-sky-600" />
              Family Guardian Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Authorized real-time safety monitor for {userName}
            </p>
          </div>
        </div>

        {/* Live Guardian Status Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-emerald-800 font-bold">LIVE TELEMETRY SYNC</span>
        </div>
      </div>

      {/* Critical SOS Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-2 border-red-700 rounded-3xl p-6 text-white shadow-xl shadow-red-600/30 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                <BellRing className="w-8 h-8 animate-bounce text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest bg-white/30 text-white px-2.5 py-0.5 rounded-full border border-white/40">
                  {activeAlert.type === 'test' ? 'ROUTINE SYSTEM TEST' : 'EMERGENCY SOS ALERT'}
                </span>
                <h2 className="text-2xl font-black mt-1">
                  {activeAlert.note || 'Panic SOS Activated by User!'}
                </h2>
                <p className="text-xs text-white/90 font-mono mt-0.5">
                  Triggered at {new Date(activeAlert.timestamp).toLocaleTimeString()} • Coordinates: {activeAlert.location?.latitude || '26.8467'}, {activeAlert.location?.longitude || '80.9462'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.google.com/maps?q=${activeAlert.location?.latitude || 26.8467},${activeAlert.location?.longitude || 80.9462}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-white text-slate-900 text-xs font-bold rounded-xl border border-white hover:bg-slate-100 transition-colors shadow-xs"
              >
                Open in Google Maps
              </a>
              <button
                onClick={() => handleResolveAlert(activeAlert.id)}
                className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md"
              >
                Acknowledge & Clear Alert
              </button>
            </div>
          </div>

          {/* 5-Sec Ambient Audio Scene Player */}
          {activeAlert.audioRecording && (
            <div className="mt-3 bg-black/30 p-3 rounded-2xl border border-white/30 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>🎙️ 5-Second Ambient Audio from Emergency Scene:</span>
              </span>
              <audio controls src={activeAlert.audioRecording} className="h-8 max-w-sm rounded-lg" />
            </div>
          )}
        </div>
      )}

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Location & Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-slate-900 text-base">User's Real-time Position</h2>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                latestLocation?.sharingActive 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {latestLocation?.sharingActive ? 'Location Sharing Active' : 'Sharing Paused by User'}
              </span>
            </div>

            {/* Visual Simulated Map Display */}
            <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col justify-between p-4">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:20px_20px]" />
              
              {/* Pulsing Pin */}
              <div className="relative z-10 m-auto flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-sky-200 border-2 border-sky-500 flex items-center justify-center radar-pulse-anim">
                  <div className="w-4 h-4 rounded-full bg-sky-600 shadow-md" />
                </div>
                <div className="mt-2 bg-white border border-slate-300 px-3 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-md">
                  {userName} (Current Location)
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-600 font-mono bg-white/95 p-2 rounded-xl border border-slate-200 font-semibold shadow-xs">
                <span>Lat: {latestLocation?.latitude || 26.8467}° N, Lng: {latestLocation?.longitude || 80.9462}° E</span>
                <span>Accuracy: ±{latestLocation?.accuracy || 8.5}m</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={`https://www.google.com/maps?q=${latestLocation?.latitude || 26.8467},${latestLocation?.longitude || 80.9462}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 text-center transition-colors shadow-xs"
              >
                Directions in Maps
              </a>
              <button
                onClick={() => {
                  socketService.emit('guardian:ping', { timestamp: Date.now() });
                  alert('Safety ping sent to companion device.');
                }}
                className="py-2.5 px-4 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-xl border border-sky-300 text-center transition-colors shadow-xs"
              >
                Send Gentle Haptic Check-in
              </button>
            </div>
          </div>

          {/* Incident & Event History Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Safety Events & Emergency Logs</h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {sosEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${evt.status === 'active' ? 'bg-red-600 animate-ping' : 'bg-emerald-600'}`} />
                      {evt.note}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Type: {evt.type.toUpperCase()} • Time: {new Date(evt.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    evt.status === 'active' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {evt.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Companion Device Health & Contact Details */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider text-xs">
              Companion Device Telemetry
            </h3>

            <div className="space-y-3 text-xs font-medium">
              <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                deviceBattery.level <= 10 && !deviceBattery.isCharging
                  ? 'bg-red-50 border-red-500 animate-pulse text-red-950'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="flex items-center gap-2">
                  <Battery className={`w-4 h-4 ${deviceBattery.level <= 10 ? 'text-red-600' : 'text-emerald-600'}`} />
                  Battery Level
                </span>
                <span className={`font-mono font-bold ${deviceBattery.level <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
                  {deviceBattery.level}% {deviceBattery.isCharging ? '(Charging)' : deviceBattery.level <= 10 ? '(CRITICAL LOW)' : '(On Battery)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-600" />
                  Network Connectivity
                </span>
                <span className="font-mono font-bold text-emerald-700">5G High-Speed</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Heartbeat
                </span>
                <span className="font-mono text-slate-700">Active (12s ago)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3 text-xs text-slate-600 font-medium">
            <h3 className="font-bold text-slate-900 text-sm">Emergency Hotlines</h3>
            <p className="leading-relaxed">
              If an SOS alert is active and the user cannot be reached by phone, contact emergency campus security or local emergency response immediately:
            </p>
            <div className="space-y-2 pt-1 font-mono text-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Campus Helpline:</span>
                <span className="font-bold text-amber-700">0522-2991000</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>National Emergency:</span>
                <span className="font-bold text-red-600">112</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
