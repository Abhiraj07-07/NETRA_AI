// API client for NETRA AI Backend
// Dynamically resolves to Vite proxy (/api) on port 5173, current IP on LAN, or localhost:5000
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') return '/api';
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Profile & Settings
  getProfile: () => request('/users/profile'),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Contacts
  getContacts: () => request('/emergency-contacts'),
  addContact: (data) => request('/emergency-contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id, data) => request(`/emergency-contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id) => request(`/emergency-contacts/${id}`, { method: 'DELETE' }),

  // Location
  updateLocation: (coords) => request('/location', { method: 'POST', body: JSON.stringify(coords) }),
  getLatestLocation: () => request('/location/latest'),

  // SOS
  triggerSOS: (payload) => request('/sos', { method: 'POST', body: JSON.stringify(payload) }),
  sendDirectSMS: (payload) => request('/sos/send-sms', { method: 'POST', body: JSON.stringify(payload) }),
  getSOSHistory: () => request('/sos/history'),
  resolveSOS: (id) => request(`/sos/${id}/resolve`, { method: 'POST' }),

  // Battery
  reportBatteryStatus: (data) => request('/battery/status', { method: 'POST', body: JSON.stringify(data) }),
  getBatteryStatus: () => request('/battery/status'),

  // Hazards
  getHazards: () => request('/hazards'),
  reportHazard: (data) => request('/hazards', { method: 'POST', body: JSON.stringify(data) }),
  updateHazard: (id, payload) => request(`/hazards/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
};
