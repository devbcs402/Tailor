import { useState, useEffect, useCallback } from 'react';
import { measurementDefinitionsApi } from '../api/measurementDefinitionsApi';

// In-memory cache per tenant session to avoid excessive HTTP roundtrips
let cachedShirtDefs = null;
let cachedPantDefs = null;
let lastFetchTime = 0;
let inFlightDefinitionsPromise = null;
const CACHE_TTL_MS = 60000; // 1 minute

export const clearMeasurementsCache = () => {
  cachedShirtDefs = null;
  cachedPantDefs = null;
  lastFetchTime = 0;
  inFlightDefinitionsPromise = null;
};

/**
 * Notify all components and open tabs that tenant measurement definitions have been updated
 */
export const notifyMeasurementsUpdated = () => {
  clearMeasurementsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tailor:measurements_updated'));
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('tailor_tenant_sync');
        channel.postMessage({ type: 'measurements_updated', timestamp: Date.now() });
        channel.close();
      }
    } catch (e) {
      // Graceful fallback
    }
  }
};

/**
 * Custom hook to load tenant's active measurement definitions directly from the backend
 */
export const useTenantMeasurements = (options = { activeOnly: true, enabled: true }) => {
  const enabled = options?.enabled !== false;
  const [shirtDefinitions, setShirtDefinitions] = useState(cachedShirtDefs || []);
  const [pantDefinitions, setPantDefinitions] = useState(cachedPantDefs || []);
  const [loading, setLoading] = useState(enabled && (cachedShirtDefs === null || cachedPantDefs === null));
  const [error, setError] = useState(null);

  const fetchDefinitions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedShirtDefs !== null && cachedPantDefs !== null && (now - lastFetchTime < CACHE_TTL_MS)) {
      setShirtDefinitions(cachedShirtDefs);
      setPantDefinitions(cachedPantDefs);
      setLoading(false);
      return;
    }

    if (!force && inFlightDefinitionsPromise) {
      try {
        setLoading(true);
        const sharedData = await inFlightDefinitionsPromise;
        setShirtDefinitions(sharedData.shirt);
        setPantDefinitions(sharedData.pant);
        setLoading(false);
        return;
      } catch (err) {
        // Fall through to direct fetch on error
      }
    }

    try {
      setLoading(true);
      setError(null);

      inFlightDefinitionsPromise = (async () => {
        const [shirtRes, pantRes] = await Promise.all([
          measurementDefinitionsApi.getDefinitions({ category: 'shirt_measurement', active: 'true' }),
          measurementDefinitionsApi.getDefinitions({ category: 'pant_measurement', active: 'true' }),
        ]);

        const sData = Array.isArray(shirtRes?.data) ? shirtRes.data : [];
        const pData = Array.isArray(pantRes?.data) ? pantRes.data : [];

        cachedShirtDefs = sData;
        cachedPantDefs = pData;
        lastFetchTime = Date.now();

        return { shirt: sData, pant: pData };
      })();

      const result = await inFlightDefinitionsPromise;
      setShirtDefinitions(result.shirt);
      setPantDefinitions(result.pant);
    } catch (err) {
      console.error('[useTenantMeasurements] Failed to load definitions from API:', err);
      setError(err);
      cachedShirtDefs = null;
      cachedPantDefs = null;
      // Never treat a failed API request as permission to display static fallback fields.
      setShirtDefinitions([]);
      setPantDefinitions([]);
    } finally {
      inFlightDefinitionsPromise = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchDefinitions();
    }
  }, [fetchDefinitions, enabled]);

  // Listen for real-time measurement updates from settings (same tab or cross-tab)
  useEffect(() => {
    let channel;
    const handleUpdate = () => {
      fetchDefinitions(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('tailor:measurements_updated', handleUpdate);
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          channel = new BroadcastChannel('tailor_tenant_sync');
          channel.onmessage = (event) => {
            if (event.data?.type === 'measurements_updated') {
              handleUpdate();
            }
          };
        }
      } catch (e) {}
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tailor:measurements_updated', handleUpdate);
      }
      if (channel) {
        channel.close();
      }
    };
  }, [fetchDefinitions]);

  return {
    shirtDefinitions,
    pantDefinitions,
    loading,
    error,
    refetch: () => fetchDefinitions(true),
  };
};
