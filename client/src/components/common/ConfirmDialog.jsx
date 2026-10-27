import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  danger = true,
  confirmVariant,
  loading = false,
  error = '',
  children,
}) => {
  const handleClose = () => {
    if (loading) return;
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onCancel]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger' || (danger && confirmVariant !== 'warning');

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 31, 58, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-xl)',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border-light)',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: danger ? '#fee2e2' : '#fdf9ee',
              color: danger ? '#dc2626' : '#d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {title}
            </h3>
            {message && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                {message}
              </p>
            )}
            {children && (
              <div style={{ marginTop: '10px' }}>{children}</div>
            )}
            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8f7f2',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn btn-outline btn-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${isDanger ? 'btn-danger' : (confirmVariant === 'warning' ? 'btn-gold' : 'btn-primary')} btn-sm`}
            style={{ minWidth: '90px' }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
