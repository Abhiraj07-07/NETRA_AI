import React, { useState, useEffect } from 'react';
import { 
  Shield, ArrowLeft, Radio, BellRing, MapPin, CheckCircle, Clock, 
  Battery, Wifi, AlertTriangle, Volume2, PhoneCall, Send, RefreshCw, 
  Navigation, Compass, AlertOctagon, ShieldAlert, ShieldCheck, UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socketService';
import { audioService } from '../services/audioService';

export default function FamilyDashboard({ onBack }) {
  const [latestLocation, setLatestLocation] = useState({
    latitude: 26.8467,
    longitude: 80.9462,
    accuracy: 6.2,
    speed: 1.2,
    heading: 68,
    address: 'DSMNRU Campus Main Gate, Mohaan Road, Lucknow',
    sharingActive: true,
    lastUpdated: new Date().toISOString()
  });

  const [sosEvents, setSosEvents] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [deviceBattery, setDeviceBattery] = useState({ level: 92, isCharging: false });
  const [userName] = useState(() => localStorage.getItem('netra_user_name') || 'Rupesh Kushwaha');
  
  // Geofence configuration (Campus Safe Zone)
  const safeZone = {
    lat: 26.8467,
    lng: 80.9462,
    radiusMeters: 500,
    name: 'DSMNRU Campus & Hostel Safe Perimeter'
  };

  // Remote parent messaging
  const [customVoiceMsg, setCustomVoiceMsg] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [isBuzzerRinging, setIsBuzzerRinging] = useState(false);

  // Movement Trail Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState([
    { time: '10:45 AM', label: 'Main Academic Block Corridor', lat: 26.8465, lng: 80.9458 },
    { time: '10:52 AM', label: 'Tactile Paving near Library Ramp', lat: 26.8469, lng: 80.9461 },
    { time: 'Just now', label: 'DSMNRU Campus Main Gate', lat: 26.8467, lng: 80.9462 }
  ]);

  // Calculate distance to safe zone center
  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const distanceToSafeCenter = calculateDistanceMeters(
    latestLocation.latitude,
    latestLocation.longitude,
    safeZone.lat,
    safeZone.lng
  );

  const isInsideSafeZone = distanceToSafeCenter <= safeZone.radiusMeters;

  useEffect(() => {
    loadDashboardData();

    // Listen to real-time events via Socket.IO
    socketService.on('location:update', (loc) => {
      if (loc) {
        setLatestLocation(prev => ({ ...prev, ...loc }));
        setBreadcrumbs(prev => [
          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), label: loc.address || 'Updated GPS Coordinate', lat: loc.latitude, lng: loc.longitude },
          ...prev.slice(0, 4)
        ]);
      }
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
      // Play audible siren beep on guardian screen
      audioService.playTone(880, 0.4);
      setTimeout(() => audioService.playTone(980, 0.4), 300);
      setTimeout(() => audioService.playTone(1100, 0.4), 600);
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
      if (locRes.success && locRes.location) {
        setLatestLocation(prev => ({ ...prev, ...locRes.location }));
      }
      if (sosRes.success && sosRes.history) {
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

  // 1. Remote Buzzer Ring (Find My Companion)
  const triggerRemoteBuzzer = () => {
    setIsBuzzerRinging(true);
    socketService.emit('guardian:ring-buzzer', { duration: 4000 });
    setActionFeedback('🔊 High-pitch buzzer triggered on user device.');
    setTimeout(() => {
      setIsBuzzerRinging(false);
      setActionFeedback('');
    }, 4500);
  };

  // 2. Remote Voice Message
  const sendVoiceMessageToUser = (msgText) => {
    const textToSend = msgText || customVoiceMsg;
    if (!textToSend.trim()) return;

    socketService.emit('guardian:voice-message', { text: textToSend });
    setActionFeedback(`🎙️ Message dispatched to ${userName}: "${textToSend}"`);
    setCustomVoiceMsg('');
    setTimeout(() => setActionFeedback(''), 4000);
  };

  // 3. Force Instant GPS Refresh
  const requestInstantGPS = () => {
    socketService.emit('guardian:request-location');
    setActionFeedback('📍 Requested live GPS satellite ping from device...');
    setTimeout(() => setActionFeedback(''), 3000);
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            aria-label="Back to Main View"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-100 text-sky-700">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                Parent & Guardian Access Portal
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              माता-पिता / अभिभावक सुरक्षा पैनल • Live Telemetry & Control for <strong className="text-slate-900">{userName}</strong> (Visually Impaired User)
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-800 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>SOCKET LIVE</span>
          </span>
          <span className="flex items-center gap-1.5 bg-sky-50 border border-sky-300 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-sky-800 shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>PARENT ACCESS</span>
          </span>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="bg-sky-900 text-white text-xs font-mono font-bold px-4 py-2.5 rounded-2xl border border-sky-700 shadow-md animate-fadeIn flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback('')} className="text-sky-300 hover:text-white ml-2 text-sm">✕</button>
        </div>
      )}

      {/* Critical SOS Alert Banner (If Active) */}
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

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:+919876543210`}
                className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl border border-white hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                Call User
              </a>
              <a
                href={`https://www.google.com/maps?q=${activeAlert.location?.latitude || 26.8467},${activeAlert.location?.longitude || 80.9462}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors shadow-xs"
              >
                Open Google Maps
              </a>
              <button
                onClick={() => handleResolveAlert(activeAlert.id)}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md"
              >
                Acknowledge & Clear
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Location & Interactive GPS Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-slate-900 text-base">
                  Real-time GPS Tracking & Geofence
                </h2>
              </div>
              <button
                onClick={requestInstantGPS}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Force refresh companion device GPS"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                <span>Ping GPS Now</span>
              </button>
            </div>

            {/* Geofence Alert Status Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              isInsideSafeZone 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-400 text-rose-950 animate-pulse'
            }`}>
              <div className="flex items-center gap-2.5">
                {isInsideSafeZone ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="block font-black">
                    {isInsideSafeZone ? 'SAFE ZONE ACTIVE: User is Protected' : '⚠️ GEOFENCE WARNING: User Outside Safe Zone!'}
                  </span>
                  <span className="text-[11px] font-normal opacity-90 block">
                    {safeZone.name} ({safeZone.radiusMeters}m radius) • Current Distance: <strong className="font-mono">{distanceToSafeCenter}m</strong> from center
                  </span>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono font-bold ${
                isInsideSafeZone ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-950'
              }`}>
                {isInsideSafeZone ? 'IN BOUNDS' : 'OUT OF BOUNDS'}
              </span>
            </div>

            {/* Visual Simulated Map Display */}
            <div className="h-72 bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
              {/* Radar Grid Backdrop */}
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
              
              {/* Geofence Circular Boundary Ring */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full border border-sky-400/30 bg-sky-500/5 animate-pulse" />
              </div>

              {/* Pulsing User Pin */}
              <div className="relative z-10 m-auto flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center radar-pulse-anim">
                  <div className="w-5 h-5 rounded-full bg-sky-400 shadow-lg shadow-sky-400/50 flex items-center justify-center text-[10px] text-slate-950 font-bold">
                    👤
                  </div>
                </div>
                <div className="mt-2 bg-white/95 text-slate-950 px-3 py-1 rounded-xl text-xs font-black shadow-xl border border-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{userName} (Live Moving)</span>
                </div>
              </div>

              {/* Bottom Map Telemetry Overlay */}
              <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-white/90 font-mono bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 font-bold shadow-md gap-2">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Lat: {latestLocation.latitude}° N, Lng: {latestLocation.longitude}° E
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Navigation className="w-3.5 h-3.5" />
                  Speed: {latestLocation.speed} km/h • Heading: {latestLocation.heading}°
                </span>
                <span className="text-slate-300">
                  Accuracy: ±{latestLocation.accuracy}m
                </span>
              </div>
            </div>

            {/* Current Landmark Address */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Current Landmark & Address
                </span>
                <span className="font-bold text-slate-900">
                  {latestLocation.address}
                </span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${latestLocation.latitude},${latestLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span>Navigate to User</span>
              </a>
            </div>

            {/* Breadcrumb Trail of Today's Movement */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                Recent Movement Breadcrumbs (आज की लोकेशन हिस्ट्री)
              </span>
              <div className="space-y-1.5">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {crumb.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 font-bold">{crumb.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Incident & Event History Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Safety Events & Emergency Logs</h3>
              <span className="text-xs text-slate-500 font-mono">Last 24 Hours</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {sosEvents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">
                  No emergency alerts recorded. User is safe.
                </div>
              ) : (
                sosEvents.map(evt => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${evt.status === 'active' ? 'bg-red-600 animate-ping' : 'bg-emerald-600'}`} />
                        {evt.note}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">
                        Type: {evt.type.toUpperCase()} • Time: {new Date(evt.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      evt.status === 'active' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {evt.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Remote Controls, Telemetry & Emergency Actions */}
        <div className="space-y-6">
          {/* Remote Guardian Controls Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Remote Companion Controls
                </h3>
                <p className="text-[11px] text-slate-400">
                  Direct commands to {userName}'s phone
                </p>
              </div>
            </div>

            {/* Remote Buzzer Button */}
            <div>
              <button
                onClick={triggerRemoteBuzzer}
                disabled={isBuzzerRinging}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  isBuzzerRinging
                    ? 'bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isBuzzerRinging ? 'Ringing Buzzer Now...' : 'Ring Find-Me Loud Buzzer'}</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Sounds a loud 1200Hz alarm on user's phone to locate them in a crowd.
              </p>
            </div>

            {/* Send Quick Voice Message */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-200 block">
                Send Voice Message (फोन पर बोलकर सुनाएं)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customVoiceMsg}
                  onChange={(e) => setCustomVoiceMsg(e.target.value)}
                  placeholder="e.g. Main Gate par ruko..."
                  className="flex-1 bg-slate-800/80 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400"
                  onKeyDown={(e) => e.key === 'Enter' && sendVoiceMessageToUser(customVoiceMsg)}
                />
                <button
                  onClick={() => sendVoiceMessageToUser(customVoiceMsg)}
                  className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Speak</span>
                </button>
              </div>

              {/* Preset Quick Voice Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Stay where you are, I am coming",
                  "Wait at Main Gate",
                  "Call me when free",
                  "Take care and drink water"
                ].map((txt, i) => (
                  <button
                    key={i}
                    onClick={() => sendVoiceMessageToUser(txt)}
                    className="text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Companion Device Health Telemetry */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider text-xs">
              Device Health & Telemetry
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
                  Network Connection
                </span>
                <span className="font-mono font-bold text-emerald-700">5G High-Speed</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Live Sync Heartbeat
                </span>
                <span className="font-mono text-slate-700">Active (4s ago)</span>
              </div>
            </div>
          </div>

          {/* Emergency Hotlines & Campus Support */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3 text-xs text-slate-600 font-medium">
            <h3 className="font-bold text-slate-900 text-sm">Emergency Hotlines & Dispatch</h3>
            <p className="leading-relaxed">
              If the user cannot be reached or leaves the designated perimeter, trigger emergency campus security or local emergency services:
            </p>
            <div className="space-y-2 pt-1 font-mono text-slate-800">
              <a
                href="tel:05222991000"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Campus Helpline:</span>
                <span className="font-bold text-amber-700">0522-2991000</span>
              </a>
              <a
                href="tel:112"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 flex items-center justify-between transition-colors"
              >
                <span>National Emergency:</span>
                <span className="font-bold text-red-600">112 (Police / Medical)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
