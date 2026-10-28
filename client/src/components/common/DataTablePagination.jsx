import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTablePagination = ({
  currentPage = 1,
  page,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
}) => {
  const activePage = page !== undefined ? page : (currentPage || 1);
  const safeTotalPages = totalPages !== undefined ? totalPages : (Math.ceil(totalRecords / pageSize) || 0);

  const startRecord = totalRecords === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endRecord = totalRecords === 0 ? 0 : Math.min(activePage * pageSize, totalRecords);
  const displayStart = Math.min(startRecord, endRecord);

  const options = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  // Generate page numbers with ellipsis for cleaner display
  const getPageNumbers = () => {
    if (totalRecords === 0 || safeTotalPages <= 0) return [];
    const pages = [];
    if (safeTotalPages <= 5) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (activePage <= 3) {
        pages.push(1, 2, 3, 4, '...', safeTotalPages);
      } else if (activePage >= safeTotalPages - 2) {
        pages.push(1, '...', safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
      } else {
        pages.push(1, '...', activePage - 1, activePage, activePage + 1, '...', safeTotalPages);
      }
    }
    return pages;
  };

  const handleSizeChange = (e) => {
    const newSize = Number(e.target.value);
    if (!onPageSizeChange) return;
    const newTotalPages = Math.ceil(totalRecords / newSize) || 1;
    if (activePage > newTotalPages && onPageChange) {
      onPageChange(1);
    }
    onPageSizeChange(newSize);
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
          Showing <strong style={{ color: 'var(--text-main)' }}>{displayStart}</strong> to{' '}
          <strong style={{ color: 'var(--text-main)' }}>{endRecord}</strong> of{' '}
          <strong style={{ color: 'var(--text-main)' }}>{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={handleSizeChange}
              style={{
                width: 'auto',
                padding: '4px 8px',
                fontSize: '0.84rem',
                height: '32px',
                borderColor: 'var(--border-light)',
              }}
            >
              {options.map((opt) => (
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
          onClick={() => onPageChange && onPageChange(activePage - 1)}
          disabled={activePage <= 1 || totalRecords === 0}
          className="btn btn-outline btn-sm"
          style={{
            padding: '6px 10px',
            opacity: activePage <= 1 || totalRecords === 0 ? 0.4 : 1,
            cursor: activePage <= 1 || totalRecords === 0 ? 'not-allowed' : 'pointer',
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
            const isActive = p === activePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange && onPageChange(p)}
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
          onClick={() => onPageChange && onPageChange(activePage + 1)}
          disabled={activePage >= safeTotalPages || safeTotalPages <= 1 || totalRecords === 0}
          className="btn btn-outline btn-sm"
          style={{
            padding: '6px 10px',
            opacity: activePage >= safeTotalPages || safeTotalPages <= 1 || totalRecords === 0 ? 0.4 : 1,
            cursor: activePage >= safeTotalPages || safeTotalPages <= 1 || totalRecords === 0 ? 'not-allowed' : 'pointer',
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
