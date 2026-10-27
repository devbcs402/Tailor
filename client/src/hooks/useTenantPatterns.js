import { useState, useEffect, useCallback } from 'react';
import { patternsApi } from '../api/patternsApi';

// In-memory cache for patterns
let cachedShirtPatterns = null;
let cachedPantPatterns = null;
let lastShirtPatternFetchTime = 0;
let lastPantPatternFetchTime = 0;
let inFlightShirtPatternPromise = null;
let inFlightPantPatternPromise = null;
const PATTERN_CACHE_TTL_MS = 60000; // 1 minute

export const clearPatternsCache = () => {
  cachedShirtPatterns = null;
  cachedPantPatterns = null;
  lastShirtPatternFetchTime = 0;
  lastPantPatternFetchTime = 0;
  inFlightShirtPatternPromise = null;
  inFlightPantPatternPromise = null;
};

/**
 * Notify all components and open tabs that tenant patterns have been updated
 */
export const notifyPatternsUpdated = () => {
  clearPatternsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tailor:patterns_updated'));
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('tailor_tenant_sync');
        channel.postMessage({ type: 'patterns_updated', timestamp: Date.now() });
        channel.close();
      }
    } catch (e) {
      // Graceful fallback
    }
  }
};

/**
 * Custom hook to load tenant patterns with real-time invalidation and caching
 * @param {'shirt' | 'pant'} garmentType
 */
export const useTenantPatterns = (garmentType = 'shirt') => {
  const initialCache = garmentType === 'shirt' ? cachedShirtPatterns : cachedPantPatterns;
  const [patterns, setPatterns] = useState(initialCache || []);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState(null);

  const fetchPatterns = useCallback(async (force = false) => {
    const now = Date.now();
    const currentCache = garmentType === 'shirt' ? cachedShirtPatterns : cachedPantPatterns;
    const lastFetch = garmentType === 'shirt' ? lastShirtPatternFetchTime : lastPantPatternFetchTime;

    if (!force && currentCache && (now - lastFetch < PATTERN_CACHE_TTL_MS)) {
      setPatterns(currentCache);
      setLoading(false);
      return;
    }

    const inFlightPromise = garmentType === 'shirt' ? inFlightShirtPatternPromise : inFlightPantPatternPromise;
    if (!force && inFlightPromise) {
      try {
        setLoading(true);
        const shared = await inFlightPromise;
        setPatterns(shared);
        setLoading(false);
        return;
      } catch (err) {
        // Fall through on error
      }
    }

    try {
      setLoading(true);
      setError(null);

      const promise = (async () => {
        const res = await patternsApi.getPatterns({ type: garmentType });
        const data = res.data && Array.isArray(res.data) ? res.data : [];
        if (garmentType === 'shirt') {
          cachedShirtPatterns = data;
          lastShirtPatternFetchTime = Date.now();
        } else {
          cachedPantPatterns = data;
          lastPantPatternFetchTime = Date.now();
        }
        return data;
      })();

      if (garmentType === 'shirt') {
        inFlightShirtPatternPromise = promise;
      } else {
        inFlightPantPatternPromise = promise;
      }

      const data = await promise;
      setPatterns(data);
    } catch (err) {
      console.warn(`[useTenantPatterns] Failed to load ${garmentType} patterns:`, err.message);
      setError(err);
      setPatterns([]);
    } finally {
      if (garmentType === 'shirt') {
        inFlightShirtPatternPromise = null;
      } else {
        inFlightPantPatternPromise = null;
      }
      setLoading(false);
    }
  }, [garmentType]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Listen for cross-component or cross-tab pattern updates
  useEffect(() => {
    let channel;
    const handleUpdate = () => {
      fetchPatterns(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('tailor:patterns_updated', handleUpdate);
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          channel = new BroadcastChannel('tailor_tenant_sync');
          channel.onmessage = (event) => {
            if (event.data?.type === 'patterns_updated') {
              handleUpdate();
            }
          };
        }
      } catch (e) {}
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tailor:patterns_updated', handleUpdate);
      }
      if (channel) {
        channel.close();
      }
    };
  }, [fetchPatterns]);

  return {
    patterns,
    patternNames: patterns.map((p) => p.name),
    loading,
    error,
    refetch: () => fetchPatterns(true),
  };
};
