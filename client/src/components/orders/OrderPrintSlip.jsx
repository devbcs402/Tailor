import React, { useState } from 'react';
import { Download, FileText, ExternalLink, X, Printer } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { SHIRT_FIELDS, PANT_FIELDS, getFieldValue } from '../../utils/measurementLabels';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTenantMeasurements } from '../../hooks/useTenantMeasurements';
import { downloadOrderSlipPdf, getOrderSlipPdfBlobUrl } from '../../services/orderSlipPdfService';

export const OrderPrintSlip = ({ order, onClose }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [generating, setGenerating] = useState(false);
  const { shirtDefinitions, pantDefinitions } = useTenantMeasurements();

  if (!order) return null;

  const handleDownloadPdf = () => {
    try {
      setGenerating(true);
      downloadOrderSlipPdf(order, user);
      success(`PDF Order Slip for #${order.orderNumber} downloaded successfully!`);
    } catch (err) {
      toastError(err.message || 'Failed to generate PDF slip');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenPdf = () => {
    try {
      const url = getOrderSlipPdfBlobUrl(order, user);
      window.open(url, '_blank');
    } catch (err) {
      toastError(err.message || 'Failed to open PDF slip');
    }
  };

  const shirtPatternDisplay = [
    ...(Array.isArray(order.shirt?.patterns) ? order.shirt.patterns : (order.shirt?.pattern ? [order.shirt.pattern] : [])),
    order.shirt?.customPattern
  ].filter(Boolean).join(', ') || 'Standard / None';

  const pantPatternDisplay = [
    ...(Array.isArray(order.pant?.patterns) ? order.pant.patterns : (order.pant?.pattern ? [order.pant.pattern] : [])),
    order.pant?.customPattern
  ].filter(Boolean).join(', ') || 'Standard / None';

  // Helper to dynamically build garment fields from snapshot, tenant defs, or measurements
  const resolveGarmentFields = (category, garment, snapshotList, tenantDefs = []) => {
    const measurements = garment?.measurements || {};

    if (Array.isArray(snapshotList) && snapshotList.length > 0) {
      return snapshotList.map(s => ({
        key: s.fieldKey,
        label: s.gujaratiName ? `${s.displayName} (${s.gujaratiName})` : s.displayName,
        value: getFieldValue(measurements, s.fieldKey) || s.value,
      }));
    }

    const baseDefs = Array.isArray(tenantDefs) && tenantDefs.length > 0
      ? tenantDefs
      : (category === 'shirt' ? SHIRT_FIELDS : PANT_FIELDS);

    const fields = baseDefs.map(d => ({
      key: d.fieldKey || d.key,
      label: d.gujaratiName ? `${d.displayName || d.label} (${d.gujaratiName})` : (d.displayName || d.label),
      value: getFieldValue(measurements, d.fieldKey || d.key),
    }));

    const existingKeys = new Set(fields.map(f => f.key));
    Object.keys(measurements).forEach(k => {
      if (k !== 'notes' && !existingKeys.has(k) && measurements[k] !== undefined && measurements[k] !== '') {
        fields.push({
          key: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: measurements[k],
        });
      }
    });

    return fields;
  };

  const shirtFieldsToDisplay = resolveGarmentFields('shirt', order.shirt, order.measurementSnapshot?.shirt, shirtDefinitions);
  const pantFieldsToDisplay = resolveGarmentFields('pant', order.pant, order.measurementSnapshot?.pant, pantDefinitions);

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
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-light)',
        }}
      >
        {/* Modal Controls Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0b1f3a',
            color: '#ffffff',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--accent-gold)" />
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>
              Order Slip #{order.orderNumber}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleOpenPdf}
              className="btn btn-outline btn-sm"
              style={{
                borderColor: 'var(--accent-gold)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Open full print-ready PDF in new tab"
            >
              <ExternalLink size={15} /> Open PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generating}
              className="btn btn-gold btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download professional PDF order slip"
            >
              <Download size={15} /> Download PDF Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div
          id="printable-slip"
          style={{
            padding: '30px',
            overflowY: 'auto',
            color: '#0f172a',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-primary)',
          }}
        >
          {/* Shop Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f3a', marginBottom: '4px' }}>
              SILAI MASTER TAILOR STUDIO
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Men's Wear • Bespoke Shirts & Trousers • Tailoring Slip
            </div>
          </div>

          {/* Order & Customer Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Order Number:</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b1f3a' }}>
                {order.orderNumber}
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Order Date: <strong>{formatDate(order.orderDate)}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Customer:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#172033' }}>
                {order.customerSnapshot?.name}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                Phone: {order.customerSnapshot?.mobileNumber}
              </div>
              {order.customerSnapshot?.address && (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Address: {order.customerSnapshot?.address}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Deadline Alert Box */}
          <div style={{ padding: '10px 16px', backgroundColor: '#fdf9ee', border: '1px solid #d4af37', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#0b1f3a' }}>Delivery Deadline: </span>
              <strong style={{ fontSize: '1.05rem', color: '#0b1f3a' }}>{formatDate(order.deadline)}</strong>
              {order.deliveryTime && <span style={{ marginLeft: '8px', color: '#b89728', fontWeight: 600 }}>({order.deliveryTime})</span>}
            </div>
          </div>

          {/* Shirt Section */}
          {order.shirt?.quantity > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <strong>Shirt ({order.shirt.quantity} pcs)</strong>
                <span style={{ fontSize: '0.85rem', color: '#0b1f3a', fontWeight: 600 }}>
                  Pattern: {shirtPatternDisplay}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {shirtFieldsToDisplay.map((f) => (
                  <div key={f.key} style={{ border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.label}</div>
                    <div style={{ fontWeight: 700 }}>
                      {f.value !== undefined && f.value !== '' ? f.value : '-'}
                    </div>
                  </div>
                ))}
              </div>
              {order.shirt?.measurements?.notes && (
                <div style={{ fontSize: '0.82rem', marginTop: '6px', color: '#475569' }}>
                  <strong>Notes:</strong> {order.shirt.measurements.notes}
                </div>
              )}
            </div>
          )}

          {/* Pant Section */}
          {order.pant?.quantity > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <strong>Pant ({order.pant.quantity} pcs)</strong>
                <span style={{ fontSize: '0.85rem', color: '#142d4e', fontWeight: 600 }}>
                  Pattern: {pantPatternDisplay}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {pantFieldsToDisplay.map((f) => (
                  <div key={f.key} style={{ border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.label}</div>
                    <div style={{ fontWeight: 700 }}>
                      {f.value !== undefined && f.value !== '' ? f.value : '-'}
                    </div>
                  </div>
                ))}
              </div>
              {order.pant?.measurements?.notes && (
                <div style={{ fontSize: '0.82rem', marginTop: '6px', color: '#475569' }}>
                  <strong>Notes:</strong> {order.pant.measurements.notes}
                </div>
              )}
            </div>
          )}

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div style={{ marginBottom: '20px', padding: '10px 14px', backgroundColor: '#fdf9ee', border: '1px solid #f3e8c2', borderRadius: '8px', fontSize: '0.88rem' }}>
              <strong>Special Instructions:</strong> {order.specialInstructions}
            </div>
          )}

          {/* Clean Slip Footer */}
          <div style={{ borderTop: '2px solid #0b1f3a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Silai Master • Thank you for your business!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
