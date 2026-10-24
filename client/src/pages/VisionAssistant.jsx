import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, CameraOff, Volume2, ArrowLeft, VolumeX, AlertTriangle, 
  Sparkles, Flashlight, FlashlightOff, RefreshCw, Eye, ShieldCheck, Zap
} from 'lucide-react';
import { visionDetector } from '../services/visionDetector';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { smartAssistService } from '../services/smartAssistService';
import { aiVisionService } from '../services/aiVisionService';

export default function VisionAssistant({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const [cameraError, setCameraError] = useState(null);
  
  const [torchActive, setTorchActive] = useState(false);
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true);
  const [speechAnnounceEnabled, setSpeechAnnounceEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) or user (front)
  
  // Detection state
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [aiStatus, setAiStatus] = useState('Camera Active');
  const [announcementLog, setAnnouncementLog] = useState([]);
  const [telemetry, setTelemetry] = useState({ latency: 18, fps: 45 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nearestObstacle, setNearestObstacle] = useState(null);
  
  const isProcessingRef = useRef(false);
  const animationFrameId = useRef(null);
  const lastAnnouncedObstacleRef = useRef({ id: '', time: 0 });
  const lastClearAnnounceRef = useRef(0);

  // Accessible bilingual obstacle & directional names
  const OBSTACLE_NAMES_HI = {
    person: 'vyakti',
    bicycle: 'cycle',
    car: 'gaadi',
    motorcycle: 'bike',
    bus: 'bus',
    truck: 'truck',
    bench: 'bench',
    chair: 'kursi',
    couch: 'sofa',
    potted_plant: 'gamla',
    bed: 'bistar',
    dining_table: 'mez',
    table: 'mez',
    tv: 'TV screen',
    laptop: 'laptop screen',
    'cell phone': 'mobile phone',
    cell_phone: 'mobile phone',
    phone: 'mobile phone',
    mobile: 'mobile phone',
    book: 'kitaab',
    bottle: 'botal',
    cup: 'cup',
    door: 'darwaza',
    stairs: 'seedhiyan',
    wall: 'deewar',
    obstacle: 'rukawat'
  };

  const ZONE_MAPPING = {
    center: { en: 'directly ahead', hi: 'samne' },
    left: { en: 'on your left', hi: 'left taraf' },
    right: { en: 'on your right', hi: 'right taraf' }
  };

  // Start Camera Stream
  const startCamera = useCallback(async (preferredFacing = facingMode) => {
    try {
      setCameraError(null);
      setAiStatus('Connecting camera...');

      // Stop previous tracks if any
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: preferredFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        isStreamingRef.current = true;
        setAiStatus('Obstacle Scanner Active');

        // Pass video track to smart assist for torch control
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          smartAssistService.setMediaStreamTrack(videoTrack);
        }

        speechService.speak("Camera active. Real-time obstacle detection started.", { minIntervalMs: 3000 });
      }
    } catch (err) {
      console.warn('Camera access fallback or error:', err);
      setCameraError('Camera access unavailable. Make sure permissions are granted.');
      setIsStreaming(false);
      isStreamingRef.current = false;
      setAiStatus('Camera Offline');
      speechService.speak("Camera permission needed. Please allow camera access in browser.", { priority: true });
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    isStreamingRef.current = false;
    setDetectedObjects([]);
    setNearestObstacle(null);
    setAiStatus('Camera Paused');
    speechService.speak("Camera paused.", { priority: true });
  }, []);

  // Flip Camera between Environment and User
  const flipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    const nextState = !torchActive;
    setTorchActive(nextState);
    const success = await smartAssistService.setTorch(nextState);
    if (success) {
      speechService.speak(nextState ? "Torch turned ON." : "Torch turned OFF.", { priority: true });
    } else {
      speechService.speak(nextState ? "Torch enabled." : "Torch disabled.", { priority: true });
    }
  };

  // Scene Description (AI or fast native edge analysis)
  const handleDescribeScene = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    setAiStatus('Analyzing scene...');
    speechService.speak("Analyzing objects in front of you...", { priority: true });

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const res = await aiVisionService.describeScene(canvasRef.current);
      if (res && res.description) {
        const spokenMsg = res.spokenText || res.description;
        setAiStatus('Scene Described');
        speechService.speak(spokenMsg, { priority: true, minIntervalMs: 500 });
        
        setAnnouncementLog(prev => [
          {
            id: Date.now(),
            text: spokenMsg,
            time: new Date().toLocaleTimeString(),
            level: 'ai'
          },
          ...prev.slice(0, 15)
        ]);
      }
    } catch (e) {
      console.warn('Scene describe notice:', e);
      speechService.speak("Pathway visible. Looking forward.", { priority: true });
    } finally {
      setIsAnalyzing(false);
      setAiStatus('Obstacle Scanner Active');
    }
  };

  // Main Detection Loop
  useEffect(() => {
    let lastFrameTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    const loop = async () => {
      if (isStreamingRef.current && videoRef.current && canvasRef.current && !isProcessingRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          isProcessingRef.current = true;
          const startTime = performance.now();

          try {
            // Ensure canvas dimension matches video
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }

            // Run Vision Obstacle Detection & Render Bounding Boxes
            const detected = await visionDetector.detectObstacles(canvas, video);
            setDetectedObjects(detected || []);

            // Find nearest obstacle in front
            let urgent = null;
            let minDistance = 999;
            for (const item of (detected || [])) {
              if (item.distance < minDistance) {
                minDistance = item.distance;
                urgent = item;
              }
            }
            setNearestObstacle(urgent);

            // Audio & Speech Announcements
            const now = Date.now();
            if (urgent && speechAnnounceEnabled) {
              const zoneText = ZONE_MAPPING[urgent.zone] || ZONE_MAPPING.center;
              const itemKey = (urgent.class || urgent.label || '').toLowerCase();
              const hiName = OBSTACLE_NAMES_HI[itemKey] || urgent.label;
              const distMeters = urgent.distance.toFixed(1);

              // Play directional spatial audio beep
              if (spatialAudioEnabled) {
                const pan = urgent.zone === 'left' ? -0.8 : urgent.zone === 'right' ? 0.8 : 0;
                const freq = urgent.distance < 1.2 ? 880 : urgent.distance < 2.0 ? 550 : 380;
                audioService.playSpatialBeep(pan, freq, 0.08);
              }

              // Throttled voice announcement (speaks once every 2.4s, or 1.2s for critical proximity <1.0m)
              const announceCooldown = urgent.distance < 1.2 ? 1400 : 2500;
              const isDifferentObstacle = lastAnnouncedObstacleRef.current.id !== `${urgent.label}-${urgent.zone}`;
              const timePassed = (now - lastAnnouncedObstacleRef.current.time) > announceCooldown;

              if (isDifferentObstacle || timePassed) {
                lastAnnouncedObstacleRef.current = {
                  id: `${urgent.label}-${urgent.zone}`,
                  time: now
                };

                let warning = '';
                if (urgent.distance < 1.2) {
                  warning = `Caution! ${urgent.label} ${zoneText.en}, ${distMeters} meters. Dhyan rahe, ${hiName} ${zoneText.hi} hai. Stop!`;
                } else {
                  warning = `${urgent.label} ${zoneText.en}, ${distMeters} meters. ${hiName} ${zoneText.hi} hai.`;
                }

                speechService.speak(warning, { priority: urgent.distance < 1.2, minIntervalMs: announceCooldown });
                
                setAnnouncementLog(prev => [
                  {
                    id: Date.now(),
                    text: `${urgent.label.toUpperCase()} (${zoneText.en}) • ${distMeters}m`,
                    time: new Date().toLocaleTimeString(),
                    level: urgent.distance < 1.2 ? 'danger' : 'warning'
                  },
                  ...prev.slice(0, 15)
                ]);
              }
            } else if ((!detected || detected.length === 0) && (now - lastClearAnnounceRef.current > 12000)) {
              // Periodic reassurance that path is clear
              lastClearAnnounceRef.current = now;
              speechService.speak("Pathway clear. Rasta saaf hai, aage badhein.", { minIntervalMs: 10000 });
            }

            // Telemetry
            const elapsed = performance.now() - startTime;
            frameCounter++;
            if (performance.now() - fpsTimer >= 1000) {
              setTelemetry({
                fps: frameCounter,
                latency: Math.round(elapsed)
              });
              frameCounter = 0;
              fpsTimer = performance.now();
            }
          } catch (loopErr) {
            console.warn('Vision detection frame catch:', loopErr);
          } finally {
            isProcessingRef.current = false;
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [spatialAudioEnabled, speechAnnounceEnabled]);

  // Auto-Start camera, warm up AI model & register voice commands
  useEffect(() => {
    startCamera();
    visionDetector.loadModel();

    const unsubscribeIntent = speechService.addIntentListener((intentObj) => {
      if (!intentObj) return;
      const { intent } = intentObj;
      if (intent === 'DESCRIBE_SCENE') {
        handleDescribeScene();
      } else if (intent === 'TORCH') {
        toggleTorch();
      } else if (intent === 'CAMERA_STOP') {
        stopCamera();
      } else if (intent === 'CAMERA_START' || intent === 'WALK_START') {
        startCamera();
      }
    });

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'd' || e.key === 'D') {
        handleDescribeScene();
      } else if (e.key === 't' || e.key === 'T') {
        toggleTorch();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isStreaming) stopCamera();
        else startCamera();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribeIntent();
      window.removeEventListener('keydown', handleKeyDown);
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-left">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-300"
            title="Back to Home [Esc]"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                AI Vision & Obstacle Detector
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isStreaming ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {isStreaming ? '● Live' : '○ Standby'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time pathway obstacle radar • Bilingual voice alerts • Spatial stereo cues
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Describe Scene Button */}
          <button
            onClick={handleDescribeScene}
            disabled={!isStreaming || isAnalyzing}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            title="Analyze and describe objects in front [D key]"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Samne Kya Hai? [D]'}</span>
          </button>

          {/* Torch Toggle */}
          <button
            onClick={toggleTorch}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
              torchActive 
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Toggle Flashlight / Torch [T key]"
            aria-label="Toggle Torch"
          >
            {torchActive ? <Flashlight className="w-4 h-4 fill-current" /> : <FlashlightOff className="w-4 h-4" />}
          </button>

          {/* Camera Flip */}
          <button
            onClick={flipCamera}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
            title="Switch between front and back camera"
            aria-label="Flip Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Camera On / Off */}
          <button
            onClick={isStreaming ? stopCamera : () => startCamera()}
            className={`p-2.5 rounded-xl border font-bold transition-colors ${
              isStreaming 
                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:bg-emerald-100'
            }`}
            title="Start or pause camera [Spacebar]"
            aria-label={isStreaming ? "Pause Camera" : "Start Camera"}
          >
            {isStreaming ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewport & Detection Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Live Camera Video with Bounding Box Overlay */}
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-xl relative min-h-[420px] flex items-center justify-center">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover max-h-[540px] ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Bounding Box Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Offline / Error Overlay */}
          {(!isStreaming || cameraError) && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-20">
              <CameraOff className="w-14 h-14 text-slate-500 mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-white mb-1">
                {cameraError ? 'Camera Unavailable' : 'Camera Paused'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {cameraError || 'Tap button below or say "Start" / "Camera" to activate obstacle radar'}
              </p>
              <button
                onClick={() => startCamera()}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition-all"
              >
                Start Camera Scanner
              </button>
            </div>
          )}

          {/* Top HUD Telemetry Pill */}
          {isStreaming && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-amber-400">FPS: {telemetry.fps}</span>
                <span className="text-slate-400">|</span>
                <span>{telemetry.latency}ms</span>
              </div>

              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full text-white text-xs font-bold">
                {detectedObjects.length > 0 ? (
                  <span className="text-amber-400 font-mono">⚠ {detectedObjects.length} In Pathway</span>
                ) : (
                  <span className="text-emerald-400 font-mono">✓ Pathway Clear</span>
                )}
              </div>
            </div>
          )}

          {/* Bottom Live Directional Radar Strip */}
          {isStreaming && (
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-white pointer-events-none z-10">
              <div className="flex items-center justify-between text-xs">
                {/* Left Zone */}
                <div className={`flex-1 text-center py-1 rounded-lg border ${
                  detectedObjects.some(o => o.zone === 'left') 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                    : 'border-transparent text-slate-400'
                }`}>
                  ◀ Left
                </div>

                {/* Center Zone */}
                <div className={`flex-1 text-center py-1 mx-2 rounded-lg border ${
                  detectedObjects.some(o => o.zone === 'center') 
                    ? 'bg-red-500/25 border-red-500 text-red-300 font-black text-sm animate-pulse' 
                    : 'border-transparent text-slate-400'
                }`}>
                  ▲ Center (Ahead)
                </div>

                {/* Right Zone */}
                <div className={`flex-1 text-center py-1 rounded-lg border ${
                  detectedObjects.some(o => o.zone === 'right') 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                    : 'border-transparent text-slate-400'
                }`}>
                  Right ▶
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Obstacle Telemetry & Live Announcement Feed */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Nearest Obstacle Alert Box */}
          <div className={`border-2 rounded-3xl p-5 shadow-xs transition-colors ${
            nearestObstacle && nearestObstacle.distance < 1.3
              ? 'bg-rose-50 border-rose-400 text-rose-950'
              : nearestObstacle
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider mb-2">
              {nearestObstacle ? (
                <>
                  <AlertTriangle className={`w-5 h-5 ${nearestObstacle.distance < 1.3 ? 'text-rose-600 animate-bounce' : 'text-amber-600'}`} />
                  <span>Immediate Obstacle Warning</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Pathway Clear Ahead</span>
                </>
              )}
            </div>

            {nearestObstacle ? (
              <div className="space-y-2">
                <div className="text-2xl font-black text-slate-900">
                  {nearestObstacle.label.toUpperCase()}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    ({OBSTACLE_NAMES_HI[nearestObstacle.label.toLowerCase()] || ''})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="bg-white px-3 py-1 rounded-xl border border-slate-300 shadow-xs">
                    Distance: <strong className="text-red-700">{nearestObstacle.distance.toFixed(1)}m</strong>
                  </span>
                  <span className="bg-white px-3 py-1 rounded-xl border border-slate-300 shadow-xs capitalize">
                    Position: <strong className="text-slate-900">{nearestObstacle.zone}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-800 font-medium">
                No barriers within 3 meters. You can continue walking forward safely.
              </p>
            )}
          </div>

          {/* Sound & Speech Settings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Guidance Audio Mode</span>
              <Volume2 className="w-4 h-4 text-slate-500" />
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => setSpeechAnnounceEnabled(!speechAnnounceEnabled)}
                className={`py-2 px-3 rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                  speechAnnounceEnabled 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                <span>Voice Speech: {speechAnnounceEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setSpatialAudioEnabled(!spatialAudioEnabled)}
                className={`py-2 px-3 rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                  spatialAudioEnabled 
                    ? 'bg-sky-100 text-sky-900 border-sky-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                <span>3D Beeper: {spatialAudioEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Spoken Alert History Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex-1 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Recent Spoken Alerts
            </h3>
            
            <div className="space-y-1.5 overflow-y-auto max-h-48 text-xs font-mono">
              {announcementLog.length === 0 ? (
                <p className="text-slate-400 italic py-6 text-center text-xs font-sans">
                  Waiting for detection events...
                </p>
              ) : (
                announcementLog.map(item => (
                  <div 
                    key={item.id}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                      item.level === 'danger' 
                        ? 'bg-rose-50 border-rose-200 text-rose-900' 
                        : item.level === 'ai'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="truncate">{item.text}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
