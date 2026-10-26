import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { SHIRT_FIELDS, PANT_FIELDS } from '../../utils/measurementLabels';
import { getShirtPatternLabel, getPantPatternLabel } from '../../utils/patternOptions';

export const OrderPrintSlip = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const shirtPatternDisplay = [
    ...(Array.isArray(order.shirt?.patterns) ? order.shirt.patterns : (order.shirt?.pattern ? [order.shirt.pattern] : [])),
    order.shirt?.customPattern
  ].filter(Boolean).join(', ') || 'None';

  const pantPatternDisplay = [
    ...(Array.isArray(order.pant?.patterns) ? order.pant.patterns : (order.pant?.pattern ? [order.pant.pattern] : [])),
    order.pant?.customPattern
  ].filter(Boolean).join(', ') || 'None';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Controls (Not printed) */}
        <div
          className="no-print"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
            Tailoring Slip / Order Summary
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer size={16} /> Print Slip
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
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
                {SHIRT_FIELDS.map((f) => (
                  <div key={f.key} style={{ border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.label}</div>
                    <div style={{ fontWeight: 700 }}>{order.shirt?.measurements?.[f.key] || '-'}</div>
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
                {PANT_FIELDS.map((f) => (
                  <div key={f.key} style={{ border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.label}</div>
                    <div style={{ fontWeight: 700 }}>{order.pant?.measurements?.[f.key] || '-'}</div>
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
