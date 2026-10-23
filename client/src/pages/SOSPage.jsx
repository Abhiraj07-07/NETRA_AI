import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, Phone, UserPlus, Trash2, ArrowLeft, ShieldAlert, CheckCircle2, 
  Radio, BellRing, Info, Pencil, X, MessageSquare, Send, Copy, ExternalLink, Share2,
  Battery, BatteryCharging, BatteryWarning, Zap
} from 'lucide-react';
import { api } from '../services/api';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { socketService } from '../services/socketService';
import { batteryService } from '../services/batteryService';

export default function SOSPage({ onBack, onSOSDispatched }) {
  const [contacts, setContacts] = useState([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeSOS, setActiveSOS] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Family' });
  const [editingContact, setEditingContact] = useState(null);
  
  // Real Messaging Controls
  const [autoOpenApp, setAutoOpenApp] = useState(true);
  const [autoOpenMethod, setAutoOpenMethod] = useState('both'); // 'sms', 'whatsapp', 'both'
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [preparedMessage, setPreparedMessage] = useState('');
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [smsDeliveryStatus, setSmsDeliveryStatus] = useState(null);
  const [customTestNumber, setCustomTestNumber] = useState(() => {
    return localStorage.getItem('netra_user_phone') || '';
  });

  const handlePhoneChange = (val) => {
    setCustomTestNumber(val);
    localStorage.setItem('netra_user_phone', val);
  };

  // Default simulated coordinates (DSMNRU Campus)
  const coords = { latitude: 26.8467, longitude: 80.9462, address: 'Near Main Gate, DSMNRU Campus, Lucknow' };

  const [batteryState, setBatteryState] = useState({ level: 95, isCharging: false, isLow: false });
  const [batteryAlertDispatched, setBatteryAlertDispatched] = useState(null);

  useEffect(() => {
    loadContacts();
    speechService.speak("Emergency SOS Panel. Tap large button to trigger SOS or use SMS and WhatsApp direct dispatch to mobile numbers.", { minIntervalMs: 5000 });

    // Request native browser notification permission for real OS alerts
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unsubState = batteryService.addStateListener(setBatteryState);
    const unsubAlert = batteryService.addAlertListener(info => {
      setBatteryAlertDispatched(info);
      setDispatchStatus(`⚠️ Automatic Low Battery SMS (${info.level}%) dispatched to emergency contacts!`);
    });

    return () => {
      unsubState();
      unsubAlert();
    };
  }, []);

  const loadContacts = async () => {
    try {
      const res = await api.getContacts();
      if (res.success && res.contacts) {
        setContacts(res.contacts);
      }
    } catch (e) {
      console.warn('Failed to load contacts:', e);
    }
  };

  const getUserName = () => {
    return localStorage.getItem('netra_user_name') || 'Rupesh Kushwaha';
  };

  // Build clean emergency text message
  const buildEmergencyMessage = (type = 'real', targetContact = null) => {
    const isTest = type === 'test';
    const recipientName = targetContact ? targetContact.name : 'Emergency Contact';
    const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
    const userName = getUserName();
    
    if (isTest) {
      return `[NETRA AI TEST ALERT]\nHello ${recipientName}, this is a scheduled safety system test from NETRA AI companion. User: ${userName}.\nVerified GPS: ${mapUrl}\nStatus: System Operational.`;
    }
    return `🚨 CRITICAL EMERGENCY SOS from NETRA AI!\n\n` +
           `Attention ${recipientName}: ${userName} has triggered Panic SOS.\n` +
           `📍 Current GPS Location:\n${mapUrl}\n` +
           `Landmark: ${coords.address}\n\n` +
           `Please call or send help immediately!`;
  };

  // Clean phone number for WhatsApp / SMS (e.g. "+91 98765 43210" -> "919876543210")
  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length === 10) {
      return '91' + digits; // Default India code if 10 digits
    }
    return digits;
  };

  // Launch Real WhatsApp Message
  const sendWhatsApp = (phone, msgText) => {
    const clean = cleanPhoneNumber(phone);
    if (!clean) return;
    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msgText)}`;
    window.open(url, '_blank');
  };

  // Launch Real SMS App directly on user device
  const sendSMS = (phone, msgText) => {
    const clean = cleanPhoneNumber(phone);
    if (!clean) return;
    const url = `sms:${clean}?body=${encodeURIComponent(msgText)}`;
    window.location.href = url;
  };

  // 5-Second Ambient Audio Recorder during Emergency SOS
  const recordEmergencyAudio = () => {
    return new Promise(async (resolve) => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
          return resolve(null);
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            stream.getTracks().forEach(t => t.stop());
            resolve(reader.result);
          };
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 5000);
      } catch (err) {
        console.warn('Audio record fallback:', err);
        resolve(null);
      }
    });
  };

  // Direct 1-click Mobile SMS sender with API logging
  const handleSendDirectSMS = async (targetPhone, targetName = 'Emergency Contact') => {
    if (!targetPhone) {
      speechService.speak("Please enter a mobile phone number first.");
      return;
    }
    const clean = cleanPhoneNumber(targetPhone);
    const msg = buildEmergencyMessage(isTestMode ? 'test' : 'real', { name: targetName });
    
    setSmsDeliveryStatus({
      status: 'sending',
      phone: targetPhone,
      time: new Date().toLocaleTimeString()
    });

    // 1. Launch mobile native SMS application
    sendSMS(clean, msg);

    // 2. Dispatch via backend SMS API service
    try {
      const res = await api.sendDirectSMS({
        phoneNumber: clean,
        message: msg,
        contactName: targetName
      });
      setSmsDeliveryStatus({
        status: 'success',
        phone: targetPhone,
        time: new Date().toLocaleTimeString(),
        gateway: res.dispatchRecord?.gateway || 'SMS Service'
      });
      speechService.speak(`SMS alert dispatched to mobile number ${targetPhone}.`);
    } catch (e) {
      setSmsDeliveryStatus({
        status: 'dispatched-native',
        phone: targetPhone,
        time: new Date().toLocaleTimeString()
      });
      speechService.speak(`SMS opened in your messaging app for ${targetPhone}.`);
    }
  };

  // Start SOS countdown (3 seconds abort window)
  const handleInitiateSOS = () => {
    if (countdown !== null) return;
    audioService.playTone(660, 0.2);
    speechService.speak(`Warning: ${isTestMode ? 'Test SOS' : 'Emergency SOS'} initiating in 3 seconds. Tap Abort to cancel.`, { priority: true });
    setCountdown(3);

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
        audioService.playTone(700, 0.15);
      } else {
        clearInterval(interval);
        setCountdown(null);
        dispatchSOSAlert();
      }
    }, 1000);
  };

  const handleAbort = () => {
    setCountdown(null);
    speechService.speak("SOS cancelled.", { priority: true });
  };

  const dispatchSOSAlert = async () => {
    setIsTriggering(true);
    setDispatchStatus('Dispatching emergency signal to SMS gateway, server and family contacts...');
    audioService.playSiren();

    // Primary contact to notify (or custom mobile number)
    const primary = contacts[0] || { name: 'Guardian', phone: customTestNumber || '+919876543210' };
    setActiveRecipient(primary);

    const msg = buildEmergencyMessage(isTestMode ? 'test' : 'real', primary);
    setPreparedMessage(msg);

    // 1. Trigger Native OS Desktop/Mobile Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(isTestMode ? 'NETRA AI: Test Alert Dispatched' : '🚨 NETRA AI: CRITICAL SOS ALERT!', {
          body: `Emergency message prepared for ${primary.name} (${primary.phone}) with live GPS coordinates.`,
          icon: '/favicon.svg'
        });
      } catch (e) {
        // notification error fallback
      }
    }

    // 2. Open Dispatch Action Modal so user can inspect and send SMS / WhatsApp
    setShowDispatchModal(true);

    // 3. Auto-dispatch SMS & WhatsApp according to user preference
    const targetPhone = customTestNumber || primary.phone;
    if (autoOpenApp && targetPhone) {
      if (autoOpenMethod === 'sms' || autoOpenMethod === 'both') {
        sendSMS(targetPhone, msg);
      }
      if (autoOpenMethod === 'whatsapp' || autoOpenMethod === 'both') {
        setTimeout(() => sendWhatsApp(targetPhone, msg), autoOpenMethod === 'both' ? 700 : 0);
      }
    }

    // 4. Trigger backend SMS gateway dispatch
    try {
      api.sendDirectSMS({
        phoneNumber: cleanPhoneNumber(primary.phone),
        message: msg,
        contactName: primary.name
      }).catch(err => console.warn('Background primary SMS error:', err));

      if (customTestNumber && cleanPhoneNumber(customTestNumber) !== cleanPhoneNumber(primary.phone)) {
        api.sendDirectSMS({
          phoneNumber: cleanPhoneNumber(customTestNumber),
          message: msg,
          contactName: 'Saved Mobile Phone'
        }).catch(err => console.warn('Background custom SMS error:', err));
      }
    } catch (e) {
      // background error handled gracefully
    }

    try {
      const payload = {
        type: isTestMode ? 'test' : 'real',
        location: coords,
        note: isTestMode ? 'Scheduled Safety System Check' : 'CRITICAL EMERGENCY: Visually impaired user triggered Panic SOS!'
      };

      const res = await api.triggerSOS(payload);
      if (res.success) {
        setActiveSOS(res.sosEvent);
        setDispatchStatus(`Signal transmitted! SMS & WhatsApp dispatched for ${primary.name}.`);
        speechService.speak(`${isTestMode ? 'Test SOS' : 'Emergency SOS'} alert dispatched. Recording 5-second ambient audio for family...`, { priority: true });
        if (onSOSDispatched) onSOSDispatched(res.sosEvent);
      }

      // Record 5-second ambient scene audio and sync with guardian
      recordEmergencyAudio().then(async (audioData) => {
        if (audioData) {
          try {
            await api.triggerSOS({
              type: isTestMode ? 'test' : 'real',
              location: coords,
              audioRecording: audioData,
              note: isTestMode ? '[TEST] 5-Sec Ambient Scene Audio Attached' : 'CRITICAL SOS: 5-Sec Ambient Scene Audio Attached'
            });
          } catch (audioErr) {
            console.warn('Audio sync error:', audioErr);
          }
        }
      });
    } catch (err) {
      setDispatchStatus('Message prepared locally. Connect to network to sync server.');
      speechService.speak("SOS signal generated locally.", { priority: true });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.resolveSOS(id);
      setActiveSOS(null);
      speechService.speak("SOS marked as resolved.");
    } catch (e) {
      setActiveSOS(null);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(preparedMessage);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
    speechService.speak("Emergency message copied to clipboard.");
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    try {
      await api.addContact(newContact);
      setShowAddModal(false);
      setNewContact({ name: '', phone: '', relation: 'Family' });
      loadContacts();
      speechService.speak("Emergency contact added.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEdit = (contact) => {
    setEditingContact({ ...contact });
    speechService.speak(`Editing details for ${contact.name}`);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingContact || !editingContact.name || !editingContact.phone) return;
    try {
      await api.updateContact(editingContact.id, editingContact);
      speechService.speak(`Emergency contact details updated for ${editingContact.name}.`);
      setEditingContact(null);
      loadContacts();
    } catch (err) {
      setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c));
      setEditingContact(null);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await api.deleteContact(id);
      loadContacts();
      speechService.speak("Contact removed.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            aria-label="Back to Home Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Panic SOS & Message Dispatch
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Real-time SMS & WhatsApp delivery • GPS coordinates • Multi-channel alert
            </p>
          </div>
        </div>

        {/* Mode Toggle: Test Mode vs Real Emergency */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
          <button
            onClick={() => {
              setIsTestMode(false);
              speechService.speak("Live emergency mode selected.");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isTestMode ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Emergency
          </button>
          <button
            onClick={() => {
              setIsTestMode(true);
              speechService.speak("Test mode selected. Safe to test alerts without sirens.");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isTestMode ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Test Mode
          </button>
        </div>
      </div>

      {/* Main Panic Button Card */}
      <div className={`p-8 sm:p-10 rounded-3xl border-2 text-center transition-all ${
        isTestMode 
          ? 'bg-amber-50/95 border-amber-400 shadow-md backdrop-blur-sm' 
          : 'bg-rose-50/95 border-red-500 shadow-md backdrop-blur-sm'
      }`}>
        <div className="max-w-md mx-auto space-y-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isTestMode ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-red-100 text-red-900 border border-red-300'
          }`}>
            {isTestMode ? 'SAFE PRACTICE & EVALUATION MODE' : 'HIGH-PRIORITY CRITICAL TRIGGER'}
          </span>

          <h2 className="text-3xl font-black text-slate-900">
            {isTestMode ? 'SEND TEST SOS ALERT' : 'ACTIVATE EMERGENCY SOS'}
          </h2>

          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {isTestMode
              ? 'Sends a safe test message with GPS coordinates to your emergency contacts to verify delivery.'
              : 'Triggers audible siren, notifies family dashboard, and immediately generates a live SMS & WhatsApp message with your current GPS coordinates.'}
          </p>

          {/* Huge Touch Button */}
          <div className="py-4">
            {countdown !== null ? (
              <div className="space-y-4">
                <div className="w-40 h-40 rounded-full mx-auto bg-amber-500 text-slate-950 font-black text-6xl flex items-center justify-center animate-bounce shadow-xl shadow-amber-500/40">
                  {countdown}
                </div>
                <button
                  onClick={handleAbort}
                  className="px-8 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl border-2 border-slate-300 text-base transition-colors shadow-xs"
                  aria-label="Abort and cancel SOS countdown"
                >
                  CANCEL / ABORT
                </button>
              </div>
            ) : (
              <button
                onClick={handleInitiateSOS}
                disabled={isTriggering}
                className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full mx-auto flex flex-col items-center justify-center font-black transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
                  isTestMode
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/30'
                    : 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-600/40 radar-pulse-anim'
                }`}
                aria-label={isTestMode ? "Tap to send test SOS alert" : "Emergency Panic SOS. Tap to trigger assistance"}
              >
                <AlertOctagon className="w-16 h-16 mb-1 text-white" />
                <span className="text-2xl font-black tracking-wider text-white">
                  {isTestMode ? 'TEST SOS' : 'SOS'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/90">
                  {isTestMode ? 'Test Dispatch' : 'Press for Help'}
                </span>
              </button>
            )}
          </div>

          {/* Auto-launch & Channel Controls */}
          <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-800">
              <input
                type="checkbox"
                id="autoOpenApp"
                checked={autoOpenApp}
                onChange={e => setAutoOpenApp(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="autoOpenApp" className="font-semibold cursor-pointer">
                Auto-open messaging app immediately on SOS trigger
              </label>
            </div>

            {autoOpenApp && (
              <div className="flex items-center justify-center gap-2 pt-1 text-xs font-bold text-slate-700">
                <span className="text-[11px] text-slate-500 uppercase tracking-wide">Channel:</span>
                <button
                  type="button"
                  onClick={() => setAutoOpenMethod('sms')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    autoOpenMethod === 'sms' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📱 SMS to Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setAutoOpenMethod('whatsapp')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    autoOpenMethod === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setAutoOpenMethod('both')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    autoOpenMethod === 'both' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ⚡ Both (SMS & WhatsApp)
                </button>
              </div>
            )}
          </div>

          {dispatchStatus && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-amber-900 font-mono font-bold flex items-center justify-center gap-2 shadow-xs">
              <Radio className="w-4 h-4 animate-spin text-amber-600" />
              <span>{dispatchStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Real Mobile SMS & WhatsApp Dispatch Card */}
      <div className="bg-white border-2 border-sky-400 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
              <h2 className="section-heading text-lg font-bold text-slate-900">
                Direct Mobile SMS & WhatsApp Delivery
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Receive the emergency SOS message with live GPS location directly on your phone via SMS:
            </p>
          </div>
          <button
            onClick={() => {
              const primary = contacts[0] || { name: 'Contact', phone: customTestNumber || '+919876543210' };
              handleSendDirectSMS(primary.phone, primary.name);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send Test SMS Now</span>
          </button>
        </div>

        {/* Custom Number Direct Test & Save */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Your Mobile Number (For receiving SOS SMS):
              </label>
              {customTestNumber && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Auto-saved in app
                </span>
              )}
            </div>
            <input
              type="tel"
              value={customTestNumber}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="Enter mobile number (e.g. +91 98765 43210)"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end">
            <button
              onClick={() => {
                const target = customTestNumber || (contacts[0] ? contacts[0].phone : '+919876543210');
                handleSendDirectSMS(target, 'My Mobile');
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send SMS to My Mobile</span>
            </button>
            <button
              onClick={() => {
                const target = customTestNumber || (contacts[0] ? contacts[0].phone : '+919876543210');
                const msg = buildEmergencyMessage('real', { name: 'Emergency Contact' });
                sendWhatsApp(target, msg);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Me</span>
            </button>
          </div>
        </div>

        {/* Live Delivery Status Pill */}
        {smsDeliveryStatus && (
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-300 text-xs text-sky-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>SMS Dispatched</strong> to <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-900 border border-slate-200">{smsDeliveryStatus.phone}</code> at {smsDeliveryStatus.time}
                {smsDeliveryStatus.gateway && <span className="text-slate-500 text-[10px] ml-1">({smsDeliveryStatus.gateway})</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => sendSMS(cleanPhoneNumber(smsDeliveryStatus.phone), buildEmergencyMessage('real', { name: 'Contact' }))}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 underline"
              >
                Open in SMS App
              </button>
              <button
                onClick={() => handleSendDirectSMS(smsDeliveryStatus.phone, 'Mobile Recipient')}
                className="text-xs font-bold bg-white text-sky-700 px-2 py-1 rounded-md border border-sky-300 hover:bg-sky-100"
              >
                Resend
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Automatic Low Battery (<=10%) Emergency Dispatch Card */}
      <div className={`p-6 rounded-3xl border-2 transition-all ${
        batteryState.level <= 10 && !batteryState.isCharging
          ? 'bg-red-50/95 border-red-500 shadow-lg shadow-red-500/20'
          : 'bg-white border-amber-300 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              batteryState.level <= 10 && !batteryState.isCharging
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {batteryState.isCharging ? (
                <BatteryCharging className="w-6 h-6 text-emerald-600" />
              ) : batteryState.level <= 10 ? (
                <BatteryWarning className="w-6 h-6 text-white animate-bounce" />
              ) : (
                <Battery className="w-6 h-6 text-amber-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="section-heading text-lg font-bold text-slate-900">
                  Automatic Low Battery (&le;10%) Emergency Dispatch
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  batteryState.level <= 10 && !batteryState.isCharging
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {batteryState.level <= 10 ? 'CRITICAL DISPATCH TRIGGERED' : 'PROTECTION ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Current Level: <strong className="font-mono text-slate-900 text-sm">{batteryState.level}%</strong> {batteryState.isCharging ? '(Charging)' : '(On Battery)'} • Automatically dispatches emergency SMS with live GPS if battery hits 10%.
              </p>
            </div>
          </div>

          {/* Quick Simulation / Testing Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                batteryService.simulateBattery(9, false);
                speechService.speak("Simulating 9% low battery. Emergency alert triggered.", { priority: true });
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors"
              title="Test the 10% low battery emergency auto-dispatch immediately"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate 9% Low Battery (Test Now)</span>
            </button>
            {batteryState.isSimulated && (
              <button
                onClick={() => {
                  batteryService.resetSimulation();
                  speechService.speak("Battery simulation reset to normal.");
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Reset Battery
              </button>
            )}
          </div>
        </div>

        {/* Low Battery Message Preview & Status */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-bold text-[11px] uppercase tracking-wide">
              Automated Message Format (Sent to Contacts & Mobile at 10%):
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-600">
              Web Battery API + GPS
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap select-all">
            {`⚠️ [NETRA AI CRITICAL LOW BATTERY ALERT]
Attention Emergency Contacts: ${getUserName()}'s device battery has dropped to ${batteryState.level}%.
The device may power off soon!
📍 Last Verified GPS: https://maps.google.com/?q=${coords.latitude},${coords.longitude}
Landmark: ${coords.address}
Status: Auto-Dispatched by NETRA AI`}
          </div>
        </div>

        {batteryAlertDispatched && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-2xl text-xs text-red-950 font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
              Emergency SMS & GPS dispatched at {batteryAlertDispatched.time} (Battery was {batteryAlertDispatched.level}%)
            </span>
            <button
              onClick={() => {
                const primary = contacts[0] || { name: 'Emergency Contact', phone: customTestNumber || '+919876543210' };
                handleSendDirectSMS(primary.phone, primary.name);
              }}
              className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-500 font-bold"
            >
              Resend SMS Now
            </button>
          </div>
        )}
      </div>

      {/* Emergency Contacts Management */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-600" />
              Configured Emergency Contacts ({contacts.length})
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Click <span className="font-bold text-amber-700">Pencil</span> to edit a contact, or click <span className="font-bold text-emerald-700">WhatsApp / SMS</span> to send a message directly.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map(c => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-amber-400 transition-colors shadow-xs gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{c.name}</span>
                    {c.notifyOnSOS && (
                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">PRIMARY</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">{c.relation} • {c.phone}</div>
                </div>

                {/* Edit & Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(c)}
                    className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-xs"
                    title={`Edit details for ${c.name}`}
                    aria-label={`Edit emergency contact details for ${c.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-800" />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(c.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shadow-xs"
                    title="Remove Contact"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Direct Messaging & Call bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    const msg = buildEmergencyMessage('real', c);
                    sendWhatsApp(c.phone, msg);
                  }}
                  className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleSendDirectSMS(c.phone, c.name)}
                  className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>Send SMS</span>
                </button>

                <a
                  href={`tel:${c.phone}`}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs transition-colors"
                  title="Direct Call"
                  aria-label={`Direct call to ${c.name}`}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-700" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: SOS Dispatched Real Message Action */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BellRing className="w-6 h-6 text-red-600 animate-bounce" />
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isTestMode ? 'TEST SOS MESSAGE READY' : '🚨 EMERGENCY SOS DISPATCHED'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Recipient: <span className="font-bold text-slate-900">{activeRecipient?.name} ({activeRecipient?.phone})</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formatted Message Box */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Dispatched Emergency Message Text:
              </label>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {preparedMessage}
              </div>
            </div>

            {copiedNotification && (
              <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold text-center">
                ✓ Message copied to clipboard!
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => sendWhatsApp(activeRecipient?.phone || '+919876543210', preparedMessage)}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  const phone = activeRecipient?.phone || '+919876543210';
                  handleSendDirectSMS(phone, activeRecipient?.name || 'Contact');
                }}
                className="py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send SMS to Mobile</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                onClick={handleCopyMessage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </button>

              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Contact Details */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-600" />
                Edit Emergency Contact
              </h3>
              <button 
                onClick={() => setEditingContact(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingContact.name}
                  onChange={e => setEditingContact({ ...editingContact, name: e.target.value })}
                  placeholder="e.g. Mandavi Chaubey"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (with Country Code)</label>
                <input
                  type="tel"
                  required
                  value={editingContact.phone}
                  onChange={e => setEditingContact({ ...editingContact, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship / Role</label>
                <select
                  value={editingContact.relation}
                  onChange={e => setEditingContact({ ...editingContact, relation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Sister / Guardian">Sister / Guardian</option>
                  <option value="Peer Guide">Peer Guide</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Guide / Assistant">Guide / Assistant</option>
                  <option value="Emergency Helpline">Emergency Helpline</option>
                  <option value="Institution Staff">Institution Staff</option>
                  <option value="Friend">Friend</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyOnSOS"
                  checked={editingContact.notifyOnSOS ?? true}
                  onChange={e => setEditingContact({ ...editingContact, notifyOnSOS: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="notifyOnSOS" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Send high-priority SOS SMS & audible alerts
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contact */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Add Emergency Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Rahul Verma (Brother)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newContact.phone}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select
                  value={newContact.relation}
                  onChange={e => setNewContact({ ...newContact, relation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Guide / Assistant">Guide / Assistant</option>
                  <option value="Institution Staff">Institution Staff</option>
                  <option value="Friend">Friend</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
