// Speech Synthesis & Recognition Service with Hardware Noise Suppression, 
// Earcon Audio Chimes, and Natural Language Intent Parser for Indian English, Hinglish & Hindi

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
    this.noiseStream = null;
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
  // 1. HARDWARE NOISE SUPPRESSION & EARCON AUDIO CHIMES
  // ==============================================================
  async enableHardwareNoiseSuppression() {
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        if (this.noiseStream) return;
        this.noiseStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true },
            channelCount: 1,
            sampleRate: 48000
          }
        });
        console.log('[SpeechService] Hardware noise suppression & echo cancellation activated.');
      }
    } catch (e) {
      console.warn('[SpeechService] Hardware noise suppression fallback:', e);
    }
  }

  disableHardwareNoiseSuppression() {
    if (this.noiseStream) {
      this.noiseStream.getTracks().forEach(t => t.stop());
      this.noiseStream = null;
    }
  }

  // Audio Earcon Beep for Blind Users (Start, Success, Stop)
  playEarcon(type = 'start') {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContext();
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
        // Two rising chimes: 520Hz -> 680Hz (Mic listening active)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'success') {
        // Quick high confirmation chime: 880Hz (Action executed)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1046, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
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
  // 2. NOISE FILTERING & VALIDATION (Rejects breaths, clicks, static)
  // ==============================================================
  isNoiseOrGarbage(text, confidence = 1) {
    if (!text || text.length < 2) return true;
    const clean = text.toLowerCase().trim();

    // Confidence filter: if browser reports confidence < 0.35, it's noise
    if (confidence !== undefined && confidence > 0 && confidence < 0.35) {
      console.log('[SpeechService] Discarded low-confidence noise:', clean, confidence);
      return true;
    }

    // Common non-speech noise syllables
    const NOISE_SYLLABLES = new Set([
      'uh', 'um', 'ah', 'oh', 'eh', 'mm', 'mmm', 'shh', 'tsk', 
      'ha', 'huh', 'hmm', 'hmmm', 'er', 'ur', 'pff', 'sh', 'ss', 
      'sss', 'zz', 'zzz', 'ha ha', 'aah', 'ooh'
    ]);
    if (NOISE_SYLLABLES.has(clean)) {
      console.log('[SpeechService] Filtered ambient syllable noise:', clean);
      return true;
    }

    // Check for repetitive keyboard or mic stutter (e.g. "aaaaa", "kkkk")
    if (/^(.)\1{2,}$/.test(clean)) {
      return true;
    }

    return false;
  }

  // ==============================================================
  // 3. TEXT-TO-SPEECH (Spoken Audio Announcements)
  // ==============================================================
  speak(text, { priority = false, minIntervalMs = 2000, lang = 'en-IN' } = {}) {
    if (this.isMuted || !this.synth) return;

    const now = Date.now();
    if (!priority && text === this.lastSpokenText && now - this.lastSpokenTime < minIntervalMs) {
      return; // Suppress duplicate spam
    }

    if (priority) {
      this.synth.cancel(); // Interrupt non-critical speech immediately
    } else if (this.synth.speaking) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.lang = lang;

    // Pick natural voice if available
    const voices = this.synth.getVoices();
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
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // ==============================================================
  // 4. NATURAL LANGUAGE INTENT PARSER (English + Hinglish + Hindi)
  // ==============================================================
  parseIntent(rawText) {
    if (!rawText) return null;
    const text = rawText.toLowerCase().trim();

    // 1. CURRENCY (₹10 - ₹500 Indian Banknotes)
    if (
      text.includes('currency') || text.includes('paisa') || text.includes('paise') || 
      text.includes('rupaye') || text.includes('rupee') || text.includes('rupees') || 
      text.includes('note') || text.includes('kitne ka') || text.includes('kitna') ||
      text.includes('पैसे') || text.includes('रुपया') || text.includes('रुपये') || text.includes('नोट') || text.includes('करेंसी')
    ) {
      return { 
        intent: 'CURRENCY', 
        speech: "Opening Indian Currency Reader. Align note inside camera frame.",
        feedback: "Action: Opened Currency Reader (₹10 - ₹500)"
      };
    }

    // 2. MEDICINE & TEXT OCR (Medicine packaging, dosage, expiry, signage)
    if (
      text.includes('medicine') || text.includes('dawai') || text.includes('dawa') || 
      text.includes('strip') || text.includes('tablet') || text.includes('goli') || 
      text.includes('expiry') || text.includes('dosage') || text.includes('parchi') ||
      (text.includes('read') && !text.includes('screen')) || text.includes('padho') || text.includes('ocr') ||
      text.includes('दवा') || text.includes('दवाई') || text.includes('गोली') || text.includes('पढ़ो') || text.includes('पर्ची')
    ) {
      return { 
        intent: 'MEDICINE_OCR', 
        speech: "Opening Medicine and Text OCR. Aim camera at packaging or label.",
        feedback: "Action: Opened Medicine & Text OCR"
      };
    }

    // 3. COLOR & CLOTHING (Dress, shirt, color swatch)
    if (
      text.includes('color') || text.includes('colour') || text.includes('rang') || 
      text.includes('kapde') || text.includes('kapda') || text.includes('shirt') || 
      text.includes('pant') || text.includes('kurta') ||
      text.includes('रंग') || text.includes('कपड़ा') || text.includes('कपड़े') || text.includes('कलर')
    ) {
      return { 
        intent: 'COLOR', 
        speech: "Opening Color Identifier. Point center reticle at clothes or object.",
        feedback: "Action: Opened Color Identifier"
      };
    }

    // 4. TORCH / FLASHLIGHT (On/Off)
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

    // 5. CAMERA START / STOP (In Vision Assistant)
    if (
      (text.includes('camera') || text.includes('video')) && 
      (text.includes('stop') || text.includes('band') || text.includes('pause') || text.includes('ruk') || text.includes('बंद') || text.includes('रोको'))
    ) {
      return {
        intent: 'CAMERA_STOP',
        speech: "Camera stopped. Obstacle scanning paused.",
        feedback: "Action: Camera Stopped"
      };
    }

    if (
      (text.includes('camera') || text.includes('video')) && 
      (text.includes('start') || text.includes('chalu') || text.includes('on') || text.includes('resume') || text.includes('shuru') || text.includes('चालू') || text.includes('शुरू'))
    ) {
      return {
        intent: 'CAMERA_START',
        speech: "Camera started. Obstacle scanning active.",
        feedback: "Action: Camera Started"
      };
    }

    // 6. SCAN NOW / BATAO / DEKHO
    if (
      text.includes('scan') || text.includes('batao') || text.includes('dekho') || 
      text.includes('kya hai') || text.includes('photo') || text.includes('capture') ||
      text.includes('स्कैन') || text.includes('बताओ') || text.includes('देखो')
    ) {
      return {
        intent: 'SCAN_NOW',
        speech: "Scanning current camera view.",
        feedback: "Action: Scanned View"
      };
    }

    // 7. OBSTACLES & VISION RADAR (Default Vision Mode)
    if (
      text.includes('vision') || text.includes('camera') || text.includes('obstacle') || 
      text.includes('rasta') || text.includes('samne') || text.includes('aage') || 
      text.includes('dekhna') || text.includes('radar') || text.includes('barrier') ||
      text.includes('सामने') || text.includes('रास्ता') || text.includes('आगे') || text.includes('कैमरा') || text.includes('बाधा')
    ) {
      return { 
        intent: 'VISION_RADAR', 
        speech: "Opening Vision Assistant. Real-time 3D spatial obstacle radar ready.",
        feedback: "Action: Opened Vision Obstacle Radar"
      };
    }

    // 8. EMERGENCY SOS / PANIC ALERT
    if (
      text.includes('sos') || text.includes('emergency') || text.includes('help') || 
      text.includes('bachao') || text.includes('madad') || text.includes('khatra') || 
      text.includes('police') || text.includes('ambulance') || text.includes('danger') ||
      text.includes('बचाओ') || text.includes('मदद') || text.includes('खतरा') || text.includes('इमरजेंसी')
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

    // 11. GPS LOCATION / WHERE AM I
    if (
      text.includes('location') || text.includes('where am i') || text.includes('gps') || 
      text.includes('kaha hu') || text.includes('kaha hoon') || text.includes('meri jagah') || 
      text.includes('address') || text.includes('pata') ||
      text.includes('कहाँ हूँ') || text.includes('कहा हू') || text.includes('लोकेशन') || text.includes('पता')
    ) {
      return { 
        intent: 'LOCATION', 
        speech: "Location Sharing. Your position is DSMNRU Campus near Main Gate, Lucknow.",
        feedback: "Action: Checked Live GPS Location"
      };
    }

    // 12. HAZARD COMMUNITY MAP
    if (
      text.includes('hazard') || text.includes('pothole') || text.includes('gaddha') || 
      text.includes('manhole') || text.includes('khatre') || text.includes('trench') ||
      text.includes('गड्ढा') || text.includes('मैनहोल') || text.includes('खतरे')
    ) {
      return { 
        intent: 'HAZARDS', 
        speech: "Opening Hazard Map. Checking verified potholes and street obstacles nearby.",
        feedback: "Action: Opened Hazard Community Map"
      };
    }

    // 13. FAMILY GUARDIAN PORTAL
    if (
      text.includes('family') || text.includes('guardian') || text.includes('portal') || 
      text.includes('parivar') || text.includes('caregiver') || text.includes('relatives') ||
      text.includes('परिवार') || text.includes('गार्जियन')
    ) {
      return { 
        intent: 'FAMILY', 
        speech: "Opening Family Guardian Portal. Live GPS and audio telemetry active.",
        feedback: "Action: Opened Family Guardian Portal"
      };
    }

    // 14. SETTINGS & PROFILE
    if (
      text.includes('setting') || text.includes('settings') || text.includes('profile') || 
      text.includes('kalibrate') || text.includes('calibration') || text.includes('setting kholo')
    ) {
      return {
        intent: 'SETTINGS',
        speech: "Opening Settings and Profile calibration.",
        feedback: "Action: Opened Settings & Profile"
      };
    }

    // 15. HOME / DASHBOARD / BACK
    if (
      text.includes('home') || text.includes('main screen') || text.includes('dashboard') || 
      text.includes('ghar') || text.includes('wapas') || text.includes('back') ||
      text.includes('घर') || text.includes('वापस') || text.includes('होम')
    ) {
      return { 
        intent: 'HOME', 
        speech: "Returning to main Home Dashboard.",
        feedback: "Action: Returned to Home"
      };
    }

    // 16. MUTE / UNMUTE AUDIO
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

    // 17. READ SCREEN / SUMMARIZE
    if (text.includes('read screen') || text.includes('kya hai screen') || text.includes('screen batao')) {
      return {
        intent: 'READ_SCREEN',
        speech: "Reading current screen summary.",
        feedback: "Action: Reading Screen Summary"
      };
    }

    // 18. HELP / COMMANDS
    if (
      text.includes('help') || text.includes('options') || text.includes('kya bolu') || 
      text.includes('command') || text.includes('commands') || text.includes('madad chahiye')
    ) {
      return {
        intent: 'HELP',
        speech: "Available voice commands: Currency, Medicine, Color, Vision Camera, SOS, Location, Hazards, Family, Torch, and Home.",
        feedback: "Action: Spoke Available Commands"
      };
    }

    // Unrecognized intent
    return {
      intent: 'UNKNOWN',
      rawText: text,
      speech: `Heard: "${text}". Say Currency, Medicine, Camera, or SOS.`,
      feedback: `Heard: "${text}" (Say 'Help' for list)`
    };
  }

  // ==============================================================
  // 5. SPEECH RECOGNITION WITH ACTIVE NOISE SUPPRESSION
  // ==============================================================
  initVoiceCommands() {
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
        const transcript = res.transcript.trim();
        const confidence = res.confidence;

        // Filter out background noise, clicks, breathing, and static
        if (this.isNoiseOrGarbage(transcript, confidence)) {
          return;
        }

        console.log('[SpeechService Voice Command Accepted]:', transcript, `(Confidence: ${Math.round(confidence * 100)}%)`);

        // Play positive command chime
        this.playEarcon('success');

        // 1. Run through Intent Parser
        const intentResult = this.parseIntent(transcript);

        // 2. Dispatch to intent listeners
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
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          this.shouldKeepListening = false;
          this.notifyStateListeners(false);
          this.disableHardwareNoiseSuppression();
        }
      };

      this.recognition.onend = () => {
        // Auto-reconnect with noise suppression if user enabled hands-free voice mode
        if (this.shouldKeepListening) {
          setTimeout(() => {
            if (this.shouldKeepListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (err) {
                // start may fail if already running
              }
            }
          }, 300);
        } else {
          this.notifyStateListeners(false);
          this.disableHardwareNoiseSuppression();
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
    this.enableHardwareNoiseSuppression();
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
    this.disableHardwareNoiseSuppression();
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