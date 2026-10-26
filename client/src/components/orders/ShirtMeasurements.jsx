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

  const numQty = parseInt(quantity, 10);
  const isAvailable = !isNaN(numQty) && numQty > 0;

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    const parsed = parseInt(val, 10);
    onChangeQuantity(val);
    // If quantity is set to 0 or becomes empty, clear dependent measurements
    if (isNaN(parsed) || parsed <= 0) {
      onChangeMeasurements({});
    }
  };

  const handleTogglePattern = (patternName) => {
    if (!isAvailable) return;
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
    if (!isAvailable) return;
    if (key === 'notes') {
      onChangeMeasurements({
        ...measurements,
        [key]: value,
      });
    } else {
      // Validate: only positive numeric values with optional decimal, reject letters and negatives
      const clean = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      onChangeMeasurements({
        ...measurements,
        [key]: clean,
      });
    }
  };

  return (
    <div className="card" style={{ borderTop: '4px solid var(--primary)', opacity: isAvailable ? 1 : 0.88 }}>
      <div className="card-header">
        <div className="card-title">
          <Scissors size={20} color="var(--primary)" />
          <span>Shirt Measurements & Patterns</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Qty:</label>
          <input
            type="number"
            min="0"
            className="form-control"
            style={{ width: '80px', padding: '6px 10px', fontWeight: 700, borderColor: isAvailable ? 'var(--primary)' : 'var(--border-light)' }}
            value={quantity}
            onChange={handleQuantityChange}
          />
        </div>
      </div>

      {/* When Quantity is 0 or empty notice */}
      {!isAvailable && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '0.88rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>ℹ️ Shirt quantity is {quantity === '' ? 'empty' : quantity}. Set quantity to 1 or more to enable shirt measurements and patterns.</span>
        </div>
      )}

      {/* Dynamic Shirt Patterns Checkboxes */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label className="form-label" style={{ fontWeight: 700, margin: 0, color: isAvailable ? 'var(--text-main)' : 'var(--text-muted)' }}>
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
            backgroundColor: isAvailable ? '#f8f7f2' : '#f1f5f9',
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
                  if (isAvailable) handleTogglePattern(pat);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: isChecked && isAvailable ? 'var(--primary)' : '#ffffff',
                  color: isChecked && isAvailable ? '#ffffff' : isAvailable ? 'var(--text-main)' : '#94a3b8',
                  border: isChecked && isAvailable ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  fontWeight: isChecked ? 700 : 500,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  opacity: isAvailable ? 1 : 0.65,
                }}
              >
                {isChecked && isAvailable ? (
                  <CheckSquare size={16} color="var(--accent-gold)" />
                ) : (
                  <Square size={16} color={isAvailable ? 'var(--text-muted)' : '#cbd5e1'} />
                )}
                <span>{pat}</span>
              </label>
            );
          })}
        </div>

        {/* Additional Custom Shirt Pattern */}
        <div style={{ marginTop: '12px' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem', color: isAvailable ? 'var(--text-main)' : 'var(--text-muted)' }}>
            Additional Shirt Pattern (શર્ટ પેટર્ન):
          </label>
          <input
            type="text"
            className="form-control"
            placeholder={isAvailable ? 'Enter a custom shirt pattern' : 'Disabled (Qty is 0)'}
            value={isAvailable ? (customPattern || '') : ''}
            onChange={(e) => isAvailable && onChangeCustomPattern(e.target.value)}
            disabled={!isAvailable}
            style={{ backgroundColor: isAvailable ? '#ffffff' : '#f8fafc', cursor: isAvailable ? 'text' : 'not-allowed' }}
          />
        </div>
      </div>

      {/* Measurement Fields Grid (Disabled/empty when Qty is 0) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {SHIRT_FIELDS.map((f) => (
          <div
            key={f.key}
            className="measure-input-card"
            style={{
              backgroundColor: isAvailable ? '#ffffff' : '#f8fafc',
              borderColor: isAvailable ? 'var(--border-light)' : '#e2e8f0',
              opacity: isAvailable ? 1 : 0.7,
            }}
          >
            <div className="measure-label">
              <span style={{ color: isAvailable ? '#475569' : '#94a3b8' }}>{f.label}</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              className="form-control"
              placeholder={isAvailable ? f.placeholder : '—'}
              value={isAvailable ? (measurements[f.key] || '') : ''}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              disabled={!isAvailable}
              style={{
                fontWeight: 600,
                fontSize: '1rem',
                padding: '6px 10px',
                backgroundColor: isAvailable ? '#ffffff' : '#f1f5f9',
                cursor: isAvailable ? 'text' : 'not-allowed',
              }}
            />
          </div>
        ))}
      </div>

      {/* Shirt Special Notes */}
      <div style={{ marginTop: '16px' }}>
        <label className="form-label" style={{ color: isAvailable ? 'var(--text-main)' : 'var(--text-muted)' }}>
          Shirt Notes & Instructions:
        </label>
        <input
          type="text"
          className="form-control"
          placeholder={isAvailable ? 'e.g. Stiff collar buckram, single button cuff, pocket size...' : 'Disabled (Qty is 0)'}
          value={isAvailable ? (measurements.notes || '') : ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          disabled={!isAvailable}
          style={{ backgroundColor: isAvailable ? '#ffffff' : '#f8fafc', cursor: isAvailable ? 'text' : 'not-allowed' }}
        />
      </div>
    </div>
  );
};
