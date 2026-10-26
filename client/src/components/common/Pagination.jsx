import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ page, totalPages, onPageChange, totalItems, label = 'results' }) => {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 4px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        Total <strong>{totalItems}</strong> {label} (Page {page} of {totalPages})
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span
          style={{
            padding: '4px 12px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--primary)',
            background: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {page}
        </span>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
