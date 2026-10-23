import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// In-Memory Database Store for Prototype
const db = {
  users: [
    {
      id: 'usr_001',
      username: 'user_active',
      displayName: 'Rupesh Kushwaha',
      phone: '+91 98765 43210',
      visionLevel: 'Total Blindness / Visually Impaired',
      bloodGroup: 'B+',
      emergencyNote: 'Assisted by white cane / directional audio',
      address: 'Near Main Gate, DSMNRU Campus, Lucknow',
      role: 'user',
      settings: {
        highContrast: false,
        speechRate: 1.0,
        pitch: 1.0,
        spatialAudio: true,
        audioCues: true,
        hapticFeedback: true,
        detectionSensitivity: 'high',
        sosCountdownSeconds: 3
      }
    },
    {
      id: 'guardian_001',
      username: 'family_guardian',
      displayName: 'Guardian / Trusted Family Member',
      role: 'guardian',
      targetUserId: 'usr_001'
    }
  ],
  emergencyContacts: [
    {
      id: 'ec_1',
      userId: 'usr_001',
      name: 'Mandavi Chaubey (Family)',
      phone: '+91 98765 43210',
      relation: 'Sister / Guardian',
      notifyOnSOS: true,
      notifyOnLocationShare: true
    },
    {
      id: 'ec_2',
      userId: 'usr_001',
      name: 'Abhishek (Campus Support)',
      phone: '+91 91234 56789',
      relation: 'Peer Guide',
      notifyOnSOS: true,
      notifyOnLocationShare: false
    },
    {
      id: 'ec_3',
      userId: 'usr_001',
      name: 'Atul Shakya (Emergency Helpline)',
      phone: '+91 99887 76655',
      relation: 'Emergency Contact',
      notifyOnSOS: true,
      notifyOnLocationShare: false
    }
  ],
  location: {
    userId: 'usr_001',
    latitude: 26.8467,
    longitude: 80.9462,
    accuracy: 8.5,
    heading: 45,
    speed: 1.1,
    sharingActive: true,
    lastUpdated: new Date().toISOString()
  },
  sosEvents: [
    {
      id: 'sos_init',
      userId: 'usr_001',
      type: 'test',
      status: 'resolved',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      location: { latitude: 26.8467, longitude: 80.9462, address: 'Near Main Gate, DSMNRU Campus, Lucknow' },
      deliveryLog: [
        { channel: 'SMS', recipient: '+91 98765 43210', status: 'delivered', time: '1 hr ago' },
        { channel: 'Socket.IO Family Portal', recipient: 'Guardian Screen', status: 'received', time: '1 hr ago' }
      ]
    }
  ],
  hazards: [
    {
      id: 'haz_1',
      category: 'Open Manhole',
      title: 'Uncovered Manhole on Pedestrian Walkway',
      description: 'Open maintenance hole without warning barricade near Library pathway.',
      severity: 'critical',
      latitude: 26.8471,
      longitude: 80.9468,
      locationName: 'North Library Walkway',
      reportedBy: 'Rupesh Kushwaha',
      reportedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'active',
      upvotes: 4
    },
    {
      id: 'haz_2',
      category: 'Construction Barrier',
      title: 'Dug-up Cable Trench',
      description: 'Underground wiring construction obstructing tactile paving.',
      severity: 'high',
      latitude: 26.8462,
      longitude: 80.9455,
      locationName: 'Academic Block B Corridor',
      reportedBy: 'Abhishek',
      reportedAt: new Date(Date.now() - 14400000).toISOString(),
      status: 'active',
      upvotes: 7
    },
    {
      id: 'haz_3',
      category: 'Broken Sidewalk',
      title: 'Uneven Curb & Broken Paver Blocks',
      description: 'Trip hazard with 4-inch sudden drop on sidewalk ramp.',
      severity: 'medium',
      latitude: 26.8458,
      longitude: 80.9475,
      locationName: 'Hostel Gate 2 Entrance',
      reportedBy: 'Mandavi Chaubey',
      reportedAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'resolved',
      upvotes: 2
    }
  ]
};

