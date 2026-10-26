import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit,
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
import { formatDate } from '../utils/dateUtils';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name_asc' | 'name_desc'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  const navigate = useNavigate();

  const fetchCustomers = async (page = 1, currentSize = pageSize) => {
    setLoading(true);
    setError('');
    try {
      const res = await customersApi.getCustomers({
        page,
        limit: currentSize,
        search: search.trim(),
        sortBy,
      });
      setCustomers(res.data || []);
      setPagination(res.pagination || { page: 1, limit: currentSize, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch customers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1, pageSize);
  }, [search, sortBy, pageSize]);

  const handlePageChange = (newPage) => {
    fetchCustomers(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    fetchCustomers(1, newSize);
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

  const hasActiveFilters = search.trim() !== '' || sortBy !== 'newest';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Action Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Real-time Debounced Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                title="Reset search and sorting"
              >
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={16} color="var(--text-muted)" />
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.88rem' }}
              >
                <option value="newest">Recently Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>

            <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
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
        ) : (
          <div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSortToggle('name')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Customer Name"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Customer Name</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th>Mobile Number</th>
                    <th>Address</th>
                    <th>Total Orders</th>
                    <th
                      onClick={() => handleSortToggle('date')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Date"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Last Order</span>
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th>Next Deadline</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
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
                            style={{ padding: '4px 8px' }}
                            title="View Customer Profile"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Edit Customer"
                          >
                            <Edit size={15} />
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
              pageSizeOptions={[10, 25, 50]}
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
          onClose={() => setModalOpen(false)}
          customer={customerToEdit}
          onSuccess={() => fetchCustomers(pagination.page, pageSize)}
        />
      )}
    </div>
  );
};
