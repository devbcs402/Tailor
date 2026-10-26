import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  loading = false,
  style = {},
  className = '',
  id,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const isFirstRender = useRef(true);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search trigger
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (onChange) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  const handleClear = () => {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: '360px',
        ...style,
      }}
      className={`search-input-wrapper ${className}`}
    >
      <Search
        size={18}
        color="var(--text-muted)"
        style={{
          position: 'absolute',
          left: '12px',
          pointerEvents: 'none',
        }}
      />

      <input
        id={id}
        type="text"
        className="form-control"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft: '38px',
          paddingRight: localValue || loading ? '38px' : '14px',
          height: '40px',
          fontSize: '0.9rem',
          backgroundColor: '#ffffff',
          borderColor: 'var(--border-light)',
          width: '100%',
        }}
      />

      {loading ? (
        <Loader2
          size={16}
          color="var(--accent-gold)"
          className="spin"
          style={{
            position: 'absolute',
            right: '12px',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : localValue ? (
        <button
          type="button"
          onClick={handleClear}
          title="Clear search"
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            padding: '4px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={16} />
        </button>
      ) : null}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
