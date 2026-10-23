// Audio and Spatial Audio Service using Web Audio API
class AudioService {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play spatial audio cue with Left/Right panning and distance-based pitch
  // position: -1 (far left) to +1 (far right), 0 = center
  // distance: meters (e.g. 1.0 to 5.0)
  playSpatialPing(position = 0, distance = 2.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch based on proximity: closer = higher frequency (urgent)
      // 1.0m -> 880Hz (A5), 3.0m -> 440Hz (A4), 5.0m -> 220Hz (A3)
      const baseFreq = Math.max(220, Math.min(880, 1000 - distance * 150));
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.type = distance < 1.5 ? 'sawtooth' : 'sine';

      // Gain (volume) envelope
      const maxVol = Math.max(0.1, Math.min(0.7, 1.2 / Math.max(distance, 0.5)));
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(maxVol, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      // Spatial Panning
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        // Clamped between -1 and 1
        const clampedPan = Math.max(-1, Math.min(1, position));
        panner.pan.setValueAtTime(clampedPan, this.ctx.currentTime);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.ctx.destination);
      } else {
        // Fallback for browsers without StereoPanner
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);

      // Trigger haptic vibration on mobile if obstacle is close (<1.8m)
      if (distance < 1.8 && navigator.vibrate) {
        navigator.vibrate(distance < 1.0 ? [150, 50, 150] : [80]);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }

  // High-intensity Emergency SOS siren
  playSiren() {
    this.init();
    if (!this.ctx) return null;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      
      const now = this.ctx.currentTime;
      // Frequency sweep up and down
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.3);
      osc.frequency.linearRampToValueAtTime(600, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.9);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);

      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 400]);
      }
      return osc;
    } catch (err) {
      console.warn('Siren playback error:', err);
      return null;
    }
  }

  // Soft confirm beep
  playTone(freq = 520, duration = 0.15) {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  }
}

export const audioService = new AudioService();
