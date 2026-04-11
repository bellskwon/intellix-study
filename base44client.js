/**
 * Intellix API Client
 * Drop-in replacement for the base44 SDK.
 * Exposes the same interface: base44.auth.*, base44.entities.*, base44.integrations.Core.*
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Token helpers ────────────────────────────────────────────────────────────
// The token is stored under 'base44_access_token' because app-params.js
// already reads ?access_token from the URL and writes it there automatically.
const TOKEN_KEY = 'base44_access_token';

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(err.message || 'Request failed');
    error.status = res.status;
    error.data = err;
    throw error;
  }
  return res.json();
};

// ─── Query string builder ─────────────────────────────────────────────────────
const toQueryString = (filters = {}, sort = '', limit = '') => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null) params.set(k, v); });
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  const str = params.toString();
  return str ? `?${str}` : '';
};

// ─── Entity factory ───────────────────────────────────────────────────────────
// Creates the same CRUD methods the base44 SDK exposes per entity.
const makeEntity = (entityPath) => ({
  create: (data) =>
    apiFetch(`/api/${entityPath}`, { method: 'POST', body: JSON.stringify(data) }),

  filter: (filters, sort, limit) =>
    apiFetch(`/api/${entityPath}${toQueryString(filters, sort, limit)}`),

  list: (sort, limit) =>
    apiFetch(`/api/${entityPath}${toQueryString({}, sort, limit)}`),

  update: (id, data) =>
    apiFetch(`/api/${entityPath}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    apiFetch(`/api/${entityPath}/${id}`, { method: 'DELETE' }),

  bulkCreate: (items) =>
    apiFetch(`/api/${entityPath}/bulk`, { method: 'POST', body: JSON.stringify({ items }) }),
});

// ─── Main export ──────────────────────────────────────────────────────────────
export const base44 = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    me: () => apiFetch('/api/auth/me'),

    updateMe: (data) =>
      apiFetch('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

    logout: (returnUrl) => {
      try { localStorage.removeItem(TOKEN_KEY); } catch {}
      const url = new URL(`${API_BASE}/api/auth/logout`);
      if (returnUrl) url.searchParams.set('return_url', returnUrl);
      window.location.href = url.toString();
    },

    redirectToLogin: (returnUrl) => {
      const url = new URL(`${API_BASE}/api/auth/google`);
      url.searchParams.set('return_url', returnUrl || window.location.href);
      window.location.href = url.toString();
    },
  },

  // ── Entities ──────────────────────────────────────────────────────────────
  entities: {
    Submission:    makeEntity('submissions'),
    StudyCard:     makeEntity('study-cards'),
    Redemption:    makeEntity('redemptions'),
    Friendship:    makeEntity('friendships'),
    CalendarEvent: makeEntity('calendar-events'),
    QuizQuestion:  makeEntity('quiz-questions'),
    User:          makeEntity('users'),
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  integrations: {
    Core: {
      // File upload — returns { file_url }
      UploadFile: async ({ file }) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      },

      // AI — returns parsed JSON object or plain string
      InvokeLLM: ({ prompt, file_urls, response_json_schema }) =>
        apiFetch('/api/ai/invoke-llm', {
          method: 'POST',
          body: JSON.stringify({ prompt, file_urls, response_json_schema }),
        }),
    },
  },
};
