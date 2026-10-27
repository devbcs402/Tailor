import { useState, useEffect, useCallback } from 'react';
import { measurementDefinitionsApi } from '../api/measurementDefinitionsApi';
import { SHIRT_FIELDS, PANT_FIELDS } from '../utils/measurementLabels';

// In-memory cache per tenant session to avoid excessive HTTP roundtrips
let cachedShirtDefs = null;
let cachedPantDefs = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

export const clearMeasurementsCache = () => {
  cachedShirtDefs = null;
  cachedPantDefs = null;
  lastFetchTime = 0;
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
 * Custom hook to load tenant's active measurement definitions with fallback to standard fields
 */
export const useTenantMeasurements = (options = { activeOnly: true }) => {
  const [shirtDefinitions, setShirtDefinitions] = useState(cachedShirtDefs || []);
  const [pantDefinitions, setPantDefinitions] = useState(cachedPantDefs || []);
  const [loading, setLoading] = useState(!cachedShirtDefs || !cachedPantDefs);
  const [error, setError] = useState(null);

  const fetchDefinitions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedShirtDefs && cachedPantDefs && (now - lastFetchTime < CACHE_TTL_MS)) {
      setShirtDefinitions(cachedShirtDefs);
      setPantDefinitions(cachedPantDefs);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [shirtRes, pantRes] = await Promise.all([
        measurementDefinitionsApi.getDefinitions({ category: 'shirt_measurement', active: 'true' }),
        measurementDefinitionsApi.getDefinitions({ category: 'pant_measurement', active: 'true' }),
      ]);

      const sData = (shirtRes.data && shirtRes.data.length > 0)
        ? shirtRes.data
        : SHIRT_FIELDS.map((f, i) => ({
            fieldKey: f.key,
            displayName: f.label,
            gujaratiName: f.gujaratiLabel,
            fieldType: 'number',
            isRequired: Boolean(f.required),
            isActive: true,
            displayOrder: i + 1,
          }));

      const pData = (pantRes.data && pantRes.data.length > 0)
        ? pantRes.data
        : PANT_FIELDS.map((f, i) => ({
            fieldKey: f.key,
            displayName: f.label,
            gujaratiName: f.gujaratiLabel,
            fieldType: 'number',
            isRequired: Boolean(f.required),
            isActive: true,
            displayOrder: i + 1,
          }));

      cachedShirtDefs = sData;
      cachedPantDefs = pData;
      lastFetchTime = now;

      setShirtDefinitions(sData);
      setPantDefinitions(pData);
    } catch (err) {
      console.warn('[useTenantMeasurements] Failed to load definitions from API, using defaults:', err.message);
      setError(err);
      // Fallback to static standard fields
      setShirtDefinitions(SHIRT_FIELDS.map((f, i) => ({
        fieldKey: f.key,
        displayName: f.label,
        gujaratiName: f.gujaratiLabel,
        fieldType: 'number',
        isRequired: Boolean(f.required),
        isActive: true,
        displayOrder: i + 1,
      })));
      setPantDefinitions(PANT_FIELDS.map((f, i) => ({
        fieldKey: f.key,
        displayName: f.label,
        gujaratiName: f.gujaratiLabel,
        fieldType: 'number',
        isRequired: Boolean(f.required),
        isActive: true,
        displayOrder: i + 1,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

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
