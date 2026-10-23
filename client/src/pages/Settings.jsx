import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, ArrowLeft, Volume2, Headphones, Sparkles, Check, 
  Contrast, Info, User, Phone, Eye, HeartPulse, MapPin, Save, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';

export default function Settings({ onBack, highContrast, setHighContrast }) {
  const [speechRate, setSpeechRate] = useState(1.0);
  const [spatialTestStatus, setSpatialTestStatus] = useState('');
  const [savedNotification, setSavedNotification] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // User Personal Profile State
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('netra_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      displayName: localStorage.getItem('netra_user_name') || 'Rupesh Kushwaha',
      phone: localStorage.getItem('netra_user_phone') || '+91 98765 43210',
      visionLevel: 'Total Blindness / Visually Impaired',
      bloodGroup: 'B+',
      emergencyNote: 'Assisted by white cane / directional audio cues',
      address: 'Near Main Gate, DSMNRU Campus, Lucknow'
    };
  });

  useEffect(() => {
    loadBackendProfile();
    speechService.speak("Settings and Personal Profile. You can customize your name, emergency identity, speech rate, and earphone calibration.", { minIntervalMs: 5000 });
  }, []);

  const loadBackendProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res.success && res.profile) {
        setProfile(prev => ({
          ...prev,
          displayName: res.profile.displayName || prev.displayName,
          phone: res.profile.phone || prev.phone,
          visionLevel: res.profile.visionLevel || prev.visionLevel,
          bloodGroup: res.profile.bloodGroup || prev.bloodGroup,
          emergencyNote: res.profile.emergencyNote || prev.emergencyNote,
          address: res.profile.address || prev.address
        }));
      }
    } catch (e) {
      console.warn('Profile load error:', e);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('netra_user_profile', JSON.stringify(profile));
      localStorage.setItem('netra_user_name', profile.displayName);
      localStorage.setItem('netra_user_phone', profile.phone);

      await api.updateProfile(profile);

      setSavedNotification(true);
      speechService.speak(`Profile saved successfully. Active user identity set to ${profile.displayName}.`, { priority: true });
      setTimeout(() => setSavedNotification(false), 3000);
    } catch (err) {
      console.warn('Profile save local fallback:', err);
      setSavedNotification(true);
      speechService.speak(`Profile updated locally for ${profile.displayName}.`);
      setTimeout(() => setSavedNotification(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const testLeftEar = () => {
    audioService.playSpatialPing(-0.9, 1.2);
    setSpatialTestStatus('Playing cue to LEFT EAR (Pan: -0.9, Distance: 1.2m)');
    setTimeout(() => {
      speechService.speak("Left channel audio verified.");
    }, 450);
  };

  const testRightEar = () => {
    audioService.playSpatialPing(0.9, 1.2);
    setSpatialTestStatus('Playing cue to RIGHT EAR (Pan: +0.9, Distance: 1.2m)');
    setTimeout(() => {
      speechService.speak("Right channel audio verified.");
    }, 450);
  };

  const testCenterClose = () => {
    audioService.playSpatialPing(0.0, 0.8);
    setSpatialTestStatus('Playing URGENT center alert (Distance: 0.8m)');
    setTimeout(() => {
      speechService.speak("Immediate forward barrier warning verified.");
    }, 450);
  };

  const handleRateChange = (newRate) => {
    setSpeechRate(newRate);
    speechService.setRate(newRate);
    speechService.speak(`Speech speed set to ${newRate}x.`);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
          aria-label="Back to Home Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            User Profile & System Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Personal identity • Emergency medical card • Audio balance • Speech rate
          </p>
        </div>
      </div>

      {/* User Personal Profile & Medical Emergency Card */}
      <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-300 shadow-xs">
              <User className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h2 className="section-heading text-lg font-bold text-slate-900">
                Personal Profile & Emergency Identity (व्यक्तिगत प्रोफ़ाइल)
              </h2>
              <p className="text-xs text-slate-600">
                This name and mobile number will be automatically sent in all Emergency SOS SMS and GPS alerts.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
            Active User Card
          </span>
        </div>

        {savedNotification && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>✓ Profile successfully saved! Used across SOS messages, SMS alerts, and Guardian portals.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Full Name (आपका पूरा नाम):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={profile.displayName}
                  onChange={e => handleProfileChange('displayName', e.target.value)}
                  placeholder="e.g. Rupesh Kushwaha"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Mobile Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Your Mobile Number (आपका मोबाइल नंबर):
              </label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={e => handleProfileChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Vision / Disability Level */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Vision / Assistive Level (दृष्टि स्तर):
              </label>
              <select
                value={profile.visionLevel}
                onChange={e => handleProfileChange('visionLevel', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="Total Blindness / Visually Impaired">Total Blindness (पूर्ण दृष्टिबाधित)</option>
                <option value="Low Vision / Partial Sight">Low Vision / Partial Sight (कम दृष्टि)</option>
                <option value="Night Blindness / Tunnel Vision">Night Blindness / Tunnel Vision (रतौंधी)</option>
                <option value="Wheelchair User with Low Vision">Wheelchair with Visual Impairment</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Blood Group (रक्त समूह):
              </label>
              <select
                value={profile.bloodGroup}
                onChange={e => handleProfileChange('bloodGroup', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Home Address / Landmark */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Home Address / Frequent Location (घर का पता / विश्वविद्यालय):
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={e => handleProfileChange('address', e.target.value)}
                placeholder="e.g. Near Main Gate, DSMNRU Campus, Lucknow"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Emergency Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Emergency Medical Note (डॉक्टर / आपातकालीन सहायता नोट):
              </label>
              <input
                type="text"
                value={profile.emergencyNote}
                onChange={e => handleProfileChange('emergencyNote', e.target.value)}
                placeholder="e.g. Walks with white cane, needs audible directions, no penicillin"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Changes update your identity across Emergency SOS, SMS, and Family portals.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Profile...' : 'Save My Profile (प्रोफ़ाइल सेव करें)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Spatial Audio Earphone Calibration */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="section-heading text-base font-bold text-slate-900">Spatial 3D Earphone Calibration</h2>
            <p className="text-xs text-slate-600 font-medium">
              Put on your stereo earphones to calibrate directional audio cues.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={testLeftEar}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-left transition-all shadow-xs"
          >
            <span className="text-xs font-mono font-bold text-amber-700 block mb-1">TEST 1</span>
            <div className="font-bold text-slate-900 text-sm">Left Ear Ping</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Left spatial panning (-0.9)</div>
          </button>

          <button
            onClick={testCenterClose}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-400 text-left transition-all shadow-xs"
          >
            <span className="text-xs font-mono font-bold text-red-600 block mb-1">TEST 2</span>
            <div className="font-bold text-slate-900 text-sm">Center Obstacle</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Urgent forward proximity (0.8m)</div>
          </button>

          <button
            onClick={testRightEar}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-left transition-all shadow-xs"
          >
            <span className="text-xs font-mono font-bold text-amber-700 block mb-1">TEST 3</span>
            <div className="font-bold text-slate-900 text-sm">Right Ear Ping</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Right spatial panning (+0.9)</div>
          </button>
        </div>

        {spatialTestStatus && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-mono font-bold">
            {spatialTestStatus}
          </div>
        )}
      </div>

      {/* Speech Synthesis Rate */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-300">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="section-heading text-base font-bold text-slate-900">Speech Guidance Voice Speed</h2>
            <p className="text-xs text-slate-600 font-medium">
              Adjust how rapidly obstacle advisories and navigation directions are read aloud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {[0.8, 1.0, 1.2, 1.4].map(rate => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                speechRate === rate
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {rate}x Speed
            </button>
          ))}
        </div>
      </div>

      {/* Buildathon Project Summary & Team Metadata */}
      <div className="bg-gradient-to-br from-white to-amber-50/50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="section-heading text-base font-bold text-slate-900">SPIRIT 3.0 Buildathon 2026 Project Profile</h2>
          </div>
          <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">
            UNTAMED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Project Title</span>
            <span className="font-bold text-slate-900 text-sm">NETRA AI</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
            <span className="font-bold text-slate-900">Helping Software / Software</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Institution</span>
            <span className="font-bold text-slate-900">Dr. Shakuntala Misra National Rehabilitation University, Lucknow</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Original Founder & Team</span>
            <span className="font-bold text-slate-900">Rupesh Kushwaha, Abhishek, Mandavi Chaubey, Atul Shakya</span>
          </div>
        </div>
      </div>
    </div>
  );
}
