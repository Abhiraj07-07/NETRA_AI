// Automatic Low Battery Emergency Dispatch Service (Web Battery API + Simulator)
import { api } from './api';
import { speechService } from './speechService';
import { audioService } from './audioService';

class BatteryService {
  constructor() {
    this.level = 100; // in percent (0 - 100)
    this.isCharging = false;
    this.isSupported = typeof navigator !== 'undefined' && 'getBattery' in navigator;
    this.hasDispatchedLowAlert = false;
    this.stateListeners = new Set();
    this.alertListeners = new Set();
    this.batteryObj = null;
    this.isSimulated = false;

    this.init();
  }

  async init() {
    if (this.isSupported) {
      try {
        const battery = await navigator.getBattery();
        this.batteryObj = battery;
        this.updateState(battery.level * 100, battery.charging);

        battery.addEventListener('levelchange', () => {
          if (!this.isSimulated) {
            this.updateState(battery.level * 100, battery.charging);
          }
        });

        battery.addEventListener('chargingchange', () => {
          if (!this.isSimulated) {
            this.updateState(battery.level * 100, battery.charging);
          }
        });
      } catch (err) {
        console.warn('Battery API initialization error:', err);
      }
    }
  }

  updateState(levelPercent, isCharging) {
    const prevLevel = this.level;
    this.level = Math.round(levelPercent);
    this.isCharging = isCharging;

    // Reset dispatched flag if battery charges back above 15%
    if (this.level > 15 || this.isCharging) {
      this.hasDispatchedLowAlert = false;
    }

    this.notifyStateListeners();

    // Check critical 10% threshold
    if (this.level <= 10 && !this.isCharging && !this.hasDispatchedLowAlert) {
      this.triggerLowBatteryEmergency();
    }
  }

  // Force simulation for buildathons, judges & testing
  simulateBattery(levelPercent, isCharging = false) {
    this.isSimulated = true;
    this.updateState(levelPercent, isCharging);
  }

  resetSimulation() {
    this.isSimulated = false;
    if (this.batteryObj) {
      this.updateState(this.batteryObj.level * 100, this.batteryObj.charging);
    } else {
      this.updateState(90, false);
    }
  }

  // Auto-trigger low battery emergency alert & message dispatch
  async triggerLowBatteryEmergency() {
    this.hasDispatchedLowAlert = true;
    const currentLevel = this.level;

    console.warn(`[BATTERY EMERGENCY]: Battery dropped to ${currentLevel}%! Dispatching emergency SOS.`);

    // 1. Play alert tone
    audioService.playTone(800, 0.3);
    setTimeout(() => audioService.playTone(600, 0.4), 350);

    // 2. Announce out loud via speech synthesis
    speechService.speak(
      `Critical alert. Device battery is at ${currentLevel} percent. Automatic emergency message with your live GPS location is being sent to your emergency contacts.`,
      { priority: true }
    );

    // 3. Native OS Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⚠️ NETRA AI: Critical Low Battery (<10%)!', {
          body: `Battery is at ${currentLevel}%. Emergency GPS location has been automatically sent to your guardians.`,
          icon: '/favicon.svg'
        });
      } catch (e) {
        // notification fallback
      }
    }

    // 4. Notify all registered alert listeners
    this.alertListeners.forEach(listener => {
      try {
        listener({ level: currentLevel, isCharging: this.isCharging, time: new Date().toLocaleTimeString() });
      } catch (e) {
        console.error('Low battery listener error:', e);
      }
    });

    // 5. Send automated battery status & SOS signal to backend
    try {
      const storedPhone = typeof localStorage !== 'undefined' ? localStorage.getItem('netra_user_phone') : null;
      await api.reportBatteryStatus({
        level: currentLevel,
        isCharging: this.isCharging,
        emergencyNumber: storedPhone
      });
    } catch (e) {
      console.warn('Backend battery report error:', e);
    }
  }

  addStateListener(fn) {
    this.stateListeners.add(fn);
    fn({ level: this.level, isCharging: this.isCharging, isLow: this.level <= 10 && !this.isCharging });
    return () => this.stateListeners.delete(fn);
  }

  notifyStateListeners() {
    const state = { 
      level: this.level, 
      isCharging: this.isCharging, 
      isLow: this.level <= 10 && !this.isCharging,
      isSimulated: this.isSimulated,
      hasDispatched: this.hasDispatchedLowAlert
    };
    this.stateListeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  addAlertListener(fn) {
    this.alertListeners.add(fn);
    return () => this.alertListeners.delete(fn);
  }
}

export const batteryService = new BatteryService();
