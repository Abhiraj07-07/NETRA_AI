// Torch & Hardware Illumination Service for Low Light Navigation
import { speechService } from './speechService';

class SmartAssistService {
  constructor() {
    this.torchActive = false;
    this.mediaStreamTrack = null;
  }

  setMediaStreamTrack(track) {
    this.mediaStreamTrack = track;
  }

  // Hardware Torch / Flashlight Control
  async setTorch(enable) {
    this.torchActive = enable;
    if (this.mediaStreamTrack) {
      try {
        const capabilities = this.mediaStreamTrack.getCapabilities ? this.mediaStreamTrack.getCapabilities() : {};
        if (capabilities.torch) {
          await this.mediaStreamTrack.applyConstraints({
            advanced: [{ torch: enable }]
          });
          return true;
        }
      } catch (e) {
        console.warn('Hardware torch constraint unsupported on current camera/device:', e);
      }
    }
    return false;
  }

  // Automatic low-light sensor via camera frame sampling
  checkLowLightAndAutoTorch(canvas, threshold = 45) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    if (width <= 0 || height <= 0) return;

    const stepX = Math.floor(width / 10);
    const stepY = Math.floor(height / 10);
    let totalLuminance = 0, samples = 0;

    for (let x = stepX; x < width; x += stepX) {
      for (let y = stepY; y < height; y += stepY) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const lum = 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
        totalLuminance += lum;
        samples++;
      }
    }

    const avgLuminance = Math.round(totalLuminance / (samples || 1));

    if (avgLuminance < threshold && !this.torchActive) {
      this.setTorch(true);
      speechService.speak("Kam roshni hai. Torch chalu kar di gayi hai.", { minIntervalMs: 8000 });
    } else if (avgLuminance > threshold + 30 && this.torchActive) {
      this.setTorch(false);
      speechService.speak("Roshni theek hai. Torch band kar di gayi hai.", { minIntervalMs: 8000 });
    }
  }
}

export const smartAssistService = new SmartAssistService();
