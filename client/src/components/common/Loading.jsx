import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading = ({ text = 'Loading...', fullScreen = false }) => {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: fullScreen ? '0' : '40px 20px',
        color: 'var(--text-muted)',
        gap: '12px',
        width: '100%',
      }}
    >
      <Loader2
        size={36}
        color="var(--primary)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{text}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