// ======================
// REST API ROUTES
// ======================

// 1. Health & Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'NETRA AI Backend Gateway',
    version: '1.0.0',
    buildathon: 'SPIRIT 3.0 Buildathon 2026',
    team: 'UNTAMED',
    timestamp: new Date().toISOString()
  });
});

// 2. Auth / Profile
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  const user = db.users.find(u => u.username === username) || db.users[0];
  res.json({ success: true, user, token: 'netra_jwt_' + user.id });
});

app.get('/api/users/profile', (req, res) => {
  res.json({ success: true, profile: db.users[0] });
});

app.put('/api/users/profile', (req, res) => {
  const { displayName, phone, visionLevel, bloodGroup, emergencyNote, address, settings } = req.body;
  if (displayName) db.users[0].displayName = displayName;
  if (phone) db.users[0].phone = phone;
  if (visionLevel) db.users[0].visionLevel = visionLevel;
  if (bloodGroup) db.users[0].bloodGroup = bloodGroup;
  if (emergencyNote) db.users[0].emergencyNote = emergencyNote;
  if (address) db.users[0].address = address;
  if (settings) db.users[0].settings = { ...db.users[0].settings, ...settings };

  io.emit('user:profile_updated', db.users[0]);
  res.json({ success: true, profile: db.users[0] });
});

// 3. Emergency Contacts
app.get('/api/emergency-contacts', (req, res) => {
  res.json({ success: true, contacts: db.emergencyContacts });
});

app.post('/api/emergency-contacts', (req, res) => {
  const { name, phone, relation, notifyOnSOS } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone required' });
  }
  const newContact = {
    id: 'ec_' + Date.now(),
    userId: 'usr_001',
    name,
    phone,
    relation: relation || 'Contact',
    notifyOnSOS: notifyOnSOS ?? true,
    notifyOnLocationShare: true
  };
  db.emergencyContacts.push(newContact);
  res.status(201).json({ success: true, contact: newContact });
});

app.put('/api/emergency-contacts/:id', (req, res) => {
  const id = req.params.id;
  const { name, phone, relation, notifyOnSOS } = req.body;
  const index = db.emergencyContacts.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Contact not found' });
  }
  if (name) db.emergencyContacts[index].name = name;
  if (phone) db.emergencyContacts[index].phone = phone;
  if (relation) db.emergencyContacts[index].relation = relation;
  if (notifyOnSOS !== undefined) db.emergencyContacts[index].notifyOnSOS = notifyOnSOS;

  res.json({ success: true, contact: db.emergencyContacts[index] });
});

app.delete('/api/emergency-contacts/:id', (req, res) => {
  const id = req.params.id;
  db.emergencyContacts = db.emergencyContacts.filter(c => c.id !== id);
  res.json({ success: true, message: 'Contact deleted' });
});

// 4. Live GPS Location Sharing
app.post('/api/location', (req, res) => {
  const { latitude, longitude, accuracy, speed, heading, sharingActive } = req.body;
  db.location = {
    userId: 'usr_001',
    latitude: latitude || db.location.latitude,
    longitude: longitude || db.location.longitude,
    accuracy: accuracy || db.location.accuracy,
    speed: speed || db.location.speed,
    heading: heading || db.location.heading,
    sharingActive: sharingActive !== undefined ? sharingActive : db.location.sharingActive,
    lastUpdated: new Date().toISOString()
  };

  // Broadcast to guardians via Socket.IO
  io.emit('location:update', db.location);

  res.json({ success: true, location: db.location });
});

app.get('/api/location/latest', (req, res) => {
  res.json({ success: true, location: db.location });
});

