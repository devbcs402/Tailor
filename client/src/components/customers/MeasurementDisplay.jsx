import React from 'react';
import { SHIRT_FIELDS, PANT_FIELDS } from '../../utils/measurementLabels';
import { getShirtPatternLabel, getPantPatternLabel } from '../../utils/patternOptions';
import { formatDate } from '../../utils/dateUtils';
import { Ruler } from 'lucide-react';

export const MeasurementDisplay = ({
  measurements,
  shirtPattern = 'plain',
  shirtCustomPattern = '',
  shirtPatterns = [],
  pantPattern = 'plain_pant',
  pantCustomPattern = '',
  pantPatterns = [],
  updatedAt,
}) => {
  const shirt = measurements?.shirt || {};
  const pant = measurements?.pant || {};

  const shirtPatDisplay = [
    ...(Array.isArray(shirtPatterns) && shirtPatterns.length ? shirtPatterns : []),
    shirtPattern && shirtPattern !== 'plain' ? getShirtPatternLabel(shirtPattern, '') : null,
    shirtCustomPattern
  ].filter(Boolean).join(', ') || 'None specified';

  const pantPatDisplay = [
    ...(Array.isArray(pantPatterns) && pantPatterns.length ? pantPatterns : []),
    pantPattern && pantPattern !== 'plain_pant' ? getPantPatternLabel(pantPattern, '') : null,
    pantCustomPattern
  ].filter(Boolean).join(', ') || 'None specified';

  const hasShirtMeasurements = Object.values(shirt).some((v) => v && String(v).trim().length > 0);
  const hasPantMeasurements = Object.values(pant).some((v) => v && String(v).trim().length > 0);

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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px',
            }}
          >
            {SHIRT_FIELDS.map((f) => {
              const val = shirt[f.key];
              return (
                <div
                  key={f.key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {val || '-'}
                  </div>
                </div>
              );
            })}
          </div>

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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px',
            }}
          >
            {PANT_FIELDS.map((f) => {
              const val = pant[f.key];
              return (
                <div
                  key={f.key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {val || '-'}
                  </div>
                </div>
              );
            })}
          </div>

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
