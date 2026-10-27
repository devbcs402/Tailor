import React from 'react';
import { Scissors, CheckSquare, Square, History } from 'lucide-react';
import { useTenantMeasurements } from '../../hooks/useTenantMeasurements';
import { useTenantPatterns } from '../../hooks/useTenantPatterns';
import { getFieldValue, normalizeKey, TAILOR_ALIASES } from '../../utils/measurementLabels';

export const ShirtMeasurements = ({
  measurements = {},
  onChangeMeasurements,
  selectedPatterns = [],
  onChangeSelectedPatterns,
  customPattern = '',
  onChangeCustomPattern,
  quantity = 1,
  onChangeQuantity,
  errors = {},
  onClearError,
  definitions: propDefinitions,
}) => {
  // Use pattern hook for real-time synchronized pattern definitions
  const { patternNames: availablePatterns, loading: loadingPatterns } = useTenantPatterns('shirt');

  // Use hook to fetch tenant's definitions only if not provided by parent
  const hasPropDefinitions = propDefinitions !== undefined;
  const { shirtDefinitions: hookDefinitions, loading: loadingDefs, error: errorDefs } = useTenantMeasurements({
    enabled: !hasPropDefinitions,
  });
  const baseDefinitions = hasPropDefinitions ? propDefinitions : (hookDefinitions || []);

  const numQty = parseInt(quantity, 10);
  const isAvailable = !isNaN(numQty) && numQty > 0;

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    const parsed = parseInt(val, 10);
    onChangeQuantity(val);
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

  const isCoveredByDefinitions = (key, defs) => {
    const norm = normalizeKey(key);
    for (const d of defs) {
      if (d.fieldKey === key || normalizeKey(d.fieldKey) === norm) return true;
      const aliases = TAILOR_ALIASES[normalizeKey(d.fieldKey)];
      if (aliases && aliases.map(normalizeKey).includes(norm)) return true;
    }
    return false;
  };

  const handleFieldChange = (key, value, fieldType = 'number') => {
    if (!isAvailable) return;
    if (onClearError) {
      onClearError(key);
    }
    const clean = (key === 'notes' || fieldType === 'text')
      ? value
      : value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');

    const updated = { ...measurements, [key]: clean };
    // Clean up any other case/alias variants to prevent stale duplicates
    const normKey = normalizeKey(key);
    Object.keys(measurements).forEach((oldK) => {
      if (oldK !== key && normalizeKey(oldK) === normKey) {
        delete updated[oldK];
      }
    });

    onChangeMeasurements(updated);
  };

  // Identify any saved measurements that are NOT in current active definitions (historical/deactivated fields)
  // Ensures historical orders never lose or hide previously entered custom measurements
  const historicalFields = Object.keys(measurements)
    .filter(
      (k) =>
        k !== 'notes' &&
        k !== '_id' &&
        !k.startsWith('$') &&
        !k.startsWith('_') &&
        !isCoveredByDefinitions(k, baseDefinitions) &&
        measurements[k] !== undefined &&
        measurements[k] !== null &&
        String(measurements[k]).trim().length > 0
    )
    .map((k) => ({
      fieldKey: k,
      displayName: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      gujaratiName: '',
      fieldType: 'number',
      isRequired: false,
      isHistorical: true,
    }));

  const allFieldsToRender = [...baseDefinitions, ...historicalFields];

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
            gridTemplateColumns: availablePatterns.length > 0 ? 'repeat(auto-fill, minmax(140px, 1fr))' : '1fr',
            gap: '10px',
            padding: '14px',
            backgroundColor: isAvailable ? '#f8f7f2' : '#f1f5f9',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
          }}
        >
          {availablePatterns.length === 0 && !loadingPatterns ? (
            <div style={{ padding: '8px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              No shirt patterns configured. You can enter a custom pattern below or configure patterns in Measurement Settings.
            </div>
          ) : (
            availablePatterns.map((pat) => {
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
            })
          )}
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

      {/* Loading state for measurement fields */}
      {loadingDefs && !propDefinitions && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Loading shirt measurement definitions...
        </div>
      )}

      {/* API error state */}
      {errorDefs && !propDefinitions && !loadingDefs && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.88rem',
            marginBottom: '16px',
          }}
        >
          Failed to load shirt measurement definitions. Please refresh or check connection.
        </div>
      )}

      {/* Zero definitions empty state */}
      {!loadingDefs && !errorDefs && allFieldsToRender.length === 0 && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '0.9rem',
            textAlign: 'center',
            margin: '8px 0 16px 0',
          }}
        >
          No shirt measurements configured. Add measurements in Measurement & Pattern Settings to use them in orders.
        </div>
      )}

      {/* Dynamic Measurement Fields Grid */}
      {allFieldsToRender.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {allFieldsToRender.map((f) => {
            const hasError = Boolean(errors && errors[f.fieldKey]);
            const fieldType = f.fieldType || 'number';

            return (
              <div
                key={f.fieldKey}
                className="measure-input-card"
                style={{
                  backgroundColor: isAvailable ? '#ffffff' : '#f8fafc',
                  borderColor: hasError ? '#dc2626' : (isAvailable ? 'var(--border-light)' : '#e2e8f0'),
                  borderWidth: hasError ? '1.5px' : '1px',
                  opacity: isAvailable ? 1 : 0.7,
                  position: 'relative',
                }}
              >
                <div className="measure-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: hasError ? '#dc2626' : (isAvailable ? '#475569' : '#94a3b8'), fontWeight: 600, fontSize: '0.84rem' }}>
                    {f.displayName}{' '}
                    {f.gujaratiName && (
                      <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                        ({f.gujaratiName})
                      </span>
                    )}
                    {f.isRequired && isAvailable && <span style={{ color: '#dc2626', fontWeight: 800 }}> *</span>}
                  </span>

                  {f.isHistorical && (
                    <span
                      title="Historical field preserved from previous order or profile"
                      style={{ fontSize: '0.68rem', padding: '1px 4px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px' }}
                    >
                      Historical
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  inputMode={fieldType === 'number' ? 'decimal' : 'text'}
                  className="form-control"
                  placeholder={isAvailable ? (fieldType === 'number' ? 'e.g. 28.5' : 'Value') : '—'}
                  value={isAvailable ? getFieldValue(measurements, f.fieldKey) : ''}
                  onChange={(e) => handleFieldChange(f.fieldKey, e.target.value, fieldType)}
                  disabled={!isAvailable}
                  style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    padding: '6px 10px',
                    backgroundColor: isAvailable ? '#ffffff' : '#f1f5f9',
                    borderColor: hasError ? '#dc2626' : undefined,
                    cursor: isAvailable ? 'text' : 'not-allowed',
                  }}
                />
                {hasError && (
                  <span style={{ color: '#dc2626', fontSize: '0.73rem', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                    {errors[f.fieldKey]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

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
          onChange={(e) => handleFieldChange('notes', e.target.value, 'text')}
          disabled={!isAvailable}
          style={{ backgroundColor: isAvailable ? '#ffffff' : '#f8fafc', cursor: isAvailable ? 'text' : 'not-allowed' }}
        />
      </div>
    </div>
  );
};
