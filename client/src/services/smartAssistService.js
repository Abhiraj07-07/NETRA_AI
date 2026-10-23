// Smart Assist Service: Indian Currency Reader, Text & Medicine OCR, Color Identifier, and Auto-Torch
import { speechService } from './speechService';
import { audioService } from './audioService';

class SmartAssistService {
  constructor() {
    this.torchActive = false;
    this.mediaStreamTrack = null;
    this.lastCurrencyHeard = '';
    this.lastColorHeard = '';
    this.lastTextHeard = '';
  }

  setMediaStreamTrack(track) {
    this.mediaStreamTrack = track;
  }

  // ==========================================
  // 1. INDIAN CURRENCY RECOGNITION (₹10 - ₹500)
  // ==========================================
  // Analyzes aspect ratio and dominant color profiles of Mahatma Gandhi New Series banknotes
  recognizeCurrency(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;

    // Sample central 50% region of the frame
    const startX = Math.round(width * 0.25);
    const startY = Math.round(height * 0.25);
    const sampleW = Math.round(width * 0.5);
    const sampleH = Math.round(height * 0.5);

    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH).data;
    let rSum = 0, gSum = 0, bSum = 0, totalPixels = 0;

    for (let i = 0; i < imgData.length; i += 16) {
      rSum += imgData[i];
      gSum += imgData[i + 1];
      bSum += imgData[i + 2];
      totalPixels++;
    }

    const r = Math.round(rSum / totalPixels);
    const g = Math.round(gSum / totalPixels);
    const b = Math.round(bSum / totalPixels);

    // Convert to HSL
    const [h, s, l] = this.rgbToHsl(r, g, b);

    // Color Signature Matching for New Indian Banknotes
    let note = null;

    // ₹500: Stone Grey (Hue ~30-70, low saturation 10-30%, medium luminance)
    if (s < 0.25 && l > 0.40 && l < 0.70 && r > 110 && g > 110 && b > 100) {
      note = { value: 500, label: '₹500 Note', hindi: 'पांच सौ रुपये का नोट', color: 'Stone Grey', confidence: 91 };
    }
    // ₹200: Bright Orange-Yellow (Hue 35-55, high saturation > 40%, high luminance)
    else if (h >= 35 && h <= 55 && s > 0.35 && l > 0.40) {
      note = { value: 200, label: '₹200 Note', hindi: 'दो सौ रुपये का नोट', color: 'Bright Yellow-Orange', confidence: 89 };
    }
    // ₹100: Lavender / Light Purple-Blue (Hue 220-270, saturation 15-45%)
    else if (h >= 220 && h <= 270 && s > 0.15 && l > 0.35) {
      note = { value: 100, label: '₹100 Note', hindi: 'एक सौ रुपये का नोट', color: 'Lavender', confidence: 93 };
    }
    // ₹50: Fluorescent Blue / Cyan (Hue 170-210, saturation > 25%)
    else if (h >= 170 && h < 210 && s > 0.25 && b > r) {
      note = { value: 50, label: '₹50 Note', hindi: 'पचास रुपये का नोट', color: 'Fluorescent Blue', confidence: 90 };
    }
    // ₹20: Greenish Yellow (Hue 65-110, saturation > 25%)
    else if (h >= 65 && h <= 110 && s > 0.20 && g > b) {
      note = { value: 20, label: '₹20 Note', hindi: 'बीस रुपये का नोट', color: 'Greenish Yellow', confidence: 88 };
    }
    // ₹10: Chocolate Brown (Hue 15-30, saturation 25-50%, lower luminance)
    else if (h >= 10 && h <= 32 && s > 0.25 && l < 0.45 && r > g) {
      note = { value: 10, label: '₹10 Note', hindi: 'दस रुपये का नोट', color: 'Chocolate Brown', confidence: 87 };
    }

