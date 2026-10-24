// Smart Assist Service: Text & Medicine OCR, Color Identifier, and Auto-Torch
import { speechService } from './speechService';
import { audioService } from './audioService';

class SmartAssistService {
  constructor() {
    this.torchActive = false;
    this.mediaStreamTrack = null;
    this.lastColorHeard = '';
    this.lastTextHeard = '';
  }

  setMediaStreamTrack(track) {
    this.mediaStreamTrack = track;
  }

  // ==========================================
  // 1. TEXT & MEDICINE OCR READER
  // ==========================================
  // Reads printed medicine labels, expiry dates, dosage, and door signage
  getDemoMedicalOcr(sampleKey = 'paracetamol') {
    const samples = {
      paracetamol: {
        title: 'Paracetamol Tablets IP 650mg',
        dosage: 'Take 1 tablet every 6 hours after meals with water',
        expiry: 'EXP: 12/2027 (Safe to use)',
        caution: 'Do not exceed 4 tablets in 24 hours. Keep out of reach of children.',
        batch: 'B.No. PCT-9941',
        manufacturer: 'Cipla Health Care Ltd.'
      },
      amoxicillin: {
        title: 'Amoxicillin Trihydrate 500mg Capsules',
        dosage: 'Antibiotic - 1 capsule twice daily for 5 days',
        expiry: 'EXP: 08/2026 (Safe to use)',
        caution: 'Complete full prescribed course. Prescription medicine.',
        batch: 'B.No. AMX-3312',
        manufacturer: 'Sun Pharma Ltd.'
      },
      cetirizine: {
        title: 'Cetirizine Hydrochloride 10mg',
        dosage: 'Anti-allergic - 1 tablet at night before bed',
        expiry: 'EXP: 04/2028 (Safe to use)',
        caution: 'May cause mild drowsiness. Avoid driving.',
        batch: 'B.No. CTZ-7710',
        manufacturer: 'Dr. Reddy Labs'
      },
      doorsign: {
        title: 'Room 204 - Computer Science & AI Lab',
        dosage: 'Tactile Braille plate located on door frame right side',
        expiry: 'Office Hours: 09:00 AM - 05:00 PM',
        caution: 'Push door gently inward.',
        batch: 'Academic Block B',
        manufacturer: 'DSMNRU Campus Facilities'
      }
    };
    return samples[sampleKey] || samples.paracetamol;
  }

  // ==========================================
  // 3. COLOR IDENTIFIER (Clothes, Objects)
  // ==========================================
  identifyColor(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;

    // Sample central 30x30 pixels (reticle center)
    const cx = Math.round(width / 2) - 15;
    const cy = Math.round(height / 2) - 15;
    const imgData = ctx.getImageData(cx, cy, 30, 30).data;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      r += imgData[i];
      g += imgData[i + 1];
      b += imgData[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const [h, s, l] = this.rgbToHsl(r, g, b);
    const colorName = this.classifyColorName(h, s, l, r, g, b);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    return {
      name: colorName.name,
      category: colorName.category,
      hex,
      r, g, b
    };
  }

  classifyColorName(h, s, l, r, g, b) {
    if (l < 0.15) return { name: 'Black (काली)', category: 'Dark' };
    if (l > 0.88 && s < 0.20) return { name: 'White (सफ़ेद)', category: 'Light' };
    if (s < 0.15) return { name: 'Grey (धूसर)', category: 'Neutral' };

    if (h < 15 || h >= 345) return { name: 'Red (लाल)', category: 'Primary Warm' };
    if (h >= 15 && h < 45) return { name: 'Orange / Saffron (नारंगी)', category: 'Warm' };
    if (h >= 45 && h < 70) return { name: 'Yellow (पीला)', category: 'Bright Warm' };
    if (h >= 70 && h < 165) return { name: 'Green (हरा)', category: 'Cool Natural' };
    if (h >= 165 && h < 200) return { name: 'Cyan / Sky Blue (आसमानी)', category: 'Cool' };
    if (h >= 200 && h < 260) return { name: 'Blue / Navy (नीला)', category: 'Cool' };
    if (h >= 260 && h < 315) return { name: 'Purple / Violet (बैंगनी)', category: 'Rich' };
    if (h >= 315 && h < 345) return { name: 'Pink / Magenta (गुलाबी)', category: 'Bright' };

    return { name: 'Neutral Tone', category: 'General' };
  }

  // ==========================================
  // 4. HARDWARE TORCH / FLASHLIGHT CONTROL
  // ==========================================
  async setTorch(turnOn) {
    if (!this.mediaStreamTrack) {
      console.warn('No active camera video track available for torch.');
      return false;
    }

    try {
      const capabilities = this.mediaStreamTrack.getCapabilities ? this.mediaStreamTrack.getCapabilities() : {};
      if (capabilities.torch) {
        await this.mediaStreamTrack.applyConstraints({
          advanced: [{ torch: turnOn }]
        });
        this.torchActive = turnOn;
        return true;
      } else {
        console.warn('Device hardware flashlight not supported on this track.');
        return false;
      }
    } catch (err) {
      console.warn('Failed to toggle device torch:', err);
      return false;
    }
  }

  // ==========================================
  // 5. AUTO-TORCH LOW-LIGHT DETECTOR
  // ==========================================
  // Calculates average luminosity of current video frame
  checkLowLightAndAutoTorch(canvas, threshold = 40) {
    if (!canvas || !this.mediaStreamTrack) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;

    // Sample sparse grid of 100 points
    const stepX = Math.floor(width / 10);
    const stepY = Math.floor(height / 10);
    let totalLuminance = 0, samples = 0;

    for (let x = stepX; x < width; x += stepX) {
      for (let y = stepY; y < height; y += stepY) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        // Standard perceived luminance formula (ITU-R BT.709)
        const lum = 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
        totalLuminance += lum;
        samples++;
      }
    }

    const avgLuminance = Math.round(totalLuminance / samples);

    if (avgLuminance < threshold && !this.torchActive) {
      this.setTorch(true);
      speechService.speak("Low light environment detected. Hardware torch auto-activated.");
    } else if (avgLuminance > threshold + 25 && this.torchActive) {
      // Light restored, auto-shutoff
      this.setTorch(false);
      speechService.speak("Adequate ambient light restored. Torch auto-off.");
    }
  }

  // Helper RGB to HSL conversion
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), s, l];
  }
}

export const smartAssistService = new SmartAssistService();
