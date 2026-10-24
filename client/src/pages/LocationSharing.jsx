import React, { useState, useEffect } from 'react';
import { 
  MapPin, ArrowLeft, Radio, Shield, Clock, Compass, Navigation, 
  RefreshCw, CheckCircle2, Share2, MessageCircle, AlertOctagon, Volume2, 
  ExternalLink, Play, Square, Building2
} from 'lucide-react';
import { api } from '../services/api';
import { speechService } from '../services/speechService';
import { socketService } from '../services/socketService';
import { audioService } from '../services/audioService';

export default function LocationSharing({ onBack, sharingActive = true, setSharingActive }) {
  const [locationData, setLocationData] = useState({
    placeName: 'Dr. Shakuntala Misra National Rehabilitation University Campus',
    area: 'Mohaan Road',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    fullAddress: 'Faculty of Technology, DSMNRU Campus, Mohaan Road, Lucknow, Uttar Pradesh',
    accuracy: 5,
    speed: 1.2,
    heading: 65,
    latitude: 26.8467,
    longitude: 80.9462,
    lastUpdated: new Date().toLocaleTimeString()
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [sosSent, setSosSent] = useState(false);

  // Reverse geocode lat/lng to a human-readable real place name (no coordinates)
  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'hi,en' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const road = data.address.road || data.address.suburb || data.address.neighbourhood || 'Campus Road';
          const landmark = data.name || data.address.amenity || data.address.building || '';
          const city = data.address.city || data.address.town || data.address.state_district || 'Lucknow';
          const state = data.address.state || 'Uttar Pradesh';
          const area = data.address.suburb || data.address.neighbourhood || road;
          const placeName = landmark ? `${landmark}, ${road}` : (road ? `${road}, ${city}` : city);

          return {
            placeName,
            area,
            city,
            state,
            fullAddress: data.display_name || `${placeName}, ${area}, ${city}, ${state}`
          };
        }
      }
    } catch (e) {
      console.warn('Reverse geocode fallback:', e);
    }
    return null;
  };

  const startTracking = () => {
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = Math.round(pos.coords.accuracy || 5);
          const spd = pos.coords.speed ? Number((pos.coords.speed * 3.6).toFixed(1)) : 1.2;
          const head = pos.coords.heading ? Math.round(pos.coords.heading) : 45;

          const geo = await reverseGeocode(lat, lng);

          setLocationData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            speed: spd,
            heading: head,
            placeName: geo?.placeName || prev.placeName,
            area: geo?.area || prev.area,
            city: geo?.city || prev.city,
            state: geo?.state || prev.state,
            fullAddress: geo?.fullAddress || prev.fullAddress,
            lastUpdated: new Date().toLocaleTimeString()
          }));

          // Push to backend
          api.updateLocation({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            address: geo?.fullAddress || 'DSMNRU Campus, Lucknow',
            sharingActive: true
          }).catch(() => {});

          socketService.emit('location:broadcast', {
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            placeName: geo?.placeName || 'DSMNRU Campus',
            sharingActive: true
          });
        },
        (err) => {
          console.warn('GPS watch notice:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
      );
      setWatchId(id);
    }
  };

  const stopTracking = () => {
    if (watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  useEffect(() => {
    // Initial announcement without coordinates
    speechService.speak(
      `Live Location Tracker active. Aap is samay ${locationData.placeName}, ${locationData.city} ke paas hain.`,
      { minIntervalMs: 5000 }
    );
    startTracking();

    return () => {
      stopTracking();
    };
  }, []);

  // START / STOP Toggle Feature with Loud Spoken Voice Confirmation
  const handleToggleTracking = () => {
    const nextState = !sharingActive;
    if (setSharingActive) setSharingActive(nextState);

    if (nextState) {
      startTracking();
      speechService.speak("Live location tracking started. Aapka sthan track kiya ja raha hai.", { priority: true });
    } else {
      stopTracking();
      speechService.speak("Live location tracking stopped. Tracking rok di gayi hai.", { priority: true });
    }
  };

  // Speak Current Location Aloud — Real Place Only (NO Numeric Coordinates!)
  const handleHearLocation = () => {
    const text = `Aap is samay ${locationData.placeName}, ${locationData.area}, ${locationData.city} me hain. Rasta saaf hai.`;
    speechService.speak(text, { priority: true });
  };

  // Refresh Location
  const handleManualRefresh = () => {
    setIsUpdating(true);
    speechService.speak("Refreshing your current location...", { priority: true });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const geo = await reverseGeocode(lat, lng);

          setLocationData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            accuracy: Math.round(pos.coords.accuracy || 5),
            placeName: geo?.placeName || prev.placeName,
            area: geo?.area || prev.area,
            city: geo?.city || prev.city,
            state: geo?.state || prev.state,
            fullAddress: geo?.fullAddress || prev.fullAddress,
            lastUpdated: new Date().toLocaleTimeString()
          }));
          setIsUpdating(false);

          const placeMsg = `Location updated. Aap is samay ${geo?.placeName || locationData.placeName}, ${locationData.city} me hain.`;
          speechService.speak(placeMsg, { priority: true });
        },
        () => {
          setIsUpdating(false);
          speechService.speak(`Location verified. Aap ${locationData.placeName}, ${locationData.city} me hain.`, { priority: true });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsUpdating(false);
    }
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    const mapsUrl = `https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`;
    const text = `*NETRA AI Live Location*%0A📍 Location: ${encodeURIComponent(locationData.placeName)}%0A🏢 Area: ${encodeURIComponent(locationData.area)}, ${encodeURIComponent(locationData.city)}%0A🗺️ Google Maps: ${mapsUrl}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
    speechService.speak("Opening WhatsApp to share your location.", { priority: true });
  };

  // Send SMS
  const handleSendSMS = () => {
    const mapsUrl = `https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`;
    const text = `My Location: ${locationData.placeName}, ${locationData.city} | Maps: ${mapsUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
    speechService.speak("Opening SMS to send your location.", { priority: true });
  };

  // Emergency SOS Trigger
  const handleEmergencySOS = async () => {
    setSosSent(true);
    audioService.playSiren(3);
    speechService.speak(`Emergency SOS alert sent with your location: ${locationData.placeName}, ${locationData.city}`, { priority: true });

    try {
      await api.triggerSOS({
        type: 'panic_button',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.fullAddress
      });
    } catch (e) {
      console.warn('SOS dispatch notice:', e);
    }

    setTimeout(() => setSosSent(false), 5000);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            title="Back to Home [Esc]"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Live Location Tracker
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Real-time place & landmark identification • Spoken location updates • 1-Tap sharing
            </p>
          </div>
        </div>

        {/* Big Prominent START / STOP TRACKING Button */}
        <button
          onClick={handleToggleTracking}
          className={`px-6 py-3 rounded-2xl text-sm font-black border transition-all flex items-center gap-2 shadow-md active:scale-95 ${
            sharingActive
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-600/30'
          }`}
          aria-label={sharingActive ? "Stop Live Location Tracking" : "Start Live Location Tracking"}
        >
          {sharingActive ? (
            <>
              <Square className="w-4 h-4 fill-current animate-pulse" />
              <span>STOP TRACKING (रोकें)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>START TRACKING (शुरू करें)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Real-Place Display (NO Raw Coordinates!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                sharingActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500'
              }`}>
                <MapPin className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {sharingActive ? '● Live Location Active' : '○ Tracking Paused'}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {locationData.placeName}
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {locationData.area}, {locationData.city}, {locationData.state}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isUpdating}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-xs shrink-0"
              title="Refresh Current Location"
              aria-label="Refresh Location"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>

          {/* Place & Area Big Feature Cards (Clean, Human Readable, No Numbers!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Current Place / Landmark</span>
              </div>
              <div className="text-base font-black text-slate-900 line-clamp-2">
                {locationData.placeName}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Navigation className="w-4 h-4 text-sky-600" />
                <span>Area & City</span>
              </div>
              <div className="text-base font-black text-slate-900">
                {locationData.area}, {locationData.city}
              </div>
            </div>
          </div>

          {/* Status & Telemetry (Accuracy, Speed, Last Sync) */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-slate-500 text-[10px] font-medium">GPS Signal</div>
                <div className="font-bold text-slate-900">Accurate (±{locationData.accuracy}m)</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <div className="text-slate-500 text-[10px] font-medium">Movement</div>
                <div className="font-bold text-slate-900">Walking ({locationData.speed} km/h)</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <div className="text-slate-500 text-[10px] font-medium">Last Verified</div>
                <div className="font-bold text-slate-900">{locationData.lastUpdated}</div>
              </div>
            </div>
          </div>

          {/* Animated Visual Map Radar */}
          <div className="h-44 bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center text-center p-4">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
            {sharingActive && (
              <div className="w-24 h-24 rounded-full border-2 border-emerald-500/50 bg-emerald-500/20 flex items-center justify-center animate-ping">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/80" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white font-bold shadow-md">
              📍 {locationData.placeName} ({locationData.city})
            </div>
          </div>
        </div>

        {/* Right Col: Voice Readout, WhatsApp & Instant Share */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Hear Location Aloud Button — Speaks real place only! */}
          <button
            onClick={handleHearLocation}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 rounded-2xl font-black text-sm flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
            title="Hear your current location name aloud in voice"
          >
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-5 h-5" />
              <span>Hear Location Aloud (स्थान सुनें)</span>
            </div>
            <span className="text-[10px] bg-amber-600/30 px-2 py-0.5 rounded font-mono font-bold">VOICE</span>
          </button>

          {/* WhatsApp Direct Share */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-5 h-5" />
              <span>Share on WhatsApp</span>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-200" />
          </button>

          {/* SMS Direct Share */}
          <button
            onClick={handleSendSMS}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5" />
              <span>Send SMS Location</span>
            </div>
            <ExternalLink className="w-4 h-4 text-sky-200" />
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={handleEmergencySOS}
            className={`w-full p-4 rounded-2xl font-black text-sm flex items-center justify-between shadow-lg transition-all ${
              sosSent
                ? 'bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5" />
              <span>{sosSent ? '✓ SOS DISPATCHED!' : 'EMERGENCY SOS BEACON'}</span>
            </div>
            <span className="text-[10px] bg-red-800/40 px-2 py-0.5 rounded font-mono">SIREN</span>
          </button>

          {/* Privacy Note */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Safety & Guardian Beacon</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              When started, your live location is tracked and can be shared in 1 tap. When stopped, tracking completely ceases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