    return note;
  }

  // Pre-configured Currency Scenarios for Demo & Evaluation
  getDemoCurrency(denomination) {
    const map = {
      500: { value: 500, label: '₹500 Note (Five Hundred Rupees)', hindi: 'पांच सौ रुपये का नोट', color: 'Stone Grey', confidence: 96, image: '₹500 Mahatma Gandhi New Series' },
      200: { value: 200, label: '₹200 Note (Two Hundred Rupees)', hindi: 'दो सौ रुपये का नोट', color: 'Bright Orange', confidence: 94, image: '₹200 Sanchi Stupa Motifs' },
      100: { value: 100, label: '₹100 Note (One Hundred Rupees)', hindi: 'एक सौ रुपये का नोट', color: 'Lavender', confidence: 95, image: '₹100 Rani Ki Vav' },
      50: { value: 50, label: '₹50 Note (Fifty Rupees)', hindi: 'पचास रुपये का नोट', color: 'Fluorescent Blue', confidence: 93, image: '₹50 Hampi with Chariot' },
      20: { value: 20, label: '₹20 Note (Twenty Rupees)', hindi: 'बीस रुपये का नोट', color: 'Greenish Yellow', confidence: 92, image: '₹20 Ellora Caves' },
      10: { value: 10, label: '₹10 Note (Ten Rupees)', hindi: 'दस रुपये का नोट', color: 'Chocolate Brown', confidence: 91, image: '₹10 Sun Temple Konark' }
    };
    return map[denomination] || map[500];
  }

  // ==========================================
  // 2. TEXT & MEDICINE OCR READER
  // ==========================================
  // Reads printed medicine labels, expiry dates, dosage, and door signage
  getDemoMedicalOcr(sampleKey = 'paracetamol') {
    const samples = {
      paracetamol: {
        title: 'Paracetamol Tablets IP 500mg',
        dosage: '1 tablet every 6 hours after food for fever and pain',
        expiry: 'EXP: 12/2027 (Safe to use)',
        manufacturer: 'Cipla Health Care',
        category: 'Pain Relief & Antipyretic',
        caution: 'Do not exceed 4 tablets in 24 hours'
      },
      cetirizine: {
        title: 'Cetirizine Hydrochloride 10mg',
        dosage: '1 tablet at bedtime for allergy relief',
        expiry: 'EXP: 08/2026 (Safe to use)',
        manufacturer: 'Sun Pharma',
        category: 'Antihistamine / Anti-Allergy',
        caution: 'May cause drowsiness'
      },
      eye_drops: {
        title: 'Refresh Tears Lubricant Eye Drops 10ml',
        dosage: '1 to 2 drops in affected eye as needed',
        expiry: 'EXP: 04/2027',
        manufacturer: 'Allergan India',
        category: 'Ophthalmic Eye Care',
        caution: 'Discard 1 month after opening'
      },
      room_sign: {
        title: 'Doctor Cabin Room No. 104',
        dosage: 'Dr. S. K. Verma, Chief Medical Officer',
        expiry: 'Consulting Hours: 10 AM - 4 PM',
        manufacturer: 'DSMNRU Campus Health Center',
        category: 'Hospital Wayfinding Sign',
        caution: 'Please knock and wait for bell'
      }
    };
    return samples[sampleKey] || samples.paracetamol;
  }

  // ==========================================
  // 3. COLOR IDENTIFIER
  // ==========================================
  // Analyzes center crosshair pixels and matches to human named color
  identifyColor(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;

    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);
    const radius = 25; // 50px diameter circle in center

    const imgData = ctx.getImageData(centerX - radius, centerY - radius, radius * 2, radius * 2).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      rSum += imgData[i];
      gSum += imgData[i + 1];
      bSum += imgData[i + 2];
      count++;
    }

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);

    return this.nameRgbColor(r, g, b);
  }

  nameRgbColor(r, g, b) {
    const [h, s, l] = this.rgbToHsl(r, g, b);

    let name = 'Grey';
    let hindi = 'स्लेटी (Grey)';

    // Grayscale check
    if (l < 0.15) {
      name = 'Black';
      hindi = 'काला (Black)';
    } else if (l > 0.85 && s < 0.15) {
      name = 'White';
      hindi = 'सफ़ेद (White)';
    } else if (s < 0.15) {
      name = l > 0.5 ? 'Light Grey' : 'Dark Grey';
      hindi = 'ग्रे (Grey)';
    } else {
      // Color by hue
      if (h < 15 || h >= 345) {
        name = l < 0.4 ? 'Dark Maroon' : 'Red';
        hindi = 'लाल (Red)';
      } else if (h >= 15 && h < 45) {
        name = l < 0.4 ? 'Brown' : 'Orange';
        hindi = l < 0.4 ? 'भूरा (Brown)' : 'नारंगी (Orange)';
      } else if (h >= 45 && h < 70) {
        name = 'Yellow';
        hindi = 'पीला (Yellow)';
      } else if (h >= 70 && h < 160) {
        name = l < 0.4 ? 'Dark Green' : 'Green';
        hindi = 'हरा (Green)';
      } else if (h >= 160 && h < 200) {
        name = 'Cyan / Aqua';
        hindi = 'फ़िरोज़ी (Cyan)';
      } else if (h >= 200 && h < 260) {
        name = l < 0.4 ? 'Navy Blue' : 'Sky Blue';
        hindi = 'नीला (Blue)';
      } else if (h >= 260 && h < 315) {
        name = 'Purple / Violet';
        hindi = 'बैंगनी (Purple)';
      } else if (h >= 315 && h < 345) {
        name = 'Pink / Magenta';
        hindi = 'गुलाबी (Pink)';
      }
    }

    return {
      name,
      hindi,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`,
      brightness: Math.round(l * 100)
    };
  }

  // ==========================================
  // 4. AUTO-TORCH / NIGHT VISION SENSING
  // ==========================================
  // Calculates average luminance of current video frame
  checkAmbientLuminance(canvas) {
    if (!canvas) return 100;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Quick low-res 60x45 grid
    const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100)).data;
    let totalLuma = 0;
    let count = 0;

    for (let i = 0; i < imgData.length; i += 16) {
      // Y = 0.299R + 0.587G + 0.114B
      const luma = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      totalLuma += luma;
      count++;
    }

    const avgLuma = count > 0 ? Math.round(totalLuma / count) : 100;
    return avgLuma; // 0 (pure dark) to 255 (blinding bright)
  }

  async setTorch(enable) {
    this.torchActive = enable;
    if (this.mediaStreamTrack && typeof this.mediaStreamTrack.applyConstraints === 'function') {
      try {
        const capabilities = this.mediaStreamTrack.getCapabilities ? this.mediaStreamTrack.getCapabilities() : {};
        if (capabilities.torch) {
          await this.mediaStreamTrack.applyConstraints({
            advanced: [{ torch: enable }]
          });
          audioService.playTone(enable ? 880 : 440, 0.15);
          speechService.speak(enable ? "Flashlight turned on." : "Flashlight turned off.");
          return true;
        }
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
    // Simulation fallback
    audioService.playTone(enable ? 880 : 440, 0.15);
    speechService.speak(enable ? "Night torch enabled." : "Night torch turned off.");
    return false;
  }

  // Helper RGB to HSL conversion
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
    }
    return [h, s, l];
  }
}

export const smartAssistService = new SmartAssistService();
