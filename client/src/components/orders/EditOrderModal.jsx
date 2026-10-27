import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { ShirtMeasurements } from './ShirtMeasurements';
import { PantMeasurements } from './PantMeasurements';
import { ordersApi } from '../../api/ordersApi';
import { useToast } from '../../context/ToastContext';
import { REQUIRED_SHIRT_FIELDS, REQUIRED_PANT_FIELDS } from '../../utils/measurementLabels';

export const EditOrderModal = ({ isOpen, onClose, order, onOrderUpdated }) => {
  const { success, error: toastError } = useToast();

  const [deadline, setDeadline] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [shirtQuantity, setShirtQuantity] = useState(0);
  const [shirtPatterns, setShirtPatterns] = useState([]);
  const [shirtCustomPattern, setShirtCustomPattern] = useState('');
  const [shirtMeasurements, setShirtMeasurements] = useState({});
  const [shirtErrors, setShirtErrors] = useState({});

  const [pantQuantity, setPantQuantity] = useState(0);
  const [pantPatterns, setPantPatterns] = useState([]);
  const [pantCustomPattern, setPantCustomPattern] = useState('');
  const [pantMeasurements, setPantMeasurements] = useState({});
  const [pantErrors, setPantErrors] = useState({});

  const [saveAsDefaultMeasurements, setSaveAsDefaultMeasurements] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (order) {
      setDeadline(order.deadline ? order.deadline.split('T')[0] : '');
      setDeliveryTime(order.deliveryTime || '');
      setSpecialInstructions(order.specialInstructions || '');

      setShirtQuantity(order.shirt?.quantity ?? 1);
      const sPatterns = Array.isArray(order.shirt?.patterns) && order.shirt.patterns.length > 0
        ? order.shirt.patterns
        : (order.shirt?.pattern ? order.shirt.pattern.split(',').map((s) => s.trim()).filter(Boolean) : []);
      setShirtPatterns(sPatterns);
      setShirtCustomPattern(order.shirt?.customPattern || '');
      setShirtMeasurements(order.shirt?.measurements ? { ...order.shirt.measurements } : {});

      setPantQuantity(order.pant?.quantity ?? 1);
      const pPatterns = Array.isArray(order.pant?.patterns) && order.pant.patterns.length > 0
        ? order.pant.patterns
        : (order.pant?.pattern ? order.pant.pattern.split(',').map((s) => s.trim()).filter(Boolean) : []);
      setPantPatterns(pPatterns);
      setPantCustomPattern(order.pant?.customPattern || '');
      setPantMeasurements(order.pant?.measurements ? { ...order.pant.measurements } : {});

      setSaveAsDefaultMeasurements(false);
      setValidationError('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!deadline) {
      setValidationError('Delivery deadline is required.');
      return;
    }

    const sQty = parseInt(shirtQuantity, 10) || 0;
    const pQty = parseInt(pantQuantity, 10) || 0;

    if (sQty < 0 || pQty < 0) {
      setValidationError('Garment quantities cannot be negative.');
      return;
    }

    if (sQty === 0 && pQty === 0) {
      setValidationError('Please specify at least 1 shirt or 1 pant quantity.');
      return;
    }

    // Quantity-based measurement validations
    const newShirtErrors = {};
    const newPantErrors = {};

    if (sQty > 0) {
      for (const field of REQUIRED_SHIRT_FIELDS) {
        const val = shirtMeasurements[field];
        if (val === undefined || val === null || String(val).trim() === '') {
          newShirtErrors[field] = 'Required';
        }
      }
      for (const [key, val] of Object.entries(shirtMeasurements)) {
        if (key !== 'notes' && val !== undefined && val !== null && String(val).trim() !== '') {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) {
            newShirtErrors[key] = 'Must be > 0';
          }
        }
      }
    }

    if (pQty > 0) {
      for (const field of REQUIRED_PANT_FIELDS) {
        const val = pantMeasurements[field];
        if (val === undefined || val === null || String(val).trim() === '') {
          newPantErrors[field] = 'Required';
        }
      }
      for (const [key, val] of Object.entries(pantMeasurements)) {
        if (key !== 'notes' && val !== undefined && val !== null && String(val).trim() !== '') {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) {
            newPantErrors[key] = 'Must be > 0';
          }
        }
      }
    }

    setShirtErrors(newShirtErrors);
    setPantErrors(newPantErrors);

    if (Object.keys(newShirtErrors).length > 0 || Object.keys(newPantErrors).length > 0) {
      const messages = [];
      if (Object.keys(newShirtErrors).length > 0) {
        messages.push(`Required shirt measurements missing (${Object.keys(newShirtErrors).join(', ')})`);
      }
      if (Object.keys(newPantErrors).length > 0) {
        messages.push(`Required pant measurements missing (${Object.keys(newPantErrors).join(', ')})`);
      }
      setValidationError(messages.join('. '));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        deadline,
        deliveryTime,
        specialInstructions,
        saveAsDefaultMeasurements: Boolean(saveAsDefaultMeasurements),
        shirt: {
          quantity: sQty,
          patterns: sQty > 0 ? shirtPatterns : [],
          pattern: sQty > 0 ? shirtPatterns.join(', ') : '',
          customPattern: sQty > 0 ? shirtCustomPattern : '',
          measurements: sQty > 0 ? shirtMeasurements : {},
        },
        pant: {
          quantity: pQty,
          patterns: pQty > 0 ? pantPatterns : [],
          pattern: pQty > 0 ? pantPatterns.join(', ') : '',
          customPattern: pQty > 0 ? pantCustomPattern : '',
          measurements: pQty > 0 ? pantMeasurements : {},
        },
      };

      const res = await ordersApi.updateOrder(order._id, payload);
      success(`Order #${order.orderNumber} updated successfully!`);
      if (onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to update order');
      toastError(err.message || 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 31, 58, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(11, 31, 58, 0.35)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0b1f3a',
            color: '#ffffff',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', color: '#d4af37', fontWeight: 600 }}>
              Edit Order Details
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Order #{order.orderNumber} — {order.customerSnapshot?.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d4af37',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {validationError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Shirt Measurements Section with dynamic pattern checkboxes */}
          <ShirtMeasurements
            measurements={shirtMeasurements}
            onChangeMeasurements={setShirtMeasurements}
            selectedPatterns={shirtPatterns}
            onChangeSelectedPatterns={setShirtPatterns}
            customPattern={shirtCustomPattern}
            onChangeCustomPattern={setShirtCustomPattern}
            quantity={shirtQuantity}
            onChangeQuantity={(val) => {
              setShirtQuantity(val);
              const p = parseInt(val, 10);
              if (isNaN(p) || p <= 0) setShirtErrors({});
            }}
            errors={shirtErrors}
            onClearError={(key) => setShirtErrors((prev) => { const n = { ...prev }; delete n[key]; return n; })}
          />

          {/* Pant Measurements Section with dynamic pattern checkboxes */}
          <PantMeasurements
            measurements={pantMeasurements}
            onChangeMeasurements={setPantMeasurements}
            selectedPatterns={pantPatterns}
            onChangeSelectedPatterns={setPantPatterns}
            customPattern={pantCustomPattern}
            onChangeCustomPattern={setPantCustomPattern}
            quantity={pantQuantity}
            onChangeQuantity={(val) => {
              setPantQuantity(val);
              const p = parseInt(val, 10);
              if (isNaN(p) || p <= 0) setPantErrors({});
            }}
            errors={pantErrors}
            onClearError={(key) => setPantErrors((prev) => { const n = { ...prev }; delete n[key]; return n; })}
          />

          {/* Schedule & Notes */}
          <div className="card" style={{ borderTop: '4px solid #d4af37' }}>
            <div className="card-header">
              <div className="card-title">
                <Calendar size={18} color="#d4af37" />
                <span>Delivery Schedule & Special Notes</span>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Delivery Deadline <span className="required">*</span>:
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  style={{ fontWeight: 700, borderColor: '#d4af37' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Time:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Evening 6:00 PM"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Special Instructions & Master Notes:</label>
              <textarea
                className="form-textarea"
                placeholder="Special tailoring notes, event deadline, monogram, stitching preferences..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Checkbox: Save as Customer's Default Measurements */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1.5px solid #e2e8f0',
              marginTop: '4px',
            }}
          >
            <input
              type="checkbox"
              id="modalSaveDefaultMeasurements"
              checked={saveAsDefaultMeasurements}
              onChange={(e) => setSaveAsDefaultMeasurements(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div>
              <label htmlFor="modalSaveDefaultMeasurements" style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                Save as Customer's Default Measurements
              </label>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                If checked, this customer's saved profile measurements will also be updated. If unchecked, only this order's snapshot is updated.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '160px' }}
            >
              <Save size={18} />
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
