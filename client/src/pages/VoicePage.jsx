import React, { useState, useEffect } from 'react';
import { Mic, ArrowLeft, Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function VoicePage({ onBack, onExecuteCommand }) {
  const [transcriptHistory, setTranscriptHistory] = useState([
    { text: 'Voice Assistant Ready. Speak any command or choose a quick shortcut below.', type: 'system', time: 'Just now' }
  ]);
  const [isListening, setIsListening] = useState(speechService.isListening);

  useEffect(() => {
    speechService.speak("Voice guidance assistant in light mode. Say 'Vision', 'Trigger SOS', 'Where am I', 'Report Hazard', or 'Open Family' to navigate hands-free.", { priority: true });
    
    // Automatically start listening if not already running
    if (!speechService.isListening) {
      speechService.startListening();
    }

    // Subscribe to speech state
    const unsubscribeState = speechService.addStateListener(setIsListening);

    // Subscribe to natural language intents to display live conversation transcript
    const unsubscribeIntent = speechService.addIntentListener((intentObj, rawText) => {
      if (!intentObj) return;
      setTranscriptHistory(prev => [
        { text: rawText || intentObj.speech, type: 'user', time: new Date().toLocaleTimeString() },
        { text: intentObj.speech || intentObj.feedback, type: 'assistant', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
    });

    return () => {
      unsubscribeState();
      unsubscribeIntent();
      // Notice: We deliberately do NOT call speechService.stopListening() so global voice control remains active across pages!
    };
  }, []);

  const handleChipClick = (cmd, targetPage) => {
    const parsed = speechService.parseIntent(cmd);
    if (parsed) {
      speechService.intentListeners.forEach(listener => {
        try { listener(parsed, cmd); } catch (e) { console.error(e); }
      });
    } else if (targetPage) {
      onExecuteCommand(targetPage);
    }
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
              speechService.speak("Voice listening stopped.");
            } else {
              speechService.startListening();
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
            Speak naturally. NETRA AI recognizes voice commands in English, Hinglish, and Hindi.
          </p>
        </div>

        {/* Quick Command Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {[
            { cmd: "Vision", target: 'vision' },
            { cmd: "Currency", target: 'vision' },
            { cmd: "Medicine", target: 'vision' },
            { cmd: "Color", target: 'vision' },
            { cmd: "Torch", target: 'vision' },
            { cmd: "Emergency SOS", target: 'sos' },
            { cmd: "Where Am I", target: 'location' },
            { cmd: "Report Hazard", target: 'hazards' },
            { cmd: "Family Portal", target: 'family' }
          ].map(item => (
            <button
              key={item.cmd}
              onClick={() => handleChipClick(item.cmd, item.target)}
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
