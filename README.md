# NETRA AI 👁️

> **AI-Powered Vision and Safety Companion for Visually Impaired People**  
> *SPIRIT 3.0 Buildathon 2026 • Dr. Shakuntala Misra National Rehabilitation University, Lucknow*  
> **Team UNTAMED**: Rupesh Kushwaha, Abhishek, Mandavi Chaubey, Atul Shakya  
> **Theme / Category**: Helping Software / Assistive Technology

---

## 🌟 Overview

**NETRA AI** transforms any standard smartphone into an accessible, intelligent assistive companion for visually impaired individuals—eliminating the requirement for expensive specialized smart glasses or proprietary sensors.

By combining real-time camera computer vision, directional 3D stereo audio, Indian currency banknote recognition (₹10 – ₹500), medicine strip OCR, clothing color analysis, continuous GPS tracking, community hazard reports, and an emergency panic SOS dispatch system with 5-second ambient audio recording, NETRA AI provides travel independence and peace of mind for users and their families.

---

## 🏗️ System Architecture

```
  [Visually Impaired User / Smartphone Device]
       │
       ├─► Camera Video Stream ──► In-Browser AI Neural Network & Computer Vision
       │                                  │
       │                                  ├─► 3D Spatial Audio Engine (Stereo Panner L/R)
       │                                  ├─► Indian Banknote Reader (₹10 - ₹500)
       │                                  ├─► Medicine & Text OCR Reader (Dosage & Expiry)
       │                                  ├─► Clothing & Color Identifier
       │                                  └─► Auto-Torch Night Vision (< 35 lux)
       │
       ├─► Microphone (Hardware DSP) ──► Echo & Noise Cancellation ──► Multi-Lingual Intent Parser
       │                                  │ (English, Hinglish & Hindi Devanagari)
       │                                  └─► Audio Earcon Beeps (Start, Success, Stop)
       │
       ├─► Emergency Panic SOS ──► 5-Second Ambient Audio Recording ──► Socket.IO + REST API
       │                                                                      │
       └─► Geolocation GPS ──────► Live Coordinates Stream ───────────────────┤
                                                                              ▼
                                                                  [Node.js / Express Backend]
                                                                  [Socket.IO Real-Time Gateway]
                                                                              │
                                                                   ┌──────────┴──────────┐
                                                                   ▼                     ▼
                                                         [Family Guardian Portal] [Community Hazards]
                                                         (Live Map + Audio Stream) (Open Manholes/Potholes)
```

---

## ⚡ Implemented Core Features

| Feature | Capabilities & Implementation |
|---|---|
| **1. AI Obstacle Detection** | Real-time camera detection of persons, vehicles, obstacles with bounding boxes and 3-zone stereo direction (Left / Center / Right) and metric distance estimation. |
| **2. Indian Currency Reader** | Recognizes Mahatma Gandhi New Series Indian banknotes (**₹500, ₹200, ₹100, ₹50, ₹20, ₹10**) using color profile & aspect analysis. Spoken announcement in Hindi & English. |
| **3. Medicine & Text OCR** | Scans medicine strips, packaging, and door signs. Reads aloud medicine name, dosage instructions, expiry date, and cautionary warnings. |
| **4. Color & Clothing Identifier** | Center crosshair color targeting for shirts, dresses, and objects with human color naming (Navy Blue, Mustard Yellow, etc.). |
| **5. Auto-Torch / Night Vision** | Continuously evaluates frame luminance. Automatically triggers device LED flashlight when ambient light drops below 35 lux. |
| **6. Directional Spatial Audio** | Web Audio API `StereoPannerNode` pans audio pings directly to left or right earphones matching obstacle position. Frequency scales with urgency. |
| **7. Emergency Panic SOS + Audio** | High-contrast touch trigger with 3-second abort window. Automatically records **5-second ambient audio** of the scene and streams it to the Family Guardian Portal with GPS coordinates and automated SMS. |
| **8. DSP Noise Suppression Voice** | Hardware echo cancellation, noise suppression, confidence thresholding, audio earcon chimes, and natural language intent parser for English, Hinglish, and Hindi. |
| **9. Community Hazard Map** | Crowd-sourced registry of walking hazards (open manholes, broken walkways, trenches) with verify and resolution features. |
| **10. Family Guardian Portal** | Remote web monitoring dashboard for relatives with live GPS map, active SOS alarm sirens, and recorded ambient audio player. |
| **11. Progressive Web App (PWA)** | Offline caching with `sw.js` and `manifest.json`. Installable as a native mobile app on Android & iOS. |

