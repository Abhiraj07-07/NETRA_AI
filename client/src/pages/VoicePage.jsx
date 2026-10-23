import React, { useState, useEffect } from 'react';
import { Mic, ArrowLeft, Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function VoicePage({ onBack, onExecuteCommand }) {
  const [transcriptHistory, setTranscriptHistory] = useState([
    { text: 'System ready. Waiting for voice commands.', type: 'system', time: 'Just now' }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  useEffect(() => {
    speechService.speak("Voice guidance assistant in light mode. Say 'Start Vision', 'Trigger SOS', 'Where am I', 'Report Hazard', or 'Open Family' to navigate hands-free.", { priority: true });
    
    const supported = speechService.initVoiceCommands((spokenText) => {
      setTranscriptHistory(prev => [
        { text: spokenText, type: 'user', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
      handleVoiceCommand(spokenText);
    });

    if (supported) {
      speechService.startListening();
      setIsListening(true);
    }

    return () => {
      speechService.stopListening();
    };
  }, []);

  const handleVoiceCommand = (cmd) => {
    const parsed = speechService.parseIntent(cmd);
    let reply = '';

    if (parsed) {
      reply = parsed.speech;
      speechService.speak(reply, { priority: true });

      switch (parsed.intent) {
        case 'CURRENCY':
        case 'MEDICINE_OCR':
        case 'COLOR':
        case 'VISION_RADAR':
        case 'CAMERA_START':
          setTimeout(() => onExecuteCommand('vision'), 800);
          break;
        case 'SOS_TRIGGER':
        case 'SEND_SMS':
        case 'SEND_WHATSAPP':
          setTimeout(() => onExecuteCommand('sos'), 800);
          break;
        case 'LOCATION':
          setTimeout(() => onExecuteCommand('location'), 800);
          break;
        case 'HAZARDS':
          setTimeout(() => onExecuteCommand('hazards'), 800);
          break;
        case 'FAMILY':
          setTimeout(() => onExecuteCommand('family'), 800);
          break;
        case 'SETTINGS':
          setTimeout(() => onExecuteCommand('settings'), 800);
          break;
        case 'HOME':
          setTimeout(() => onExecuteCommand('home'), 800);
          break;
        default:
          break;
      }
    } else {
      reply = `Heard: "${cmd}". Say Currency, Camera, Medicine, or SOS.`;
      speechService.speak(reply);
    }

    setTranscriptHistory(prev => [
      { text: reply, type: 'assistant', time: new Date().toLocaleTimeString() },
      ...prev
    ]);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              Voice Guidance & Hands-Free Commands
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Web Speech API • Real-time Speech-to-Text & Text-to-Speech
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (isListening) {
              speechService.stopListening();
              setIsListening(false);
              speechService.speak("Voice listening stopped.");
            } else {
              speechService.startListening();
              setIsListening(true);
              speechService.speak("Listening for voice commands.");
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            isListening 
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse' 
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'
          }`}
        >
          <Mic className="w-4 h-4 text-emerald-600" />
          <span>{isListening ? 'Listening Active' : 'Start Listening'}</span>
        </button>
      </div>

      {/* Main Interactive Mic Box */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-xs">
        <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center transition-all ${
          isListening 
            ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-600 radar-pulse-anim' 
            : 'bg-slate-100 text-slate-400 border border-slate-200'
        }`}>
          <Mic className="w-12 h-12" />
        </div>

        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-slate-900">
            {isListening ? "Listening for your voice..." : "Voice Recognition Paused"}
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Speak naturally. NETRA AI recognizes voice commands for complete hands-free navigation.
          </p>
        </div>

        {/* Quick Command Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {[
            { cmd: "Start Vision", target: 'vision' },
            { cmd: "Read Currency", target: 'vision' },
            { cmd: "Scan Medicine", target: 'vision' },
            { cmd: "Identify Color", target: 'vision' },
            { cmd: "Emergency SOS", target: 'sos' },
            { cmd: "Where Am I", target: 'location' },
            { cmd: "Report Hazard", target: 'hazards' },
            { cmd: "Family Portal", target: 'family' }
          ].map(item => (
            <button
              key={item.cmd}
              onClick={() => handleVoiceCommand(item.cmd)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-800 border border-slate-200 hover:border-amber-400 text-xs font-bold transition-colors shadow-xs"
            >
              "{item.cmd}"
            </button>
          ))}
        </div>
      </div>

      {/* Live Conversation Transcript */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-base">Speech Activity & Responses</h3>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {transcriptHistory.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                item.type === 'user' 
                  ? 'bg-sky-50 border-sky-200 text-sky-950 font-medium' 
                  : item.type === 'assistant' 
                  ? 'bg-amber-50 border-amber-200 text-amber-950 font-medium' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] block opacity-75 mb-0.5">
                  {item.type === 'user' ? 'You Said:' : item.type === 'assistant' ? 'NETRA AI:' : 'System:'}
                </span>
                <span>{item.text}</span>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0 font-mono">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
