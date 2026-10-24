import React, { useState } from 'react';
import { Mic, MicOff, Volume2, HelpCircle, Check, Sparkles, X, ChevronUp, ChevronDown, ShieldCheck, Languages } from 'lucide-react';
import { speechService } from '../services/speechService';

export default function VoiceAssistantBanner({
  isListening,
  onToggleListening,
  lastHeard,
  actionFeedback,
  currentPage,
  onExecuteCommand
}) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentLang, setCurrentLang] = useState('en-IN');

  const toggleLanguage = () => {
    const next = currentLang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setCurrentLang(next);
    speechService.setLanguage(next);
    speechService.speak(next === 'hi-IN' ? "हिंदी भाषा सक्रिय है। आप हिंदी में बोल सकते हैं।" : "Indian English mode active.", { priority: true });
  };

  const commandList = [
    { en: 'Start / Walk / Companion', hi: 'Start / Shuru karo / Chalo', desc: 'Starts walking companion & obstacle radar' },
    { en: 'Describe Scene / AI', hi: 'Samne kya hai / Dekh kar batao', desc: 'AI describes scene, objects & surroundings' },
    { en: 'Medicine / OCR', hi: 'Dawai padho / Parchi check karo', desc: 'Reads medicine strip, dosage & expiry' },
    { en: 'Color / Clothes', hi: 'Rang batao / Kapda check karo', desc: 'Identifies clothing and object colors' },
    { en: 'Torch / Light', hi: 'Torch jalao / Batti band karo', desc: 'Controls hardware flashlight' },
    { en: 'Vision / Camera', hi: 'Camera chalu karo / Samne dekho', desc: 'Opens AI obstacle detection camera' },
    { en: 'SOS / Emergency / Help', hi: 'Bachao / Madad karo / Khatra', desc: 'Triggers emergency siren & alerts' },
    { en: 'Send SMS', hi: 'SMS bhejo / Sandesh bhejo', desc: 'Dispatches emergency SMS to mobile' },
    { en: 'WhatsApp', hi: 'WhatsApp bhejo', desc: 'Opens emergency WhatsApp alert' },
    { en: 'Location / Where am I', hi: 'Kaha hu / Meri location', desc: 'Announces GPS coordinates & landmark' },
    { en: 'Hazards / Map', hi: 'Khatre dikhao / Gaddha', desc: 'Reports potholes & street obstacles' },
    { en: 'Family / Guardian', hi: 'Parivar / Guardian portal', desc: 'Opens family live monitoring' },
    { en: 'Home / Main Screen', hi: 'Ghar jao / Wapas jao', desc: 'Returns to dashboard' },
    { en: 'Mute / Unmute', hi: 'Chup ho jao / Awaaz chalu', desc: 'Controls speech audio output' },
    { en: 'Contrast', hi: 'High contrast', desc: 'Toggles high-contrast accessibility' },
    { en: 'Read Screen', hi: 'Batao kya hai', desc: 'Reads current page out loud' },
    { en: 'Commands / Help', hi: 'Kya bolu / Madad', desc: 'Speaks available voice options' }
  ];

  return (
    <>
      {/* Floating Global Voice Assistant Dock */}
      <aside 
        aria-label="Hands-Free Voice Assistant Controller"
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-none"
      >
        <div className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border-2 ${
          isListening ? 'border-emerald-400 shadow-xl shadow-emerald-500/20' : 'border-slate-700 shadow-lg'
        } p-3 transition-all duration-200`}>
          
          <div className="flex items-center justify-between gap-3">
            {/* Mic Toggle Button */}
            <button
              onClick={onToggleListening}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                isListening 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30 animate-pulse' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
              aria-label={isListening ? "Voice control listening. Tap to turn off" : "Turn on hands-free voice control"}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <Mic className="w-4 h-4 text-white" />
                  <span className="tracking-wide">Listening... (Press V)</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4 text-slate-400" />
                  <span className="tracking-wide">Voice Off (Press V to start)</span>
                </>
              )}
            </button>

            {/* Live Feedback / Transcript readout */}
            <div className="flex-1 min-w-0 text-left">
              {!isMinimized && (
                <div>
                  <div className="text-[11px] font-mono text-emerald-400 truncate flex items-center gap-1.5 font-bold">
                    {actionFeedback ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{actionFeedback}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        {isListening ? 'Say: "Start", "Walk", "Samne kya hai", "Medicine", "SOS"...' : 'Voice is paused. Click or press V to speak.'}
                      </span>
                    )}
                  </div>
                  {lastHeard && isListening && (
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Heard: <span className="text-white font-semibold">"{lastHeard}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DSP Noise Filter Badge & Language Switcher */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isListening && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono font-bold shadow-xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Noise Filter ON</span>
                </span>
              )}

              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                title="Switch Speech Language (English / हिन्दी)"
                aria-label="Switch Language between English and Hindi"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{currentLang === 'hi-IN' ? 'हिन्दी' : 'ENG'}</span>
              </button>

              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
                title="View All Voice Commands (English & Hindi)"
                aria-label="View All Voice Commands"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                title={isMinimized ? "Expand voice bar" : "Minimize voice bar"}
                aria-label="Toggle voice bar expansion"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Voice Commands Cheat Sheet Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="section-heading text-lg font-bold text-slate-900">
                    Voice Commands Guide (बोलकर चलाएं)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Speak clearly in English or Hindi / Hinglish:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable list of voice commands */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {commandList.map((cmd, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200 transition-colors flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-300">
                        "{cmd.en}"
                      </span>
                      <span className="text-xs text-amber-900 font-semibold italic">
                        "{cmd.hi}"
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {cmd.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      onExecuteCommand(cmd.en.toLowerCase());
                    }}
                    className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shrink-0"
                  >
                    Try Now
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hotkey: Press <strong className="font-mono text-slate-900">V</strong> to toggle mic anytime
              </span>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