---

## 📱 How to Convert to Mobile App via Git (GitHub & PWA/APK)

### 1. Push to Your GitHub Repository

```bash
# 1. Add your GitHub repository as remote:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/netra-ai.git

# 2. Rename branch to main:
git branch -M main

# 3. Push all commits to GitHub:
git push -u origin main
```

---

### 2. Method A: Instant Mobile App Install (PWA - Recommended)
NETRA AI has built-in **Progressive Web App (PWA)** support:
1. Open the deployed website link on your Android (Chrome) or iPhone (Safari).
2. Tap the browser menu `⋮` and select **"Install App"** or **"Add to Home screen"**.
3. The app is installed on your mobile home screen with a native icon, fullscreen interface, hardware camera/torch access, and offline capability!

---

### 3. Method B: Build Android APK using PWABuilder (Zero-Code, Free)
1. Deploy your frontend to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) from your GitHub repo.
2. Go to **[PWABuilder.com](https://www.pwabuilder.com)**.
3. Enter your deployed URL and click **Start**.
4. Click **Build APK / Android Package**.
5. Download the ready-to-install `netra-ai.apk` directly onto any Android phone!

---

### 4. Method C: Native Android App with Capacitor
To build a native Android Studio project directly from this codebase:
```bash
# 1. Inside client folder, install Capacitor:
cd client
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor:
npx cap init "NETRA AI" "com.teamuntamed.netra" --web-dir dist

# 3. Build production web bundle:
npm run build

# 4. Add Android platform:
npx cap add android

# 5. Open in Android Studio to build signed APK:
npx cap open android
```

---

## 🚀 Quick Start Guide (Local Development)

### Run Both Client & Server Concurrently

```bash
# In the project root directory:
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API Gateway**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## ⌨️ Accessible Keyboard Shortcuts

| Key | Action |
|---|---|
| `[V]` | Toggle **Hardware Noise-Filtered Voice Assistant** |
| `[1]` | Open **Vision & Smart Assist Suite** |
| `[2]` | Open **Voice Guidance Screen** |
| `[3]` | Open **Panic SOS Alert** |
| `[4]` | Open **Live GPS Location Sharing** |
| `[5]` | Open **Crowd-Sourced Hazard Map** |
| `[6]` | Open **Family Guardian Portal** |
| `[Esc]` | Return to **Home Dashboard** |
| `[Space]` | Toggle Camera / Trigger Scan in Vision Assistant |

---

## 🎤 Voice Commands (Hands-Free in English & Hindi)

Press **`[V]`** or tap the mic banner to activate:
- *"Currency"* / *"Paise kitne hain"* / *"Note batao"* ➔ Opens Currency Reader (₹10 - ₹500)
- *"Medicine"* / *"Dawai padho"* / *"Dawa batao"* ➔ Opens Medicine & Text OCR
- *"Color"* / *"Rang batao"* / *"Kapde dekho"* ➔ Opens Clothing & Color Identifier
- *"Torch on"* / *"Torch band karo"* ➔ Toggles hardware flashlight
- *"Vision"* / *"Samne kya hai"* / *"Camera chalu"* ➔ Starts 3D Obstacle Radar
- *"SOS"* / *"Bachao"* / *"Madad"* ➔ Triggers emergency siren, SMS & ambient audio
- *"Location"* / *"Kaha hu"* ➔ Speaks GPS address aloud
- *"Hazards"* / *"Gaddha"* ➔ Reads verified street potholes and open manholes
- *"Family"* / *"Parivar"* ➔ Opens Guardian live monitoring portal
- *"Home"* / *"Ghar jao"* ➔ Returns to main screen
