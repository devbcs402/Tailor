import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  FileText,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { ordersApi } from '../api/ordersApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { StatusBadge } from '../components/common/StatusBadge';
import { DataTablePagination } from '../components/common/DataTablePagination';
import { SearchInput } from '../components/common/SearchInput';
import { formatDate, getDeadlineStatus } from '../utils/dateUtils';
import { StatusChangeModal } from '../components/orders/StatusChangeModal';
import { OrderPrintSlip } from '../components/orders/OrderPrintSlip';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalRecords: 0, totalPages: 1 });
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Prevent race conditions and stale responses
  const activeRequestRef = useRef(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState('newest');

  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [printSlipOrder, setPrintSlipOrder] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const fetchOrders = async (page = 1, currentSize = pageSize) => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: currentSize,
        search: search.trim(),
        sortBy,
      };
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await ordersApi.getOrders(params);

      // Discard stale response if a newer request was triggered
      if (activeRequestRef.current !== requestId) return;

      setOrders(res.data || []);
      const p = res.pagination || {};
      const totalCount = p.total !== undefined ? p.total : (p.totalRecords || 0);
      const totalPages = p.totalPages !== undefined ? p.totalPages : (Math.ceil(totalCount / currentSize) || 0);
      setPagination({
        page: p.page || page,
        limit: p.limit || currentSize,
        total: totalCount,
        totalRecords: totalCount,
        totalPages,
      });

      // Self-correct if current page exceeds total pages (e.g., after deletions or filtering)
      if (page > totalPages && totalPages > 0) {
        fetchOrders(totalPages, currentSize);
      }
    } catch (err) {
      if (activeRequestRef.current === requestId) {
        setError(err.message || 'Error fetching orders list');
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  // Re-fetch on filter or sort or search or pageSize change (reset to page 1)
  useEffect(() => {
    fetchOrders(1, pageSize);
  }, [search, statusFilter, sortBy, pageSize]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const handlePageChange = (newPage) => {
    if (newPage === pagination.page || newPage < 1 || (pagination.totalPages > 0 && newPage > pagination.totalPages)) {
      return;
    }
    fetchOrders(newPage, pageSize);
  };

  // Only update pageSize state; the useEffect on pageSize will trigger the single necessary request
  const handlePageSizeChange = (newSize) => {
    if (newSize === pageSize) return;
    setPageSize(newSize);
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await ordersApi.deleteOrder(deleteTarget._id);
      success(`Order #${deleteTarget.orderNumber} deleted successfully`);
      setDeleteTarget(null);
      // If the deleted order was the last record on the current page, step back 1 page
      const isLastOnPage = orders.length === 1 && pagination.page > 1;
      const targetPage = isLastOnPage ? pagination.page - 1 : pagination.page;
      fetchOrders(targetPage, pageSize);
    } catch (err) {
      toastError(err.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle sort for column headers
  const handleSortToggle = (columnKey) => {
    if (columnKey === 'orderNumber') {
      setSortBy(sortBy === 'orderNumber_asc' ? 'orderNumber_desc' : 'orderNumber_asc');
    } else if (columnKey === 'customer') {
      setSortBy(sortBy === 'customer_asc' ? 'customer_desc' : 'customer_asc');
    } else if (columnKey === 'deadline') {
      setSortBy(sortBy === 'deadline_nearest' ? 'deadline_latest' : 'deadline_nearest');
    } else if (columnKey === 'orderDate') {
      setSortBy(sortBy === 'newest' ? 'oldest' : 'newest');
    }
  };

  const getSortIcon = (columnKey) => {
    if (columnKey === 'orderNumber') {
      if (sortBy === 'orderNumber_asc') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'orderNumber_desc') return <ArrowDown size={14} color="var(--accent-gold)" />;
    } else if (columnKey === 'customer') {
      if (sortBy === 'customer_asc') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'customer_desc') return <ArrowDown size={14} color="var(--accent-gold)" />;
    } else if (columnKey === 'deadline') {
      if (sortBy === 'deadline_nearest') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'deadline_latest') return <ArrowDown size={14} color="var(--accent-gold)" />;
    } else if (columnKey === 'orderDate') {
      if (sortBy === 'oldest') return <ArrowUp size={14} color="var(--accent-gold)" />;
      if (sortBy === 'newest') return <ArrowDown size={14} color="var(--accent-gold)" />;
    }
    return <ArrowUpDown size={14} color="var(--text-muted)" />;
  };

  // Active status filter tabs (Pending is removed from active options per requirements)
  const statusTabs = [
    { key: 'all', label: 'All Orders' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'ready', label: 'Ready' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || sortBy !== 'newest';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Search & Filter Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Real-time Debounced Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by order #, customer, phone, patterns..."
              style={{ maxWidth: '420px', width: '100%' }}
              loading={loading && search.trim() !== ''}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                title="Reset all filters"
              >
                <RotateCcw size={14} /> Clear Filters
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={16} color="var(--text-muted)" />
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.88rem' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="deadline_nearest">Nearest Deadline</option>
                <option value="deadline_latest">Latest Deadline</option>
                <option value="orderNumber_asc">Order # (A-Z)</option>
                <option value="orderNumber_desc">Order # (Z-A)</option>
                <option value="customer_asc">Customer Name (A-Z)</option>
              </select>
            </div>

            <button
              onClick={() => navigate('/orders/create')}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} /> New Order
            </button>
          </div>
        </div>

        {/* Status Filter Tabs (Pending option removed) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            overflowX: 'auto',
            paddingBottom: '4px',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '14px',
          }}
        >
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  backgroundColor: isActive ? 'var(--primary)' : '#ffffff',
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List / Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && orders.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <Loading text="Loading orders..." />
          </div>
        ) : error ? (
          <div style={{ padding: '24px' }}>
            <ErrorMessage message={error} onRetry={() => fetchOrders(pagination.page)} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No orders found</div>
            <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating your first tailoring order.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '16px' }}
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/orders/create')}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                <Plus size={16} /> Create New Order
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSortToggle('orderNumber')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Order Number"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Order #</span>
                        {getSortIcon('orderNumber')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortToggle('customer')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Customer Name"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Customer</span>
                        {getSortIcon('customer')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortToggle('orderDate')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Order Date"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Order Date</span>
                        {getSortIcon('orderDate')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortToggle('deadline')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Deadline"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Delivery Deadline</span>
                        {getSortIcon('deadline')}
                      </div>
                    </th>
                    <th>Garments & Patterns</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const deadlineInfo = getDeadlineStatus(o.deadline, o.status);
                    return (
                      <tr key={o._id}>
                        <td>
                          <span
                            onClick={() => navigate(`/orders/${o._id}`)}
                            style={{
                              fontWeight: 800,
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {o.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {o.customerSnapshot?.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Phone: {o.customerSnapshot?.mobileNumber}
                          </div>
                        </td>
                        <td>{formatDate(o.orderDate)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{formatDate(o.deadline)}</div>
                          {deadlineInfo.isUrgent ? (
                            <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                              {deadlineInfo.badge}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {deadlineInfo.badge}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {o.shirt?.quantity > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                <span style={{ padding: '2px 7px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>
                                  Shirt: {o.shirt.quantity}
                                </span>
                                {(o.shirt.patterns?.length > 0 || o.shirt.pattern || o.shirt.customPattern) && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    {o.shirt.patterns?.length > 0
                                      ? o.shirt.patterns.join(', ')
                                      : (o.shirt.pattern || o.shirt.customPattern)}
                                  </span>
                                )}
                              </div>
                            )}
                            {o.pant?.quantity > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                <span style={{ padding: '2px 7px', background: 'var(--accent-gold-light)', color: 'var(--secondary)', borderRadius: '4px', fontWeight: 600 }}>
                                  Pant: {o.pant.quantity}
                                </span>
                                {(o.pant.patterns?.length > 0 || o.pant.pattern || o.pant.customPattern) && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    {o.pant.patterns?.length > 0
                                      ? o.pant.patterns.join(', ')
                                      : (o.pant.pattern || o.pant.customPattern)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => setStatusModalOrder(o)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            title="Click to change status"
                          >
                            <StatusBadge status={o.status} />
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => navigate(`/orders/${o._id}`)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px' }}
                              title="View Order Details"
                              aria-label={`View order ${o.orderNumber}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => setPrintSlipOrder(o)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px' }}
                              title="Print Slip"
                              aria-label={`Print slip for order ${o.orderNumber}`}
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(o)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                              title="Delete Order"
                              aria-label={`Delete order ${o.orderNumber}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination Component */}
            <DataTablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Status Change Modal (Pending is removed from selectable options) */}
      {statusModalOrder && (
        <StatusChangeModal
          isOpen={Boolean(statusModalOrder)}
          onClose={() => setStatusModalOrder(null)}
          order={statusModalOrder}
          onStatusUpdated={() => fetchOrders(pagination.page, pageSize)}
        />
      )}

      {/* Print Slip Modal */}
      {printSlipOrder && (
        <OrderPrintSlip
          order={printSlipOrder}
          onClose={() => setPrintSlipOrder(null)}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteOrder}
        title="Delete Order"
        message={`Are you sure you want to delete order #${deleteTarget?.orderNumber}? This action cannot be undone.`}
        confirmText="Delete Order"
        cancelText="Cancel"
        danger={true}
        loading={deleting}
      />
    </div>
  );
};
