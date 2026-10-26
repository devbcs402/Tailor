import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTablePagination = ({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 15,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalRecords === 0 && totalPages <= 1) {
    return null;
  }

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate page numbers with ellipsis for cleaner mobile display
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 20px',
        borderTop: '1px solid var(--border-light)',
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)',
      }}
      className="pagination-container"
    >
      {/* Left: Summary and Page Size */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          Showing <strong style={{ color: 'var(--text-main)' }}>{startRecord}</strong> to{' '}
          <strong style={{ color: 'var(--text-main)' }}>{endRecord}</strong> of{' '}
          <strong style={{ color: 'var(--text-main)' }}>{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                width: 'auto',
                padding: '4px 8px',
                fontSize: '0.84rem',
                height: '32px',
                borderColor: 'var(--border-light)',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-outline btn-sm"
          style={{
            padding: '6px 10px',
            opacity: currentPage <= 1 ? 0.4 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
          <span className="pagination-btn-label">Prev</span>
        </button>

        {/* Page number buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '6px 8px',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn btn-outline btn-sm"
          style={{
            padding: '6px 10px',
            opacity: currentPage >= totalPages ? 0.4 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Next Page"
        >
          <span className="pagination-btn-label">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .pagination-container {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          .pagination-btn-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
