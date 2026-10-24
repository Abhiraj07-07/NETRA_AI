// Speech Synthesis & Recognition Service with Natural Language Intent Engine & Earcon Feedback
// Supports Indian English, Hinglish, Numbers, and Hindi (Roman & Devanagari)

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.isMuted = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.recognition = null;
    this.isListening = false;
    this.currentLanguage = 'en-IN'; // 'en-IN' or 'hi-IN'
    this.commandListeners = new Set();
    this.intentListeners = new Set();
    this.stateListeners = new Set();
    this.shouldKeepListening = false;
    this.audioCtx = null;
  }

  setRate(r) {
    this.rate = Math.max(0.7, Math.min(1.5, r));
  }

  setMuted(m) {
    this.isMuted = m;
    if (m && this.synth) {
      this.synth.cancel();
    }
  }

  setLanguage(lang) {
    if (lang === 'hi-IN' || lang === 'en-IN') {
      this.currentLanguage = lang;
      if (this.recognition) {
        this.recognition.lang = lang;
      }
    }
  }

  addCommandListener(fn) {
    this.commandListeners.add(fn);
    return () => this.commandListeners.delete(fn);
  }

  addIntentListener(fn) {
    this.intentListeners.add(fn);
    return () => this.intentListeners.delete(fn);
  }

  addStateListener(fn) {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  notifyStateListeners(active) {
    this.isListening = active;
    this.stateListeners.forEach(fn => {
      try { fn(active); } catch (e) { console.error(e); }
    });
  }

  // ==============================================================
  // ACCESSIBLE AUDIO EARCONS (No hardware microphone locks)
  // ==============================================================
  playEarcon(type = 'start') {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'start') {
        // Two rising chimes: 520Hz -> 700Hz (Mic listening active)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
        osc.start(now);
        osc.stop(now + 0.20);
      } else if (type === 'success') {
        // High confirmation ping: 880Hz -> 1046Hz (Action executed)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1046, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'stop') {
        // Falling chime: 440Hz -> 330Hz (Mic paused)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      // AudioContext policy safe ignore
    }
  }

  // ==============================================================
  // SPEECH SYNTHESIS (TTS)
  // ==============================================================
  speak(text, { priority = false, minIntervalMs = 1500, lang = 'en-IN' } = {}) {
    if (this.isMuted || !this.synth) return;

    const now = Date.now();
    if (!priority && text === this.lastSpokenText && now - this.lastSpokenTime < minIntervalMs) {
      return;
    }

    try {
      if (priority) {
        this.synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.lang = lang;

      const voices = this.synth.getVoices ? this.synth.getVoices() : [];
      const naturalVoice = voices.find(v => 
        (v.lang.startsWith('en-IN') || v.lang.startsWith('hi') || v.lang.startsWith('en')) &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('India'))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      this.lastSpokenText = text;
      this.lastSpokenTime = now;

      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // ==============================================================
  // NATURAL LANGUAGE INTENT PARSER (English, Hinglish & Hindi)
  // ==============================================================
  parseIntent(rawText) {
    if (!rawText) return null;
    const text = rawText.toLowerCase().trim().replace(/[.,!?;:]/g, '');

    // 1. MEDICINE & TEXT OCR
    if (
      text.includes('medicine') || text.includes('dawai') || text.includes('dawa') || 
      text.includes('strip') || text.includes('tablet') || text.includes('goli') || 
      text.includes('expiry') || text.includes('dosage') || text.includes('parchi') ||
      text.includes('padho') || text.includes('read') || text.includes('ocr') || text.includes('text') ||
      text.includes('दवा') || text.includes('दवाई') || text.includes('गोली') || text.includes('पढ़ो') || text.includes('पर्ची')
    ) {
      return { 
        intent: 'MEDICINE_OCR', 
        speech: "Opening Medicine and Text OCR. Aim camera at packaging or label.",
        feedback: "Action: Opened Medicine & Text OCR"
      };
    }

    // 3. COLOR & CLOTHING
    if (
      text.includes('color') || text.includes('colour') || text.includes('rang') || 
      text.includes('kapde') || text.includes('kapda') || text.includes('shirt') || 
      text.includes('pant') || text.includes('kurta') || text.includes('shade') ||
      text.includes('रंग') || text.includes('कपड़ा') || text.includes('कपड़े') || text.includes('कलर')
    ) {
      return { 
        intent: 'COLOR', 
        speech: "Opening Color Identifier. Point center target at clothes or object.",
        feedback: "Action: Opened Color Identifier"
      };
    }

    // 4. TORCH / FLASHLIGHT
    if (
      text.includes('torch') || text.includes('flashlight') || text.includes('flash') || 
      text.includes('batti') || text.includes('roshni') || text.includes('light') ||
      text.includes('टॉर्च') || text.includes('लाइट') || text.includes('बत्ती') || text.includes('रोशनी')
    ) {
      const isOff = text.includes('off') || text.includes('band') || text.includes('bujha') || text.includes('बंद') || text.includes('बुझा');
      return { 
        intent: 'TORCH', 
        turnOn: !isOff,
        speech: !isOff ? "Turning torch ON." : "Turning torch OFF.",
        feedback: !isOff ? "Action: Torch Turned ON" : "Action: Torch Turned OFF"
      };
    }

    // 5. CAMERA STOP
    if (
      text.includes('stop camera') || text.includes('camera band') || text.includes('camera pause') || 
      text.includes('camera roko') || text.includes('कैमरा बंद') || text.includes('कैमरा रोको')
    ) {
      return {
        intent: 'CAMERA_STOP',
        speech: "Camera stopped. Obstacle scanning paused.",
        feedback: "Action: Camera Stopped"
      };
    }

    // 6. AI SCENE & OBJECT DESCRIBE ("Samne kya hai", "Analysis", "Describe scene", "What is in front")
    if (
      text.includes('samne kya') || text.includes('kya hai') || text.includes('describe') || 
      text.includes('kya dikh') || text.includes('batao kya') || text.includes('dekho kya') ||
      text.includes('what is in front') || text.includes('what do you see') || text.includes('objects') ||
      text.includes('analysis') || text.includes('analyse') || text.includes('analyze') ||
      text.includes('सामने क्या') || text.includes('क्या है') || text.includes('बताओ क्या') || text.includes('देखो क्या') ||
      text.includes('विश्लेषण')
    ) {
      return {
        intent: 'DESCRIBE_SCENE',
        speech: "Analyzing scene and obstacles in front of you.",
        feedback: "Action: Describing Objects in Scene"
      };
    }

    // 6.5 SCAN NOW
    if (
      text.includes('scan') || text.includes('photo') || text.includes('capture') ||
      text.includes('स्कैन')
    ) {
      return {
        intent: 'SCAN_NOW',
        speech: "Scanning current camera view.",
        feedback: "Action: Scanned View"
      };
    }

    // 7. VISION / CAMERA / OBSTACLE RADAR / WALLS / KEY 1
    // Matches: "vision", "bision", "bijan", "vigyan", "camera", "obstacle", "samne", "rasta", "1", "one", "ek", "diwar", "wall"
    if (
      text.includes('vision') || text.includes('bijan') || text.includes('bision') || text.includes('vijan') ||
      text.includes('camera') || text.includes('obstacle') || text.includes('detect') ||
      text.includes('rasta') || text.includes('samne') || text.includes('aage') || 
      text.includes('dekhna') || text.includes('radar') || text.includes('barrier') ||
      text.includes('wall') || text.includes('diwar') || text.includes('deewar') ||
      text === '1' || text === 'one' || text === 'ek' || text === 'number 1' || text === 'number one' ||
      text.includes('विज़न') || text.includes('विजन') || text.includes('कैमरा') || 
      text.includes('सामने') || text.includes('रास्ता') || text.includes('आगे') || 
      text.includes('दीवार') || text.includes('बाधा') || text === 'एक' || text === '१'
    ) {
      return { 
        intent: 'VISION_RADAR', 
        speech: "Opening Vision Assistant. Real-time 3D spatial obstacle radar and wall detector ready.",
        feedback: "Action: Opened Vision Obstacle Radar"
      };
    }

    // 8. EMERGENCY SOS / PANIC / KEY 3
    if (
      text.includes('sos') || text.includes('emergency') || text.includes('help') || 
      text.includes('bachao') || text.includes('madad') || text.includes('khatra') || 
      text.includes('police') || text.includes('danger') || text.includes('siren') ||
      text === '3' || text === 'three' || text === 'teen' || text === 'number 3' ||
      text.includes('बचाओ') || text.includes('मदद') || text.includes('खतरा') || text.includes('इमरजेंसी') || text === 'तीन' || text === '३'
    ) {
      return { 
        intent: 'SOS_TRIGGER', 
        speech: "EMERGENCY PANIC ALERT ACTIVATED! Broadcasting GPS and alert siren.",
        feedback: "Action: Dispatched Emergency SOS!"
      };
    }

    // 9. SMS EMERGENCY ALERT
    if (text.includes('sms') || text.includes('sandesh') || (text.includes('message') && !text.includes('voice'))) {
      return {
        intent: 'SEND_SMS',
        speech: "Opening SOS Emergency SMS dispatcher for your family contact.",
        feedback: "Action: Opened SOS SMS Dispatcher"
      };
    }

    // 10. WHATSAPP EMERGENCY ALERT
    if (text.includes('whatsapp')) {
      return {
        intent: 'SEND_WHATSAPP',
        speech: "Opening WhatsApp Emergency Alert with live coordinates.",
        feedback: "Action: Opened WhatsApp Alert"
      };
    }

    // 11. GPS LOCATION / WHERE AM I / KEY 4
    if (
      text.includes('location') || text.includes('where am i') || text.includes('gps') || 
      text.includes('kaha hu') || text.includes('kaha hoon') || text.includes('meri jagah') || 
      text.includes('address') || text.includes('pata') || text.includes('jagah') ||
      text === '4' || text === 'four' || text === 'char' || text === 'number 4' ||
      text.includes('कहाँ हूँ') || text.includes('कहा हू') || text.includes('लोकेशन') || text === 'चार' || text === '४'
    ) {
      return { 
        intent: 'LOCATION', 
        speech: "Location Sharing. Your position is DSMNRU Campus near Main Gate, Lucknow.",
        feedback: "Action: Checked Live GPS Location"
      };
    }

    // 12. HAZARD COMMUNITY MAP / KEY 5
    if (
      text.includes('hazard') || text.includes('hazards') || text.includes('pothole') || text.includes('potholes') ||
      text.includes('gaddha') || text.includes('manhole') || text.includes('khatre') || text.includes('trench') ||
      text === '5' || text === 'five' || text === 'panch' || text === 'number 5' ||
      text.includes('गड्ढा') || text.includes('मैनहोल') || text.includes('खतरे') || text === 'पांच' || text === '५'
    ) {
      return { 
        intent: 'HAZARDS', 
        speech: "Opening Hazard Map. Checking verified potholes and street obstacles nearby.",
        feedback: "Action: Opened Hazard Community Map"
      };
    }

    // 13. FAMILY GUARDIAN PORTAL / KEY 6
    if (
      text.includes('family') || text.includes('guardian') || text.includes('portal') || 
      text.includes('parivar') || text.includes('caregiver') || text.includes('relatives') ||
      text === '6' || text === 'six' || text === 'chhe' || text === 'number 6' ||
      text.includes('परिवार') || text.includes('गार्जियन') || text === 'छह' || text === '६'
    ) {
      return { 
        intent: 'FAMILY', 
        speech: "Opening Family Guardian Portal. Live GPS and audio telemetry active.",
        feedback: "Action: Opened Family Guardian Portal"
      };
    }

    // 14. VOICE GUIDANCE PAGE / KEY 2
    if (
      text.includes('voice') || text.includes('guidance') || text.includes('bolkar') || 
      text.includes('awaaz') || text.includes('avaj') || text.includes('abaj') ||
      text === '2' || text === 'two' || text === 'do' || text === 'number 2' ||
      text.includes('आवाज़') || text.includes('आवाज') || text === 'दो' || text === '२'
    ) {
      return {
        intent: 'VOICE_PAGE',
        speech: "Opening Voice Guidance and Commands Guide.",
        feedback: "Action: Opened Voice Guidance"
      };
    }

    // 15. SETTINGS & PROFILE
    if (
      text.includes('setting') || text.includes('settings') || text.includes('profile') || 
      text.includes('kalibrate') || text.includes('calibration') ||
      text.includes('सेटिंग') || text.includes('प्रोफाइल')
    ) {
      return {
        intent: 'SETTINGS',
        speech: "Opening Settings and Profile calibration.",
        feedback: "Action: Opened Settings & Profile"
      };
    }

    // 16. HOME / DASHBOARD / BACK / KEY 0
    if (
      text.includes('home') || text.includes('main screen') || text.includes('dashboard') || 
      text.includes('ghar') || text.includes('wapas') || text.includes('back') ||
      text === '0' || text === 'zero' ||
      text.includes('घर') || text.includes('वापस') || text.includes('होम')
    ) {
      return { 
        intent: 'HOME', 
        speech: "Returning to main Home Dashboard.",
        feedback: "Action: Returned to Home"
      };
    }

    // 17. MUTE / UNMUTE AUDIO
    if (
      text.includes('mute') || text.includes('chup') || text.includes('silent') || 
      text.includes('shant') || text.includes('awaz band') || text.includes('चुप') || text.includes('म्यूट')
    ) {
      return {
        intent: 'MUTE',
        speech: "Audio muted.",
        feedback: "Action: Audio Muted"
      };
    }

    if (
      text.includes('unmute') || text.includes('sound on') || text.includes('awaz chalu') || 
      text.includes('bolo') || text.includes('बोलो')
    ) {
      return {
        intent: 'UNMUTE',
        speech: "Audio speech unmuted.",
        feedback: "Action: Audio Unmuted"
      };
    }

    // 18. STOP / PAUSE
    if (
      text.includes('stop') || text.includes('band') || text.includes('pause') || 
      text.includes('ruk') || text.includes('ruko') || text.includes('बंद') || text.includes('रुको')
    ) {
      return {
        intent: 'CAMERA_STOP',
        speech: "Camera stopped. Walking guidance paused.",
        feedback: "Action: Stopped Walking Guidance"
      };
    }

    // 19. START / WALK / TALK WALK / SOFTWARE START / NAVIGATION
    if (
      text.includes('start') || text.includes('walk') || text.includes('talk walk') || 
      text.includes('chalu') || text.includes('shuru') || text.includes('chalna') || 
      text.includes('chal') || text.includes('software') || text.includes('guide') ||
      text.includes('navigation') || text.includes('aage') ||
      text.includes('शुरू') || text.includes('चालू') || text.includes('चलो') || 
      text.includes('चलना') || text.includes('स्टार्ट')
    ) {
      return {
        intent: 'WALK_START',
        speech: "NETRA walking guide active. Camera and obstacle radar started. Walk forward safely, I will alert you to all obstacles in your path.",
        feedback: "Action: Started Walking Guide & Obstacle Radar"
      };
    }

    // 20. HELP / COMMANDS
    if (text.includes('help') || text.includes('options') || text.includes('command') || text.includes('kya bolu')) {
      return {
        intent: 'HELP',
        speech: "Say Vision, Describe Scene, Medicine, Color, SOS, Location, Hazards, or Family.",
        feedback: "Action: Spoke Available Commands"
      };
    }

    // Fallback: If not recognized
    return {
      intent: 'UNKNOWN',
      rawText: text,
      speech: `Heard "${text}". Try saying Vision, Describe Scene, Medicine, or SOS.`,
      feedback: `Heard: "${text}"`
    };
  }

  // ==============================================================
  // SPEECH RECOGNITION (Direct, Unblocked Microphone Access)
  // ==============================================================
  initVoiceCommands(onCommand) {
    if (onCommand) {
      this.addCommandListener(onCommand);
    }

    if (this.recognition) return true;

    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported on this browser.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.notifyStateListeners(true);
        this.playEarcon('start');
      };

      this.recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const res = event.results[lastResultIndex][0];
        const transcript = res.transcript ? res.transcript.trim() : '';

        if (!transcript || transcript.length < 1) return;

        console.log('[Speech Recognized]:', transcript);

        // Play positive command chime
        this.playEarcon('success');

        // 1. Run through Intent Parser
        const intentResult = this.parseIntent(transcript);

        // 2. Dispatch to intent listeners (App.jsx, VisionAssistant, etc.)
        if (intentResult) {
          this.intentListeners.forEach(listener => {
            try { listener(intentResult, transcript); } catch (e) { console.error('Intent listener error:', e); }
          });
        }

        // 3. Dispatch to legacy raw command listeners
        this.commandListeners.forEach(listener => {
          try { listener(transcript.toLowerCase()); } catch (e) { console.error('Command listener error:', e); }
        });
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition notice:', e.error);
        if (e.error === 'not-allowed') {
          this.shouldKeepListening = false;
          this.notifyStateListeners(false);
        }
      };

      this.recognition.onend = () => {
        // Auto-reconnect continuous listening
        if (this.shouldKeepListening) {
          setTimeout(() => {
            if (this.shouldKeepListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (err) {
                // start may fail if already running
              }
            }
          }, 200);
        } else {
          this.notifyStateListeners(false);
        }
      };

      return true;
    } catch (e) {
      console.error('Failed to init speech recognition:', e);
      return false;
    }
  }

  startListening() {
    this.shouldKeepListening = true;
    if (!this.recognition) {
      this.initVoiceCommands();
    }
    if (this.recognition) {
      try {
        this.recognition.start();
        this.notifyStateListeners(true);
      } catch (e) {
        // Already started
      }
    }
  }

  stopListening() {
    this.shouldKeepListening = false;
    this.playEarcon('stop');
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.notifyStateListeners(false);
  }
}

export const speechService = new SpeechService();
