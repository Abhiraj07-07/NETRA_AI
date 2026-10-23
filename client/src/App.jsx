import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer';
import VoiceAssistantBanner from './components/VoiceAssistantBanner';
import Home from './pages/Home';
import VisionAssistant from './pages/VisionAssistant';
import VoicePage from './pages/VoicePage';
import SOSPage from './pages/SOSPage';
import LocationSharing from './pages/LocationSharing';
import HazardMap from './pages/HazardMap';
import FamilyDashboard from './pages/FamilyDashboard';
import Settings from './pages/Settings';
import { socketService } from './services/socketService';
import { speechService } from './services/speechService';
import { batteryService } from './services/batteryService';
import { smartAssistService } from './services/smartAssistService';
import { api } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [visionMode, setVisionMode] = useState('obstacles');
  const [highContrast, setHighContrast] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSOSCount, setActiveSOSCount] = useState(0);
  const [locationSharingActive, setLocationSharingActive] = useState(true);
  const [screenReaderMessage, setScreenReaderMessage] = useState('Welcome to NETRA AI. Ready.');
  const [lastHeardVoice, setLastHeardVoice] = useState('');
  const [voiceActionFeedback, setVoiceActionFeedback] = useState('');
  const [batteryState, setBatteryState] = useState({ level: 95, isCharging: false, isLow: false });

  // Handle Natural Language Voice Intents (English, Hinglish & Hindi)
  const handleIntentCommand = useCallback((intentObj, rawText) => {
    if (!intentObj) return;
    const { intent, speech, feedback, turnOn } = intentObj;
    console.log('[Global Voice Intent Triggered]:', intent, rawText);
    setLastHeardVoice(rawText || speech);
    if (feedback) setVoiceActionFeedback(feedback);

    switch (intent) {
      case 'CURRENCY':
        setVisionMode('currency');
        setCurrentPage('vision');
        speechService.speak(speech, { priority: true });
        break;

      case 'MEDICINE_OCR':
        setVisionMode('ocr');
        setCurrentPage('vision');
        speechService.speak(speech, { priority: true });
        break;

      case 'COLOR':
        setVisionMode('color');
        setCurrentPage('vision');
        speechService.speak(speech, { priority: true });
        break;

      case 'VISION_RADAR':
      case 'CAMERA_START':
        setVisionMode('obstacles');
        setCurrentPage('vision');
        speechService.speak(speech, { priority: true });
        break;

      case 'CAMERA_STOP':
        speechService.speak(speech, { priority: true });
        break;

      case 'SOS_TRIGGER':
        setCurrentPage('sos');
        speechService.speak(speech, { priority: true });
        api.triggerSOS({
          type: 'voice_command',
          lat: 26.8467,
          lng: 80.9462,
          address: 'DSMNRU Campus Main Gate'
        }).catch(console.error);
        break;

      case 'SEND_SMS':
      case 'SEND_WHATSAPP':
        setCurrentPage('sos');
        speechService.speak(speech, { priority: true });
        break;

      case 'LOCATION':
        setCurrentPage('location');
        speechService.speak(speech, { priority: true });
        break;

      case 'HAZARDS':
        setCurrentPage('hazards');
        speechService.speak(speech, { priority: true });
        break;

      case 'FAMILY':
        setCurrentPage('family');
        speechService.speak(speech, { priority: true });
        break;

      case 'SETTINGS':
        setCurrentPage('settings');
        speechService.speak(speech, { priority: true });
        break;

      case 'HOME':
        setCurrentPage('home');
        speechService.speak(speech, { priority: true });
        break;

      case 'TORCH':
        speechService.speak(speech, { priority: true });
        smartAssistService.setTorch(turnOn);
        break;

      case 'MUTE':
        setIsMuted(true);
        speechService.speak(speech, { priority: true });
        break;

      case 'UNMUTE':
        setIsMuted(false);
        speechService.speak(speech, { priority: true });
        break;

      case 'READ_SCREEN': {
        const pageDesc = {
          home: "You are on the Home screen. Say Currency, Medicine, Color, Vision, SOS, Location, Hazards, or Family.",
          vision: "You are on Vision Assistant. Real-time scanning is active.",
          sos: "You are on Panic SOS. Immediate siren and SMS GPS dispatch available.",
          location: "You are on Live Location Sharing. Streaming GPS to guardians.",
          hazards: "You are on Hazard Map. Displays road hazards and obstacles.",
          family: "You are on Family Portal. Guard monitors user safety in real time.",
          settings: "You are on Settings. Configure voice rate and profile."
        }[currentPage] || "Welcome to NETRA AI.";
        speechService.speak(pageDesc, { priority: true });
        break;
      }

      case 'HELP':
        speechService.speak(speech, { priority: true });
        break;

      case 'UNKNOWN':
      default:
        speechService.speak(speech || `Heard: "${rawText}". Say Currency, Camera, Medicine, or SOS.`);
        break;
    }
  }, [currentPage]);

  // Handle direct spoken text wrapper
  const handleVoiceCommand = useCallback((spokenText) => {
    const parsed = speechService.parseIntent(spokenText);
    handleIntentCommand(parsed, spokenText);
  }, [handleIntentCommand]);

  // Initialize socket & check initial health / active SOS
  useEffect(() => {
    socketService.connect();

    socketService.on('init:state', (state) => {
      if (state && state.activeSOS) {
        setActiveSOSCount(state.activeSOS.length);
      }
    });

    socketService.on('sos:alert', () => {
      setActiveSOSCount(prev => prev + 1);
      setScreenReaderMessage('Emergency alert dispatched!');
    });

    socketService.on('sos:resolved', () => {
      setActiveSOSCount(prev => Math.max(0, prev - 1));
      setScreenReaderMessage('Emergency alert resolved.');
    });

    // Check backend health
    api.getHealth().catch(() => {
      console.warn('Backend server connecting...');
    });

    // Register global voice intent listener
    const unsubscribeIntent = speechService.addIntentListener(handleIntentCommand);
    const unsubscribeState = speechService.addStateListener(setIsListening);

    // Register battery service listener & critical low battery alerts
    const unsubscribeBattery = batteryService.addStateListener(setBatteryState);
    const unsubscribeBatteryAlert = batteryService.addAlertListener((info) => {
      setActiveSOSCount(prev => prev + 1);
      setScreenReaderMessage(`CRITICAL WARNING: Device battery at ${info.level}%. Emergency GPS location automatically sent to contacts.`);
    });

    socketService.on('battery:critical', (data) => {
      setActiveSOSCount(prev => prev + 1);
      setScreenReaderMessage(`Alert: Low battery alert (${data.level}%) broadcasted!`);
    });

    return () => {
      unsubscribeIntent();
      unsubscribeState();
      unsubscribeBattery();
      unsubscribeBatteryAlert();
    };
  }, [handleIntentCommand]);

  // Update high contrast class on HTML body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Sync mute state to speechService
  useEffect(() => {
    speechService.setMuted(isMuted);
  }, [isMuted]);

  // Accessible Keyboard Navigation (Keys 1-6, V for Voice, and Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'v' || e.key === 'V') {
        handleToggleVoiceCommands();
        return;
      }

      switch (e.key) {
        case '1':
          setCurrentPage('vision');
          speechService.speak("Opening Vision Assistant");
          break;
        case '2':
          setCurrentPage('voice');
          speechService.speak("Opening Voice Assistant");
          break;
        case '3':
          setCurrentPage('sos');
          speechService.speak("Opening Panic SOS");
          break;
        case '4':
          setCurrentPage('location');
          speechService.speak("Opening Location Sharing");
          break;
        case '5':
          setCurrentPage('hazards');
          speechService.speak("Opening Hazard Map");
          break;
        case '6':
          setCurrentPage('family');
          speechService.speak("Opening Family Portal");
          break;
        case 'Escape':
          setCurrentPage('home');
          speechService.speak("Returned to Home Screen");
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  // Toggle Global Voice Commands
  const handleToggleVoiceCommands = () => {
    if (isListening) {
      speechService.stopListening();
      speechService.speak("Voice control paused.");
      setVoiceActionFeedback("Voice control paused");
    } else {
      speechService.startListening();
      speechService.speak("Voice control active. You can speak commands in English or Hindi.", { priority: true });
      setVoiceActionFeedback("Voice control active (Listening)");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-100 text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      {/* Screen Reader Live Region */}
      <ScreenReaderAnnouncer announcement={screenReaderMessage} />

      {/* Top Accessible Navbar - Clean solid white (NEVER uses background image) */}
      <div className="bg-white border-b border-slate-200 z-30 shadow-xs sticky top-0">
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          activeSOSCount={activeSOSCount}
          isListening={isListening}
          onToggleVoiceCommands={handleToggleVoiceCommands}
          batteryState={batteryState}
        />
      </div>

      {/* Main View - Background image strictly inside page area, auto-adjustable to device screen */}
      <main 
        className="flex-1 w-full relative flex flex-col justify-start netra-page-bg pb-20"
      >
        <div className="relative z-10 max-w-6xl w-full mx-auto px-4 py-6 flex-1">
          {currentPage === 'home' && (
            <Home
              onSelectPage={setCurrentPage}
              activeSOSCount={activeSOSCount}
              locationSharingActive={locationSharingActive}
            />
          )}
          {currentPage === 'vision' && (
            <VisionAssistant onBack={() => setCurrentPage('home')} initialMode={visionMode} />
          )}
          {currentPage === 'voice' && (
            <VoicePage
              onBack={() => setCurrentPage('home')}
              onExecuteCommand={setCurrentPage}
            />
          )}
          {currentPage === 'sos' && (
            <SOSPage
              onBack={() => setCurrentPage('home')}
              onSOSDispatched={() => setActiveSOSCount(prev => prev + 1)}
            />
          )}
          {currentPage === 'location' && (
            <LocationSharing
              onBack={() => setCurrentPage('home')}
              sharingActive={locationSharingActive}
              setSharingActive={setLocationSharingActive}
            />
          )}
          {currentPage === 'hazards' && (
            <HazardMap onBack={() => setCurrentPage('home')} />
          )}
          {currentPage === 'family' && (
            <FamilyDashboard onBack={() => setCurrentPage('home')} />
          )}
          {currentPage === 'settings' && (
            <Settings
              onBack={() => setCurrentPage('home')}
              highContrast={highContrast}
              setHighContrast={setHighContrast}
            />
          )}
        </div>
      </main>

      {/* Floating Global Hands-Free Voice Assistant Bar */}
      <VoiceAssistantBanner
        isListening={isListening}
        onToggleListening={handleToggleVoiceCommands}
        lastHeard={lastHeardVoice}
        actionFeedback={voiceActionFeedback}
        currentPage={currentPage}
        onExecuteCommand={handleVoiceCommand}
      />

      {/* Bottom Accessible Status Footer - Clean solid white (NEVER uses background image) */}
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 text-center font-medium shadow-xs z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            NETRA AI • SPIRIT 3.0 Buildathon 2026 • Team UNTAMED
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">[V] Voice Mic</span>
            <span>[1] Vision</span>
            <span>[2] Voice</span>
            <span>[3] SOS</span>
            <span>[4] GPS</span>
            <span>[5] Hazards</span>
            <span>[6] Family</span>
            <span>[Esc] Home</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
