import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer';
import VoiceAssistantBanner from './components/VoiceAssistantBanner';
import Home from './pages/Home';
import VisionAssistant from './pages/VisionAssistant';
import LocationSharing from './pages/LocationSharing';
import { socketService } from './services/socketService';
import { speechService } from './services/speechService';
import { batteryService } from './services/batteryService';
import { api } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [highContrast, setHighContrast] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [locationSharingActive, setLocationSharingActive] = useState(true);
  const [screenReaderMessage, setScreenReaderMessage] = useState('Welcome to NETRA AI. Ready.');
  const [lastHeardVoice, setLastHeardVoice] = useState('');
  const [voiceActionFeedback, setVoiceActionFeedback] = useState('');
  const [batteryState, setBatteryState] = useState({ level: 95, isCharging: false });

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Handle Natural Language Voice Intents
  const handleIntentCommand = useCallback((intentObj, rawText) => {
    if (!intentObj) return;
    const { intent, speech, feedback } = intentObj;
    setLastHeardVoice(rawText || speech);
    if (feedback) setVoiceActionFeedback(feedback);

    // Broadcast event across active components
    window.dispatchEvent(new CustomEvent('netra:voice-intent', { detail: intentObj }));

    switch (intent) {
      case 'WALK_START':
      case 'VISION_RADAR':
      case 'CAMERA_START':
      case 'DESCRIBE_SCENE':
        setCurrentPage('vision');
        speechService.speak(speech || "NETRA walking guide active. Camera and obstacle radar started.", { priority: true });
        break;

      case 'LOCATION':
        setCurrentPage('location');
        speechService.speak(speech || "Opening Live GPS Location Tracker.", { priority: true });
        break;

      case 'SOS_TRIGGER':
        speechService.speak("Emergency SOS triggered! Broadcasting your coordinates.", { priority: true });
        api.triggerSOS({
          type: 'voice_command',
          lat: 26.8467,
          lng: 80.9462,
          address: 'DSMNRU Campus Main Gate'
        }).catch(console.error);
        break;

      case 'HOME':
        setCurrentPage('home');
        speechService.speak(speech || "Returned to Home screen.", { priority: true });
        break;

      case 'MUTE':
        setIsMuted(true);
        speechService.speak("Audio muted.", { priority: true });
        break;

      case 'UNMUTE':
        setIsMuted(false);
        speechService.speak("Audio unmuted.", { priority: true });
        break;

      default:
        break;
    }
  }, []);

  const handleVoiceCommand = useCallback((spokenText) => {
    const parsed = speechService.parseIntent(spokenText);
    handleIntentCommand(parsed, spokenText);
  }, [handleIntentCommand]);

  // Initialize socket & listeners
  useEffect(() => {
    socketService.connect();

    api.getHealth().catch(() => {
      console.warn('Backend server connecting...');
    });

    const unsubscribeIntent = speechService.addIntentListener(handleIntentCommand);
    const unsubscribeState = speechService.addStateListener(setIsListening);
    const unsubscribeBattery = batteryService.addStateListener(setBatteryState);

    return () => {
      unsubscribeIntent();
      unsubscribeState();
      unsubscribeBattery();
    };
  }, [handleIntentCommand]);

  // High contrast mode
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Sync mute state
  useEffect(() => {
    speechService.setMuted(isMuted);
  }, [isMuted]);

  // Global Keyboard Shortcuts (Key 1, Key 2, Key V, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'v' || e.key === 'V') {
        handleToggleVoiceCommands();
        return;
      }

      switch (e.key) {
        case '1':
          setCurrentPage('vision');
          speechService.speak("Opening Vision and Obstacle Detection", { priority: true });
          break;
        case '2':
          setCurrentPage('location');
          speechService.speak("Opening Live Location Tracking", { priority: true });
          break;
        case 'Escape':
          setCurrentPage('home');
          speechService.speak("Returned to Home Screen", { priority: true });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  // Toggle Voice Commands
  const handleToggleVoiceCommands = () => {
    if (isListening) {
      speechService.stopListening();
      speechService.speak("Voice control paused.");
      setVoiceActionFeedback("Voice control paused");
    } else {
      speechService.startListening();
      speechService.speak("Voice control active. You can speak 'Start', 'Vision', 'Location', or 'Describe'.", { priority: true });
      setVoiceActionFeedback("Voice control active (Listening)");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-100 text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      {/* Screen Reader Live Region */}
      <ScreenReaderAnnouncer announcement={screenReaderMessage} />

      {/* Top Accessible Navbar */}
      <div className="bg-white border-b border-slate-200 z-30 shadow-xs sticky top-0">
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isListening={isListening}
          onToggleVoiceCommands={handleToggleVoiceCommands}
          batteryState={batteryState}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 w-full relative flex flex-col justify-start pb-20">
        <div className="relative z-10 max-w-6xl w-full mx-auto px-4 py-6 flex-1">
          {currentPage === 'home' && (
            <Home
              onSelectPage={setCurrentPage}
              locationSharingActive={locationSharingActive}
            />
          )}
          {currentPage === 'vision' && (
            <VisionAssistant onBack={() => setCurrentPage('home')} />
          )}
          {currentPage === 'location' && (
            <LocationSharing
              onBack={() => setCurrentPage('home')}
              sharingActive={locationSharingActive}
              setSharingActive={setLocationSharingActive}
            />
          )}
        </div>
      </main>

      {/* Hands-Free Voice Assistant Bar */}
      <VoiceAssistantBanner
        isListening={isListening}
        onToggleListening={handleToggleVoiceCommands}
        lastHeard={lastHeardVoice}
        actionFeedback={voiceActionFeedback}
        currentPage={currentPage}
        onExecuteCommand={handleVoiceCommand}
      />

      {/* Bottom Status Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 text-center font-medium shadow-xs z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            NETRA AI • SPIRIT 3.0 Buildathon 2026 • Team UNTAMED
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">[V] Voice Mic</span>
            <span>[1] Vision Detection</span>
            <span>[2] Live Location</span>
            <span>[Esc] Home</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
