import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Interceptor attaching Bearer JWT token if present
apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// A rejected token means the stored session is dead; clear it so the UI returns
// to a signed-out state instead of retrying with a credential the server refuses.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAppStore.getState().token) {
      useAppStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

/**
 * Normalises an axios failure into a single Error with a message worth showing.
 * Distinguishes "the server said no" from "the server never answered", because
 * the two need different things from the user.
 */
const toApiError = (err, fallbackMessage) => {
  if (err.response) {
    return new Error(err.response.data?.message || fallbackMessage);
  }
  if (err.code === 'ECONNABORTED') {
    return new Error('The server took too long to respond. Please try again.');
  }
  return new Error('Cannot reach the KrishiFlow server. Check your connection.');
};

/** True when the request failed because the backend is unreachable, not because it refused. */
const isOffline = (err) => !err.response;

export const fetchHealthStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 10000 });
    return res.data;
  } catch (err) {
    return { status: 'offline', aiEngineStatus: 'offline', dbConnected: false };
  }
};

/* ---- Blackout resilience console (/api/system/*) -------------------------- *
 * Unauthenticated on the backend; a Bearer header, if present, is ignored.
 * `getSystemHealth` degrades silently so the poll never throws; the action
 * calls surface a readable error.                                            */

export const getSystemHealth = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/system/health`, { timeout: 6000 });
    return res.data;
  } catch (err) {
    return { ok: false, mode: 'unknown', db: 'down', mongoConnected: false, unreachable: true };
  }
};

const systemAction = async (path, human) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/system${path}`, {}, { timeout: 60000 });
    return res.data;
  } catch (err) {
    throw toApiError(err, human);
  }
};

export const seedDrillData = () => systemAction('/drill/seed', 'Could not seed the drill data.');
export const simulateBlackout = () => systemAction('/drill/blackout', 'Could not run the blackout.');
export const resetDrill = () => systemAction('/drill/reset', 'Could not reset the drill.');
export const startLoadGen = () => systemAction('/drill/load/start', 'Could not start the load generator.');
export const stopLoadGen = () => systemAction('/drill/load/stop', 'Could not stop the load generator.');
export const recoverSystem = () => systemAction('/recover', 'Recovery failed.');
export const takeSystemSnapshot = () => systemAction('/snapshot', 'Could not take a snapshot.');

export const submitOptimization = async (payload) => {
  try {
    const response = await apiClient.post('/recommend', payload);
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not calculate routes for this consignment.');
  }
};

export const fetchNearbyVehicles = async (lng, lat) => {
  try {
    const response = await apiClient.get('/vehicles/nearby', { params: { lng, lat } });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch nearby vehicles:', err.message);
    return { success: false, vehicles: [] };
  }
};

export const seedVehicleFleet = async () => {
  try {
    const response = await apiClient.post('/vehicles/seed');
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not seed the demo vehicle fleet.');
  }
};

