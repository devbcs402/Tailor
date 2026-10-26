import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-md)',
        color: '#991b1b',
        margin: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>
          {message || 'Something went wrong. Please try again.'}
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-outline btn-sm"
          style={{ borderColor: '#fca5a5', color: '#991b1b', background: '#ffffff' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
};