// 5. Panic SOS
app.post('/api/sos', (req, res) => {
  const { type = 'real', location, note, audioRecording } = req.body;
  const sosEvent = {
    id: 'sos_' + Date.now(),
    userId: 'usr_001',
    type, // 'real' or 'test'
    status: 'active',
    timestamp: new Date().toISOString(),
    location: location || db.location,
    audioRecording: audioRecording || null,
    note: note || (type === 'test' ? 'SOS Routine System Test' : 'EMERGENCY: User activated Panic SOS!'),
    deliveryLog: db.emergencyContacts.map(c => ({
      channel: 'SMS/Notification Simulation',
      recipient: `${c.name} (${c.phone})`,
      status: 'dispatched',
      time: 'Just now'
    }))
  };

  db.sosEvents.unshift(sosEvent);

  // Broadcast high-priority alert to all connected family/guardian dashboards
  io.emit('sos:alert', sosEvent);

  res.status(201).json({
    success: true,
    sosEvent,
    alertDispatchedTo: db.emergencyContacts.length,
    message: type === 'test' ? 'Test SOS sent successfully' : 'CRITICAL SOS ALERT BROADCASTED'
  });
});

// Direct SMS Dispatch Endpoint (Supports Fast2SMS, Twilio, or Native Mobile Dispatch)
app.post('/api/sos/send-sms', async (req, res) => {
  const { phoneNumber, message, contactName, apiKey } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: 'Mobile phone number is required' });
  }

  const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
  const smsBody = message || `🚨 NETRA AI EMERGENCY SOS ALERT!\nUser needs immediate assistance.\nGPS Location: https://maps.google.com/?q=${db.location.latitude},${db.location.longitude}`;

  const fast2smsKey = apiKey || process.env.FAST2SMS_API_KEY;
  let gatewayResult = null;
  let status = 'dispatched';

  // If Fast2SMS Key is present, attempt live India SMS API call
  if (fast2smsKey && cleanPhone.length >= 10) {
    try {
      const targetNumber = cleanPhone.slice(-10); // 10 digits for Fast2SMS
      const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsKey}&route=q&message=${encodeURIComponent(smsBody)}&language=english&flash=0&numbers=${targetNumber}`);
      gatewayResult = await response.json();
      status = (gatewayResult && gatewayResult.return) ? 'delivered' : 'dispatched';
    } catch (err) {
      console.error('Fast2SMS error:', err);
      gatewayResult = { error: err.message };
    }
  }

  const dispatchRecord = {
    id: 'sms_' + Date.now(),
    recipient: phoneNumber,
    contactName: contactName || 'Mobile Recipient',
    message: smsBody,
    timestamp: new Date().toISOString(),
    status,
    gateway: fast2smsKey ? 'Fast2SMS Gateway' : 'Standard Mobile SMS Service',
    gatewayResult
  };

  // Broadcast to guardians
  io.emit('sms:dispatched', dispatchRecord);

  res.json({
    success: true,
    message: `SMS alert dispatched to ${phoneNumber}`,
    dispatchRecord,
    nativeSmsUrl: `sms:${cleanPhone}?body=${encodeURIComponent(smsBody)}`
  });
});

app.get('/api/sos/history', (req, res) => {
  res.json({ success: true, history: db.sosEvents });
});

app.post('/api/sos/:id/resolve', (req, res) => {
  const { id } = req.params;
  const event = db.sosEvents.find(e => e.id === id);
  if (event) {
    event.status = 'resolved';
    event.resolvedAt = new Date().toISOString();
    io.emit('sos:resolved', { id, resolvedAt: event.resolvedAt });
    return res.json({ success: true, event });
  }
  res.status(404).json({ success: false, error: 'Event not found' });
});

// 5.5 Battery Monitoring & Auto-Low-Battery Emergency Alert
db.battery = {
  level: 95,
  isCharging: false,
  lastAlertAt: null
};

app.get('/api/battery/status', (req, res) => {
  res.json({ success: true, battery: db.battery });
});

app.post('/api/battery/status', (req, res) => {
  const { level, isCharging, emergencyNumber } = req.body;
  const numLevel = Number(level);
  db.battery = {
    level: numLevel,
    isCharging: Boolean(isCharging),
    lastUpdated: new Date().toISOString()
  };

  // Broadcast real-time battery status to connected family dashboards
  io.emit('battery:update', db.battery);

  // If battery <= 10% and not charging, trigger automated emergency SOS event
  let lowBatterySOS = null;
  if (numLevel <= 10 && !isCharging) {
    const userName = db.users[0]?.displayName || 'NETRA User';
    const mapUrl = `https://www.google.com/maps?q=${db.location.latitude},${db.location.longitude}`;
    const smsMessage = `⚠️ [NETRA AI CRITICAL LOW BATTERY ALERT]!\n` +
      `User ${userName}'s device battery is critically low (${numLevel}%).\n` +
      `Device may power off shortly.\n` +
      `📍 Last Verified GPS Location:\n${mapUrl}\n` +
      `Please contact or check on the user immediately!`;

    lowBatterySOS = {
      id: 'sos_batt_' + Date.now(),
      userId: 'usr_001',
      type: 'battery_low',
      status: 'active',
      batteryLevel: numLevel,
      timestamp: new Date().toISOString(),
      location: db.location,
      note: `CRITICAL LOW BATTERY (${numLevel}%): Phone may power off soon. Verified GPS coordinates attached.`,
      deliveryLog: db.emergencyContacts.map(c => ({
        channel: 'Automated Battery SOS SMS',
        recipient: `${c.name} (${c.phone})`,
        status: 'dispatched',
        time: 'Just now'
      }))
    };

    if (emergencyNumber) {
      lowBatterySOS.deliveryLog.push({
        channel: 'Personal Emergency Mobile SMS',
        recipient: emergencyNumber,
        status: 'dispatched',
        time: 'Just now'
      });
    }

    db.sosEvents.unshift(lowBatterySOS);
    db.battery.lastAlertAt = new Date().toISOString();

    // Broadcast critical alert to family and dashboard
    io.emit('sos:alert', lowBatterySOS);
    io.emit('battery:critical', { level: numLevel, event: lowBatterySOS, message: smsMessage });
  }

  res.json({
    success: true,
    battery: db.battery,
    alertTriggered: Boolean(lowBatterySOS),
    sosEvent: lowBatterySOS
  });
});