export const fetchLiveAgmarknetMarkets = async (crop = 'Tomato', state = '') => {
  try {
    const response = await apiClient.get('/agmarknet/live-rates', {
      params: { crop, state }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch live Govt Agmarknet markets:', err.message);
    return { success: false, records: [] };
  }
};

export const fetchAgmarknetHistory = async (crop = 'Tomato', state = 'Maharashtra', days = 14) => {
  try {
    const response = await apiClient.get('/agmarknet/history', {
      params: { crop, state, days }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch Agmarknet price history:', err.message);
    return { success: false, days: [] };
  }
};

/**
 * Rule-based "sell now or wait" guidance for a crop.
 *
 * The scoring runs in the Python engine (weather from OpenWeather × per-crop
 * weather-friendliness, plus the recent price trend). This endpoint gathers the
 * live Agmarknet inputs and calls it. `originLng`/`originLat` are the farm
 * location — passed so the engine can look up weather there; omit them and the
 * weather term is simply left out of the score.
 *
 * On any failure the response is `{ success: true, advice: null }` — the caller
 * still shows the live rates, just without the advice card.
 */
export const fetchSellAdvice = async (
  crop = 'Tomato',
  { originLng, originLat, baselinePricePerKg, state = 'Maharashtra', language = 'en' } = {},
) => {
  try {
    const response = await apiClient.get('/prices/sell-advice', {
      params: { crop, state, originLng, originLat, baselinePricePerKg, language },
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch sell advice:', err.message);
    return { success: false, advice: null };
  }
};

/**
 * The trained model's ~7-period-ahead price for a crop, as a chart series
 * (real history + projection), plus `modelInfo` — status and crop coverage for
 * both the model and the rule-based scorer, which drives the forecast NOTE.
 *
 * `forecast.available` is false (with a reason) whenever the model can't
 * produce a number; the caller then falls back to its own history-trend line.
 */
export const fetchModelForecast = async (crop = 'Tomato', { market, district } = {}) => {
  try {
    const response = await apiClient.get('/prices/model-forecast', {
      params: { crop, market, district },
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch model forecast:', err.message);
    return { success: false, forecast: { available: false, reason: 'unreachable' }, modelInfo: null };
  }
};

/*
 * The commodity list is fetched at most once per session per state.
 *
 * It is the heaviest query we make — an unfiltered sweep of the feed rather
 * than one crop — and the answer changes with the season, not with the minute.
 * The Crop screen mounts every time the farmer taps that tab, so without this
 * the same 40-second query ran on each visit.
 */
const commodityCache = new Map();

/** Which commodities Maharashtra's mandis are actually reporting right now. */
export const fetchAgmarknetCommodities = async (state = 'Maharashtra') => {
  if (commodityCache.has(state)) return commodityCache.get(state);

  const request = (async () => {
    try {
      const response = await apiClient.get('/agmarknet/commodities', {
        params: { state },
        // An unfiltered sweep of the feed is far heavier than one crop's rates.
        timeout: 45000,
      });
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch Agmarknet commodity list:', err.message);
      // Not cached: a failure should be retried on the next visit, unlike a
      // successful answer which is good for the rest of the session.
      commodityCache.delete(state);
      return { success: false, commodities: [] };
    }
  })();

  commodityCache.set(state, request);
  return request;
};

export const sendPriceAlertSms = async ({ phone, cropType, targetPrice, currentPrice, mandiName }) => {
  try {
    const response = await apiClient.post('/alerts/send-sms', {
      phone, cropType, targetPrice, currentPrice, mandiName
    });
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not send the alert SMS.');
  }
};

/**
 * Current conditions at the farm, for the spoilage estimate and the Today
 * strip. Backed by Open-Meteo (keyless), 20-min cached server-side. On any
 * failure the caller gets `{ weather: null }` and the UI simply drops the strip
 * and falls back to a default road temperature — same degrade-silently contract
 * as `fetchSellAdvice`.
 */
export const fetchLiveWeather = async (lat, lon) => {
  try {
    const { data } = await apiClient.get('/weather/live', { params: { lat, lon } });
    // The backend answers 200 with null fields when Open-Meteo is unreachable.
    if (!data?.weather || data.weather.temperature == null) return { weather: null };
    return { weather: data.weather };
  } catch (err) {
    console.warn('Failed to fetch live weather:', err.message);
    return { weather: null };
  }
};

export const fetchAllMarkets = async (crop = 'Tomato', state = '') => {
  try {
    const response = await apiClient.get('/markets', {
      params: { crop, state, limit: 100 }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch markets:', err.message);
    return { success: false, markets: [] };
  }
};

/*
 * Offline demo profiles.
 *
 * When the backend is unreachable the app still needs a coherent identity to
 * render, so each demo account carries a full profile. Deriving a name from the
 * email local-part instead would surface strings like "rajesh.buyer" as the
 * user's display name.
 */
const DEMO_PROFILES = {
  'ramesh.farmer@krishiflow.ai': {
    name: 'Ramesh Singh',
    role: 'Farmer',
    phone: '+91 98765 43210',
    location: 'Nashik, Maharashtra'
  },
  'suresh.driver@krishiflow.ai': {
    name: 'Suresh Shinde',
    role: 'Driver',
    phone: '+91 98230 11223',
    location: 'Nashik Logistics Hub'
  },
  'rajesh.buyer@krishiflow.ai': {
    name: 'Rajesh Mehta',
    role: 'APMC Buyer',
    phone: '+91 98200 55443',
    company: 'Mehta Produce Corp',
    licenseNo: 'APMC-MH-8842',
    location: 'Vashi Wholesale APMC'
  }
};

/** Turns "priya.patil@x.com" into "Priya Patil" for accounts with no stored profile. */
const nameFromEmail = (email = '') =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'KrishiFlow User';

const buildDemoUser = (email, overrides = {}) => ({
  id: 'usr-' + Date.now(),
  email,
  role: 'Farmer',
  ...(DEMO_PROFILES[email] || { name: nameFromEmail(email), phone: '' }),
  ...overrides
});

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  } catch (err) {
    // Only fall back to demo mode when the server is unreachable. A real 401
    // must stay an error, or bad credentials would silently "succeed".
    if (!isOffline(err)) {
      throw toApiError(err, 'Login failed. Check your email and password.');
    }
    return {
      success: true,
      offline: true,
      token: 'demo-token-' + Date.now(),
      user: buildDemoUser(credentials.email)
    };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (err) {
    if (!isOffline(err)) {
      throw toApiError(err, 'Registration failed. Please try again.');
    }
    return {
      success: true,
      offline: true,
      token: 'demo-token-' + Date.now(),
      user: buildDemoUser(userData.email, {
        name: userData.name || nameFromEmail(userData.email),
        role: userData.role || 'Farmer',
        phone: userData.phone || ''
      })
    };
  }
};

/* ---------------------------------------------------------- map geometry */

/*
 * Road geometry for the map layer. Drawing only — the dispatch ranking still
 * measures haversine x 1.3 server-side, and the map caption says so.
 *
 * Cached per path for the session: a dispatcher opens the same suggestion card
 * repeatedly while deciding, and the shape of a fixed stop sequence does not
 * change between two taps.
 */
const routeCache = new Map();

export const fetchRouteGeometry = async (points) => {
  const path = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
  if (routeCache.has(path)) return routeCache.get(path);

  const request = (async () => {
    try {
      const { data } = await apiClient.get('/routing/route', { params: { path } });
      return data;
    } catch (err) {
      /*
       * No throw. The map already holds the stops, so it can draw the legs
       * straight and stamp them — a route with an honest approximate shape
       * beats an empty panel. Not cached, so the next open tries again.
       */
      console.warn('Could not fetch road geometry:', err.message);
      routeCache.delete(path);
      return { success: false, source: 'offline', geometry: null };
    }
  })();

  routeCache.set(path, request);
  return request;
};

/* ------------------------------------------------------------- the account

 * Reading and editing the signed-in user. Every one of these acts on the
 * caller's own account — there is no id in any path — so nothing here can be
 * pointed at somebody else's profile.
 */

/**
 * Re-reads the account from the server.
 *
 * Sessions stored in localStorage before the server started returning phone and
 * village carry neither, so the profile screen refreshes itself on mount rather
 * than showing "Not given" for details the account filled in at signup. A
 * failure is not something the user needs told: the stored session still
 * renders, it is just older.
 */
export const fetchProfile = async () => {
  try {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  } catch (err) {
    console.warn('Could not refresh the profile:', err.message);
    return null;
  }
};

/**
 * Saves edited details, and says which of the two things happened.
 *
 * Offline it keeps the bargain login already makes: a demo session has no
 * server behind it, so the edit is applied to this device and `offline` comes
 * back true for the screen to say so. A refused edit — a taken email, a bad
 * mobile number — is a real answer from a real server and stays an error.
 */
export const updateProfile = async (patch) => {
  try {
    const { data } = await apiClient.patch('/auth/me', patch);
    return { user: data.user, offline: false };
  } catch (err) {
    if (!isOffline(err)) {
      throw toApiError(err, 'Could not save your details.');
    }
    const current = useAppStore.getState().user || {};
    return { user: { ...current, ...patch }, offline: true };
  }
};

/**
 * No offline fallback here, deliberately. A password change that only happened
 * on this handset is a password the account cannot log in with tomorrow.
 */
export const changePassword = async ({ currentPassword, newPassword }) => {
  try {
    const { data } = await apiClient.post('/auth/me/password', { currentPassword, newPassword });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not change your password.');
  }
};

/*
 * Pickup requests and dispatch.
 *
 * All of it is authenticated and server-side. None of these have an offline
 * fallback, unlike login above, and that is deliberate: a fabricated dispatch
 * queue would have a fleet owner sending a real truck to a farmer who never
 * asked, and a fabricated ranking could disagree with the one the server would
 * have given. When the backend is down these screens say so.
 */

/* ----------------------------------------------------------------- farmer */

export const createPickupRequest = async (payload) => {
  const { data } = await apiClient.post('/requests', payload);
  return data.request;
};

export const fetchMyRequests = async () => {
  const { data } = await apiClient.get('/requests/mine');
  return data.requests;
};

export const cancelPickupRequest = async (id) => {
  const { data } = await apiClient.post(`/requests/${id}/cancel`);
  return data.request;
};

/* ----------------------------------------------------------- fleet owner */

/**
 * The ranked queue. Takes no fleet payload — the server reads the caller's own
 * vehicles and the open requests, so nobody can rank a fleet they do not own.
 */
export const fetchDispatchSuggestions = async (topN = 3) => {
  const { data } = await apiClient.get('/dispatch/suggestions', { params: { topN } });
  return data;
};

export const approveSuggestion = async (requestId, { vehicleId, proposedRoute, dispatch }) => {
  const { data } = await apiClient.post(`/requests/${requestId}/assign`, {
    vehicleId, proposedRoute, dispatch,
  });
  return data.request;
};

export const fetchDispatchQueue = async () => {
  const { data } = await apiClient.get('/requests/queue');
  return data;
};

export const updateRequestStatus = async (requestId, status, note) => {
  const { data } = await apiClient.post(`/requests/${requestId}/status`, { status, note });
  return data.request;
};

export const fetchFleet = async () => {
  const { data } = await apiClient.get('/fleet');
  return data.vehicles;
};

/**
 * A position report from the cab. Authenticated and owner-scoped server-side,
 * which is what lets the server broadcast it to the watching farmer as trusted.
 */
export const reportVehicleLocation = async (vehicleId, coordinates) => {
  try {
    const { data } = await apiClient.post(`/fleet/${vehicleId}/location`, { coordinates });
    return data.vehicle;
  } catch (err) {
    throw toApiError(err, 'Could not send the vehicle position.');
  }
};

export const addFleetVehicle = async (vehicle) => {
  const { data } = await apiClient.post('/fleet', vehicle);
  return data.vehicle;
};

/* ------------------------------------------------------------- RAG Agent */

export const sendRagQuestion = async (message, conversationId = null, language = null) => {
  try {
    const { data } = await apiClient.post('/rag/chat', { message, conversationId, language });
    return data.data;
  } catch (err) {
    throw toApiError(err, 'Could not process question with KrishiFlow AI Sahayak.');
  }
};

/* ------------------------------------------------------- Buyer Postings */

/**
 * Create a new buyer rate posting
 * POST /api/buyer/postings
 */
export const createBuyerPosting = async (posting) => {
  try {
    const { data } = await apiClient.post('/buyer/postings', posting);
    return data.posting;
  } catch (err) {
    throw toApiError(err, 'Could not create buyer posting.');
  }
};

/**
 * Fetch all active buyer postings (visible to farmers)
 * GET /api/buyer/postings?cropType=Tomato&mandiName=Mumbai
 */
export const fetchBuyerPostings = async (filters = {}) => {
  try {
    const { data } = await apiClient.get('/buyer/postings', { params: filters });
    return data.postings;
  } catch (err) {
    console.warn('Failed to fetch buyer postings:', err.message);
    return [];
  }
};

/**
 * Fetch buyer's own postings
 * GET /api/buyer/postings/mine
 */
export const fetchMyBuyerPostings = async () => {
  try {
    const { data } = await apiClient.get('/buyer/postings/mine');
    return data.postings;
  } catch (err) {
    console.warn('Failed to fetch your postings:', err.message);
    return [];
  }
};

/**
 * Delete a buyer posting
 * DELETE /api/buyer/postings/:id
 */
export const deleteBuyerPosting = async (id) => {
  try {
    const { data } = await apiClient.delete(`/buyer/postings/${id}`);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not delete buyer posting.');
  }
};

/**
 * Update received quantity for a posting
 * PATCH /api/buyer/postings/:id/received
 */
export const updateBuyerPostingReceived = async (id, receivedQuantityKg) => {
  try {
    const { data } = await apiClient.patch(`/buyer/postings/${id}/received`, { receivedQuantityKg });
    return data.posting;
  } catch (err) {
    throw toApiError(err, 'Could not update received quantity.');
  }
};

/* ------------------------------------------------------------- Buyer Inbound */

/**
 * Fetch incoming shipments for buyer
 * GET /api/requests/inbound
 */
export const fetchBuyerInbound = async () => {
  try {
    const { data } = await apiClient.get('/requests/inbound');
    return data.requests;
  } catch (err) {
    console.warn('Failed to fetch inbound shipments:', err.message);
    return [];
  }
};
