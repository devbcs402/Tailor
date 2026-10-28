import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { customersApi } from '../api/customersApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { DataTablePagination } from '../components/common/DataTablePagination';
import { SearchInput } from '../components/common/SearchInput';
import { CustomerModal } from '../components/customers/CustomerModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalRecords: 0, totalPages: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name_asc' | 'name_desc'

  // Track active request ID to ignore stale responses
  const activeRequestRef = useRef(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  // Delete / Archive Modal State
  const { success: toastSuccess, error: toastError } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteNeedsArchive, setDeleteNeedsArchive] = useState(false);

  const navigate = useNavigate();

  const fetchCustomers = async (page = 1, currentSize = pageSize) => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await customersApi.getCustomers({
        page,
        limit: currentSize,
        search: search.trim(),
        sortBy,
      });

      // Discard response if a newer request was triggered
      if (activeRequestRef.current !== requestId) return;

      setCustomers(res.data || []);
      const p = res.pagination || {};
      const totalCount = p.total !== undefined ? p.total : (p.totalRecords !== undefined ? p.totalRecords : (res.total || 0));
      const totalPages = p.totalPages !== undefined ? p.totalPages : (Math.ceil(totalCount / currentSize) || 0);
      setPagination({
        page: p.page || page,
        limit: p.limit || currentSize,
        total: totalCount,
        totalRecords: totalCount,
        totalPages,
      });

      // Self-correct if current page exceeds total pages
      if (page > totalPages && totalPages > 0) {
        fetchCustomers(totalPages, currentSize);
      }
    } catch (err) {
      if (activeRequestRef.current === requestId) {
        setError(err.message || 'Failed to fetch customers list');
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  // Re-fetch on search or sort change (reset to page 1)
  useEffect(() => {
    fetchCustomers(1, pageSize);
  }, [search, sortBy]);

  const handlePageChange = (newPage) => {
    if (newPage === pagination.page || newPage < 1 || (pagination.totalPages > 0 && newPage > pagination.totalPages)) {
      return;
    }
    fetchCustomers(newPage, pageSize);
  };

  // When changing rows per page, reset to page 1 if the current page becomes invalid
  const handlePageSizeChange = (newSize) => {
    if (newSize === pageSize) return;
    const totalCount = pagination.total || 0;
    const newTotalPages = Math.ceil(totalCount / newSize) || 1;
    const targetPage = pagination.page > newTotalPages ? 1 : pagination.page;
    setPageSize(newSize);
    fetchCustomers(targetPage, newSize);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSortBy('newest');
  };

  const handleSortToggle = (col) => {
    if (col === 'name') {
      setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc');
    } else if (col === 'date') {
      setSortBy(sortBy === 'newest' ? 'oldest' : 'newest');
    }
  };

  const getSortIcon = (col) => {
    if (col === 'name') {
      if (sortBy === 'name_asc') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'name_desc') return <ArrowDown size={14} color="var(--accent-gold)" />;
    } else if (col === 'date') {
      if (sortBy === 'oldest') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'newest') return <ArrowDown size={14} color="var(--accent-gold)" />;
    }
    return <ArrowUpDown size={14} color="var(--text-muted)" />;
  };

  const handleOpenAdd = () => {
    setCustomerToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setCustomerToEdit(customer);
    setModalOpen(true);
  };

  const handleOpenDelete = (customer) => {
    setDeleteTarget(customer);
    setDeleteError('');
    setDeleteNeedsArchive(Boolean(customer.totalOrders && customer.totalOrders > 0));
  };

  const handleCloseDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
    setDeleteNeedsArchive(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const hasOrders = Boolean(deleteTarget.totalOrders && deleteTarget.totalOrders > 0);
      const shouldArchive = deleteNeedsArchive || hasOrders;

      const res = await customersApi.deleteCustomer(deleteTarget._id, {
        archive: shouldArchive,
      });

      const isArchived = res?.action === 'archived' || shouldArchive;
      const successMsg = isArchived
        ? `Customer "${deleteTarget.name}" archived successfully to preserve historical orders.`
        : `Customer "${deleteTarget.name}" deleted successfully.`;

      toastSuccess(successMsg);

      // Update customer list state immediately without full page reload
      setCustomers((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        totalRecords: Math.max(0, prev.totalRecords - 1),
      }));

      handleCloseDelete();

      // If current page is now empty and not page 1, re-fetch previous page
      if (customers.length <= 1 && pagination.page > 1) {
        fetchCustomers(pagination.page - 1, pageSize);
      }
    } catch (err) {
      const isOrdersError =
        err.response?.data?.code === 'CUSTOMER_HAS_ORDERS' ||
        err.code === 'CUSTOMER_HAS_ORDERS' ||
        (err.message && err.message.toLowerCase().includes('existing order'));

      if (isOrdersError) {
        setDeleteNeedsArchive(true);
        setDeleteError(
          err.response?.data?.message ||
          `Customer "${deleteTarget.name}" has existing orders and cannot be permanently deleted. You can archive this customer instead to preserve historical records.`
        );
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to delete customer';
        setDeleteError(errorMsg);
        toastError(errorMsg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = search.trim() !== '' || sortBy !== 'newest';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Action Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div
          className="customers-action-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Real-time Debounced Search */}
          <div
            className="search-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: '1 1 240px',
              minWidth: '0',
              maxWidth: '100%',
            }}
          >
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, mobile, address..."
              style={{ maxWidth: '420px', width: '100%' }}
              loading={loading && search.trim() !== ''}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                title="Reset search and sorting"
              >
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </div>

          <div
            className="filter-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={16} color="var(--text-muted)" />
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.88rem' }}
                aria-label="Sort customers"
              >
                <option value="newest">Recently Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>

            <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Customers List / Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && customers.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <Loading text="Loading customers..." />
          </div>
        ) : error ? (
          <div style={{ padding: '24px' }}>
            <ErrorMessage message={error} onRetry={() => fetchCustomers(pagination.page)} />
          </div>
        ) : customers.length === 0 ? (
          <div>
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Users size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No customers found</div>
              <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>
                {search ? `No customer matching "${search}".` : 'Get started by adding your first customer.'}
              </p>
              {hasActiveFilters ? (
                <button onClick={handleResetFilters} className="btn btn-outline btn-sm" style={{ marginTop: '16px' }}>
                  Clear Filters
                </button>
              ) : (
                <button onClick={handleOpenAdd} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  <Plus size={16} /> Add New Customer
                </button>
              )}
            </div>
            <DataTablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        ) : (
          <div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSortToggle('name')}
                      style={{ cursor: 'pointer', userSelect: 'none', minWidth: '160px' }}
                      title="Sort by Customer Name"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Customer Name</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th style={{ minWidth: '140px' }}>Mobile Number</th>
                    <th style={{ minWidth: '160px' }}>Address</th>
                    <th style={{ minWidth: '110px' }}>Total Orders</th>
                    <th
                      onClick={() => handleSortToggle('date')}
                      style={{ cursor: 'pointer', userSelect: 'none', minWidth: '120px' }}
                      title="Sort by Date"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Last Order</span>
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th style={{ minWidth: '120px' }}>Next Deadline</th>
                    <th style={{ textAlign: 'right', minWidth: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <div
                          onClick={() => navigate(`/customers/${c._id}`)}
                          style={{
                            fontWeight: 700,
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.98rem',
                          }}
                        >
                          {c.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155', fontWeight: 500 }}>
                          Phone: {c.mobileNumber}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.address || '-'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 10px',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                          }}
                        >
                          {c.totalOrders || 0}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.88rem', color: '#475569' }}>
                        {c.latestOrderDate ? formatDate(c.latestOrderDate) : '-'}
                      </td>
                      <td>
                        {c.nextDeadline ? (
                          <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.86rem' }}>
                            {formatDate(c.nextDeadline)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => navigate(`/customers/${c._id}`)}
                            className="btn btn-outline btn-sm"
                            style={{ minWidth: '36px', minHeight: '36px', padding: '6px' }}
                            title="View Customer Profile"
                            aria-label={`View profile of ${c.name}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="btn btn-outline btn-sm"
                            style={{ minWidth: '36px', minHeight: '36px', padding: '6px' }}
                            title="Edit Customer"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(c)}
                            className="btn btn-outline btn-sm"
                            style={{
                              minWidth: '36px',
                              minHeight: '36px',
                              padding: '6px',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                            }}
                            title="Delete Customer"
                            aria-label={`Delete customer ${c.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination */}
            <DataTablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Customer Create/Edit Modal */}
      {modalOpen && (
        <CustomerModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setCustomerToEdit(null);
          }}
          customerToEdit={customerToEdit}
          customer={customerToEdit}
          onSaved={() => fetchCustomers(pagination.page, pageSize)}
          onSuccess={() => fetchCustomers(pagination.page, pageSize)}
        />
      )}

      {/* Delete / Archive Customer Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title={deleteNeedsArchive ? 'Archive Customer' : 'Delete Customer'}
        message={`Are you sure you want to delete customer '${deleteTarget?.name}'? This action may affect orders associated with this customer.`}
        confirmText={deleteNeedsArchive ? 'Archive Customer' : 'Delete Customer'}
        cancelText="Cancel"
        danger={!deleteNeedsArchive}
        confirmVariant={deleteNeedsArchive ? 'warning' : 'danger'}
        loading={deleting}
        error={deleteError}
      >
        {deleteTarget && (
          <div
            style={{
              backgroundColor: '#f8f7f2',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '0.88rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Customer Name:</span>
              <strong style={{ fontWeight: 700 }}>{deleteTarget.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Mobile Number:</span>
              <strong style={{ fontWeight: 600 }}>{deleteTarget.mobileNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Total Orders:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: (deleteTarget.totalOrders || 0) > 0 ? '#b45309' : '#15803d',
                }}
              >
                {deleteTarget.totalOrders || 0} order(s)
              </span>
            </div>

            {deleteNeedsArchive && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}
              >
                This customer has historical order(s). To preserve order records, invoices, and measurement snapshots, this customer will be safely archived rather than permanently deleted.
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      <style>{`
        @media (max-width: 640px) {
          .customers-action-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .search-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          .filter-controls {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .filter-controls .form-select {
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};
