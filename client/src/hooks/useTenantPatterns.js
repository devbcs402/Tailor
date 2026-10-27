import { useState, useEffect, useCallback } from 'react';
import { patternsApi } from '../api/patternsApi';

// In-memory cache for patterns
let cachedShirtPatterns = null;
let cachedPantPatterns = null;
let lastPatternFetchTime = 0;
const PATTERN_CACHE_TTL_MS = 60000; // 1 minute

export const clearPatternsCache = () => {
  cachedShirtPatterns = null;
  cachedPantPatterns = null;
  lastPatternFetchTime = 0;
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
    if (!force && currentCache && (now - lastPatternFetchTime < PATTERN_CACHE_TTL_MS)) {
      setPatterns(currentCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await patternsApi.getPatterns({ type: garmentType });
      const data = res.data && Array.isArray(res.data) ? res.data : [];
      if (garmentType === 'shirt') {
        cachedShirtPatterns = data;
      } else {
        cachedPantPatterns = data;
      }
      lastPatternFetchTime = now;
      setPatterns(data);
    } catch (err) {
      console.warn(`[useTenantPatterns] Failed to load ${garmentType} patterns:`, err.message);
      setError(err);
      setPatterns([]);
    } finally {
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
