import React, { useState, useEffect } from 'react';
import { Scissors, CheckSquare, Square } from 'lucide-react';
import { SHIRT_FIELDS } from '../../utils/measurementLabels';
import { patternsApi } from '../../api/patternsApi';

export const ShirtMeasurements = ({
  measurements = {},
  onChangeMeasurements,
  selectedPatterns = [],
  onChangeSelectedPatterns,
  customPattern = '',
  onChangeCustomPattern,
  quantity = 1,
  onChangeQuantity,
}) => {
  const [availablePatterns, setAvailablePatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  // Fetch active shirt patterns configured in Settings
  useEffect(() => {
    let isMounted = true;
    const fetchShirtPatterns = async () => {
      try {
        setLoadingPatterns(true);
        const res = await patternsApi.getPatterns({ type: 'shirt' });
        if (isMounted) {
          if (res.data && res.data.length > 0) {
            setAvailablePatterns(res.data.map((p) => p.name));
          } else {
            setAvailablePatterns(['Plain', 'Chex', 'Stripes', 'Printed', 'Kurta Collar', 'Chinese Collar']);
          }
        }
      } catch (err) {
        if (isMounted) {
          setAvailablePatterns(['Plain', 'Chex', 'Stripes', 'Printed', 'Kurta Collar', 'Chinese Collar']);
        }
      } finally {
        if (isMounted) setLoadingPatterns(false);
      }
    };

    fetchShirtPatterns();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePattern = (patternName) => {
    const isSelected = selectedPatterns.includes(patternName);
    let updated;
    if (isSelected) {
      updated = selectedPatterns.filter((p) => p !== patternName);
    } else {
      updated = [...selectedPatterns, patternName];
    }
    onChangeSelectedPatterns(updated);
  };

  const handleFieldChange = (key, value) => {
    onChangeMeasurements({
      ...measurements,
      [key]: value,
    });
  };

  return (
    <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
      <div className="card-header">
        <div className="card-title">
          <Scissors size={20} color="var(--primary)" />
          <span>Shirt Measurements & Patterns</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>Qty:</label>
          <input
            type="number"
            min="0"
            className="form-control"
            style={{ width: '80px', padding: '6px 10px', fontWeight: 700 }}
            value={quantity}
            onChange={(e) => onChangeQuantity(e.target.value)}
          />
        </div>
      </div>

      {/* Dynamic Shirt Patterns Checkboxes */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label className="form-label" style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Shirt Patterns (શર્ટ પેટર્ન) <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}>— Select all that apply:</span>
          </label>
          {loadingPatterns && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>Loading patterns...</span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '10px',
            padding: '14px',
            backgroundColor: '#f8f7f2',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
          }}
        >
          {availablePatterns.map((pat) => {
            const isChecked = selectedPatterns.includes(pat);
            return (
              <label
                key={pat}
                onClick={(e) => {
                  e.preventDefault();
                  handleTogglePattern(pat);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: isChecked ? 'var(--primary)' : '#ffffff',
                  color: isChecked ? '#ffffff' : 'var(--text-main)',
                  border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: isChecked ? 700 : 500,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                {isChecked ? (
                  <CheckSquare size={16} color="var(--accent-gold)" />
                ) : (
                  <Square size={16} color="var(--text-muted)" />
                )}
                <span>{pat}</span>
              </label>
            );
          })}
        </div>

        {/* Additional Custom Shirt Pattern */}
        <div style={{ marginTop: '12px' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
            Additional Shirt Pattern (શર્ટ પેટર્ન):
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter a custom shirt pattern"
            value={customPattern || ''}
            onChange={(e) => onChangeCustomPattern(e.target.value)}
          />
        </div>
      </div>

      {/* Measurement Fields Grid (No INCH/CM unit selectors or unit suffixes) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {SHIRT_FIELDS.map((f) => (
          <div key={f.key} className="measure-input-card">
            <div className="measure-label">
              <span>{f.label}</span>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder={f.placeholder}
              value={measurements[f.key] || ''}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              style={{ fontWeight: 600, fontSize: '1rem', padding: '6px 10px' }}
            />
          </div>
        ))}
      </div>

      {/* Shirt Special Notes */}
      <div style={{ marginTop: '16px' }}>
        <label className="form-label">Shirt Notes & Instructions:</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Stiff collar buckram, single button cuff, pocket size..."
          value={measurements.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
        />
      </div>
    </div>
  );
};
