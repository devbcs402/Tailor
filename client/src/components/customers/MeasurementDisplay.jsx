import React from 'react';
import { getShirtPatternLabel, getPantPatternLabel } from '../../utils/patternOptions';
import { formatDate } from '../../utils/dateUtils';
import { useTenantMeasurements } from '../../hooks/useTenantMeasurements';
import { getFieldValue, normalizeKey, TAILOR_ALIASES } from '../../utils/measurementLabels';

export const MeasurementDisplay = ({
  measurements,
  shirtPattern = '',
  shirtCustomPattern = '',
  shirtPatterns = [],
  pantPattern = '',
  pantCustomPattern = '',
  pantPatterns = [],
  updatedAt,
  shirtDefinitions: propShirtDefs,
  pantDefinitions: propPantDefs,
}) => {
  const shirt = measurements?.shirt || {};
  const pant = measurements?.pant || {};

  const { shirtDefinitions: hookShirtDefs, pantDefinitions: hookPantDefs } = useTenantMeasurements();
  const baseShirtDefs = propShirtDefs || hookShirtDefs || [];
  const basePantDefs = propPantDefs || hookPantDefs || [];

  const isCoveredByDefinitions = (key, defs) => {
    const norm = normalizeKey(key);
    for (const d of defs) {
      if (d.fieldKey === key || normalizeKey(d.fieldKey) === norm) return true;
      const aliases = TAILOR_ALIASES[normalizeKey(d.fieldKey)];
      if (aliases && aliases.map(normalizeKey).includes(norm)) return true;
    }
    return false;
  };

  // Combine definitions with any extra keys present in the saved customer measurement object
  const extraShirtFields = Object.keys(shirt)
    .filter((k) => k !== 'notes' && k !== '_id' && !k.startsWith('$') && !k.startsWith('_') && !isCoveredByDefinitions(k, baseShirtDefs) && shirt[k] !== undefined && shirt[k] !== null && String(shirt[k]).trim().length > 0)
    .map((k) => ({
      fieldKey: k,
      displayName: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      gujaratiName: '',
    }));
  const displayShirtFields = [...baseShirtDefs, ...extraShirtFields];

  const extraPantFields = Object.keys(pant)
    .filter((k) => k !== 'notes' && k !== '_id' && !k.startsWith('$') && !k.startsWith('_') && !isCoveredByDefinitions(k, basePantDefs) && pant[k] !== undefined && pant[k] !== null && String(pant[k]).trim().length > 0)
    .map((k) => ({
      fieldKey: k,
      displayName: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      gujaratiName: '',
    }));
  const displayPantFields = [...basePantDefs, ...extraPantFields];

  const shirtPatDisplay = [
    ...(Array.isArray(shirtPatterns) && shirtPatterns.length ? shirtPatterns : []),
    shirtPattern && shirtPattern !== 'plain' ? getShirtPatternLabel(shirtPattern, '') : null,
    shirtCustomPattern,
  ].filter(Boolean).join(', ') || 'None specified';

  const pantPatDisplay = [
    ...(Array.isArray(pantPatterns) && pantPatterns.length ? pantPatterns : []),
    pantPattern && pantPattern !== 'plain_pant' ? getPantPatternLabel(pantPattern, '') : null,
    pantCustomPattern,
  ].filter(Boolean).join(', ') || 'None specified';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Last Updated Bar if present */}
      {updatedAt && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '8px 14px',
            background: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            fontSize: '0.84rem',
            color: 'var(--text-muted)',
          }}
        >
          Last Updated: {formatDate(updatedAt)}
        </div>
      )}

      <div className="grid-2">
        {/* Shirt Measurements Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header" style={{ marginBottom: '14px', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title" style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
              Shirt Measurements
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                fontWeight: 600,
              }}
            >
              Pattern: {shirtPatDisplay}
            </span>
          </div>

          {displayShirtFields.length === 0 ? (
            <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.86rem', fontStyle: 'italic' }}>
              No shirt measurements recorded.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {displayShirtFields.map((f) => {
                const val = getFieldValue(shirt, f.fieldKey);
                return (
                  <div
                    key={f.fieldKey}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {f.displayName} {f.gujaratiName ? `(${f.gujaratiName})` : ''}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {val || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {shirt.notes && (
            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#475569', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
              <strong>Notes:</strong> {shirt.notes}
            </div>
          )}
        </div>

        {/* Pant Measurements Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header" style={{ marginBottom: '14px', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title" style={{ fontSize: '1.05rem', color: 'var(--secondary)' }}>
              Pant Measurements
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-gold-light)',
                color: 'var(--secondary)',
                fontWeight: 600,
              }}
            >
              Pattern: {pantPatDisplay}
            </span>
          </div>

          {displayPantFields.length === 0 ? (
            <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.86rem', fontStyle: 'italic' }}>
              No pant measurements recorded.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {displayPantFields.map((f) => {
                const val = getFieldValue(pant, f.fieldKey);
                return (
                  <div
                    key={f.fieldKey}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {f.displayName} {f.gujaratiName ? `(${f.gujaratiName})` : ''}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {val || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pant.notes && (
            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#475569', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
              <strong>Notes:</strong> {pant.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
