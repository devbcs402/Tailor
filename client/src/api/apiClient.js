/**
 * API Client for making authenticated requests to Express backend
 */

const BASE_URL = import.meta.env?.VITE_API_URL || '/api';

// In-flight GET request deduplication cache
const inFlightGetRequests = new Map();

export async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('tailor_token');

  // Coalesce identical in-flight GET requests to eliminate duplicate network calls
  if (method === 'GET' && !options.noCache) {
    const cacheKey = `${token || 'anon'}:${endpoint}`;
    if (inFlightGetRequests.has(cacheKey)) {
      return inFlightGetRequests.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        };

        const config = {
          ...options,
          headers,
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('tailor_token');
            localStorage.removeItem('tailor_user');
            window.dispatchEvent(new Event('tailor_auth_logout'));
          }
          const error = new Error(data.message || 'Server request failed');
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } finally {
        inFlightGetRequests.delete(cacheKey);
      }
    })();

    inFlightGetRequests.set(cacheKey, promise);
    return promise;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('tailor_token');
        localStorage.removeItem('tailor_user');
        window.dispatchEvent(new Event('tailor_auth_logout'));
      }
      const error = new Error(data.message || 'Server request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend server. Please make sure the server is running.');
    }
    throw err;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