// 6. Crowd-sourced Hazard Map
app.get('/api/hazards', (req, res) => {
  res.json({ success: true, hazards: db.hazards });
});

app.post('/api/hazards', (req, res) => {
  const { category, title, description, severity, latitude, longitude, locationName } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'Category and title are required' });
  }
  const newHazard = {
    id: 'haz_' + Date.now(),
    category,
    title,
    description: description || '',
    severity: severity || 'medium',
    latitude: latitude || db.location.latitude,
    longitude: longitude || db.location.longitude,
    locationName: locationName || 'User Pindropped Location',
    reportedBy: req.body.reportedBy || db.users[0]?.displayName || 'Community Member',
    reportedAt: new Date().toISOString(),
    status: 'active',
    upvotes: 1
  };
  db.hazards.unshift(newHazard);

  io.emit('hazard:new', newHazard);
  res.status(201).json({ success: true, hazard: newHazard });
});

app.patch('/api/hazards/:id', (req, res) => {
  const { id } = req.params;
  const { action, status } = req.body; // action: 'upvote' | 'resolve' | 'flag'
  const hazard = db.hazards.find(h => h.id === id);
  if (!hazard) {
    return res.status(404).json({ success: false, error: 'Hazard not found' });
  }

  if (action === 'upvote') {
    hazard.upvotes = (hazard.upvotes || 0) + 1;
  } else if (action === 'resolve' || status === 'resolved') {
    hazard.status = 'resolved';
  } else if (action === 'flag' || status === 'flagged') {
    hazard.status = 'flagged';
  }

  io.emit('hazard:updated', hazard);
  res.json({ success: true, hazard });
});

// ======================
// SOCKET.IO REALTIME
// ======================
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial state
  socket.emit('init:state', {
    location: db.location,
    activeSOS: db.sosEvents.filter(e => e.status === 'active'),
    hazardsCount: db.hazards.filter(h => h.status === 'active').length
  });

  socket.on('join:room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 NETRA AI Backend Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO Real-time listening for updates`);
});
