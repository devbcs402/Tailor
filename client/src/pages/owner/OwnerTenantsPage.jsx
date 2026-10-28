import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Eye,
  Ban,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  FileText,
  Trash2,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { CreateTenantModal } from '../../components/owner/CreateTenantModal';
import { EditTenantModal } from '../../components/owner/EditTenantModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTablePagination } from '../../components/common/DataTablePagination';

export const OwnerTenantsPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  // Confirm dialog state for Activate / Deactivate / Archive / Restore / Delete
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'deactivate',
    tenant: null,
    loading: false,
    reason: '',
    error: '',
  });

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: pageSize,
        search,
        status: statusFilter,
        sortBy,
      };

      const res = await ownerApi.getTenants(params);
      if (res?.success && res?.data) {
        setTenants(res.data || []);
        if (res.summary) {
          setSummaryStats(res.summary);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.totalRecords || res.pagination.total || 0);
        }
      } else if (Array.isArray(res?.data)) {
        setTenants(res.data);
      } else {
        setError(res?.message || 'Failed to fetch tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Error communicating with platform server');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, sortBy]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Reset page when search or filters change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const openDeactivateConfirm = (tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deactivate',
      tenant,
      loading: false,
      reason: '',
      error: '',
    });
  };

  const openActivateConfirm = (tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'activate',
      tenant,
      loading: false,
      reason: '',
      error: '',
    });
  };

  const openArchiveConfirm = (tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'archive',
      tenant,
      loading: false,
      reason: '',
      error: '',
    });
  };

  const openRestoreConfirm = (tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      tenant,
      loading: false,
      reason: '',
      error: '',
    });
  };

  const openDeleteConfirm = (tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      tenant,
      loading: false,
      reason: '',
      error: '',
    });
  };

  const handleConfirmAction = async () => {
    const { tenant, type, reason } = confirmDialog;
    if (!tenant) return;

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true, error: '' }));
      let res;
      if (type === 'deactivate') {
        res = await ownerApi.deactivateTenant(tenant._id, reason || 'Suspended by platform administrator');
      } else if (type === 'activate') {
        res = await ownerApi.activateTenant(tenant._id);
      } else if (type === 'archive') {
        res = await ownerApi.archiveTenant(tenant._id, reason || 'Archived by platform administrator');
      } else if (type === 'restore') {
        res = await ownerApi.restoreTenant(tenant._id);
      } else if (type === 'delete') {
        res = await ownerApi.deleteTenant(tenant._id);
      }

      if (res?.success) {
        let msg = `Tenant "${tenant.businessName}" updated.`;
        if (type === 'deactivate') msg = `Tenant "${tenant.businessName}" has been suspended.`;
        if (type === 'activate') msg = `Tenant "${tenant.businessName}" has been reactivated.`;
        if (type === 'archive') msg = `Tenant "${tenant.businessName}" has been safely archived. All historical customer & order data preserved.`;
        if (type === 'restore') msg = `Tenant "${tenant.businessName}" has been restored to active status.`;
        if (type === 'delete') msg = res?.message || `Tenant "${tenant.businessName}" and all associated data were permanently deleted.`;

        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 6000);
        setConfirmDialog({ isOpen: false, type: 'delete', tenant: null, loading: false, reason: '', error: '' });

        // Handle pagination when the last tenant on a page is deleted
        if (type === 'delete' && tenants.length === 1 && page > 1) {
          setPage((prevPage) => prevPage - 1);
        } else {
          fetchTenants();
        }
      } else {
        const errMsg = res?.message || 'Operation failed';
        setConfirmDialog((prev) => ({ ...prev, loading: false, error: errMsg }));
        setError(errMsg);
      }
    } catch (err) {
      console.error('Action failed:', err);
      const errMsg = err.message || 'Failed to execute status change';
      setConfirmDialog((prev) => ({ ...prev, loading: false, error: errMsg }));
      setError(errMsg);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', margin: 0 }}>
            Tenant Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px', margin: 0 }}>
            Provision, inspect, edit, and regulate independent tailoring business tenants.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={fetchTenants}
            disabled={loading}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              fontSize: '0.88rem',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            to="/owner/tenants/create"
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0b1f3a',
              color: '#d4af37',
              borderColor: '#d4af37',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(11, 31, 58, 0.25)',
              textDecoration: 'none',
            }}
          >
            <Plus size={18} />
            Onboard Tenant
          </Link>
        </div>
      </div>

      {/* Real-time Platform Tenant Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Tenants */}
        <div
          onClick={() => { setStatusFilter('all'); setPage(1); }}
          title="Filter All Tenants"
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: statusFilter === 'all' ? '2px solid #0b1f3a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Tenants
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0b1f3a', marginTop: '2px' }}>
              {summaryStats.total}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#0b1f3a' }}>
            <Building2 size={22} />
          </div>
        </div>

        {/* Active Tenants */}
        <div
          onClick={() => { setStatusFilter('active'); setPage(1); }}
          title="Filter Active Tenants"
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: statusFilter === 'active' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>
              Active
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
              {summaryStats.active}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Suspended Tenants */}
        <div
          onClick={() => { setStatusFilter('inactive'); setPage(1); }}
          title="Filter Suspended Tenants"
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: statusFilter === 'inactive' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>
              Suspended
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {summaryStats.inactive}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <Ban size={22} />
          </div>
        </div>

        {/* Archived Tenants */}
        <div
          onClick={() => { setStatusFilter('archived'); setPage(1); }}
          title="Filter Archived Tenants"
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: statusFilter === 'archived' ? '2px solid #d97706' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
              Archived
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {summaryStats.archived}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Archive size={22} />
          </div>
        </div>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flex: '1', minWidth: '260px', position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by business name, code, owner, email, phone..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#64748b" />
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Suspended</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={handleSortChange}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenants Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Business & Code</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Owner Name</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact Info</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>Staff</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>Customers</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>Orders</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Created</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Loading tenants...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '1rem' }}>No tenants found</div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>
                      Try adjusting your search criteria or register a new tailoring business.
                    </p>
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#0b1f3a', color: '#d4af37', borderColor: '#d4af37' }}
                    >
                      <Plus size={15} style={{ marginRight: '4px' }} />
                      Onboard Tenant
                    </button>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr
                    key={t._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Business & Code */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0b1f3a', fontSize: '0.95rem' }}>
                        {t.businessName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            color: '#0b1f3a',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          {t.tenantCode}
                        </span>
                        {t.city && (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                            • {t.city}{t.state ? `, ${t.state}` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Owner */}
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                      {t.ownerName}
                    </td>

                    {/* Contact Info */}
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                      <div style={{ color: '#334155' }}>{t.email}</div>
                      <div>{t.mobileNumber}</div>
                    </td>

                    {/* Counts */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        <Users size={12} color="#64748b" />
                        {t.usersCount ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        <UserCheck size={12} color="#64748b" />
                        {t.customersCount ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        <FileText size={12} color="#64748b" />
                        {t.ordersCount ?? 0}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor:
                            t.status === 'active'
                              ? '#dcfce7'
                              : t.status === 'archived'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            t.status === 'active'
                              ? '#16a34a'
                              : t.status === 'archived'
                              ? '#d97706'
                              : '#dc2626',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor:
                              t.status === 'active'
                                ? '#16a34a'
                                : t.status === 'archived'
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        />
                        {t.status === 'active'
                          ? 'Active'
                          : t.status === 'archived'
                          ? 'Archived'
                          : 'Inactive'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                      {formatDate(t.createdAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* View Details */}
                        <Link
                          to={`/owner/tenants/${t._id}`}
                          title="View Tenant Profile"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#0b1f3a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          <Eye size={15} />
                        </Link>

                        {/* Edit */}
                        <Link
                          to={`/owner/tenants/${t._id}/edit`}
                          title="Edit Tenant Information"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#0b1f3a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          <Edit size={15} />
                        </Link>

                        {/* Lifecycle Status Action */}
                        {t.status === 'active' && (
                          <button
                            onClick={() => openDeactivateConfirm(t)}
                            title="Suspend Tenant Operations"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Ban size={15} />
                          </button>
                        )}

                        {t.status === 'inactive' && (
                          <button
                            onClick={() => openActivateConfirm(t)}
                            title="Reactivate Tenant"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}

                        {t.status === 'archived' ? (
                          <button
                            onClick={() => openRestoreConfirm(t)}
                            title="Restore Archived Tenant to Active"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#fef3c7',
                              color: '#d97706',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openArchiveConfirm(t)}
                            title="Safely Archive Tenant"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Archive size={15} />
                          </button>
                        )}

                        {/* Permanent Delete Action - available for all tenants */}
                        <button
                          onClick={() => openDeleteConfirm(t)}
                          title="Permanently Delete Tenant & All Business Data"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            const newTotalPages = Math.ceil(totalRecords / newSize) || 1;
            const targetPage = page > newTotalPages ? 1 : page;
            setPageSize(newSize);
            setPage(targetPage);
          }}
        />
      </div>

      {/* Create Tenant Modal */}
      {isCreateOpen && (
        <CreateTenantModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            fetchTenants();
          }}
        />
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <EditTenantModal
          isOpen={!!editingTenant}
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSuccess={() => {
            setEditingTenant(null);
            fetchTenants();
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          !confirmDialog.loading &&
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, error: '' }))
        }
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === 'delete'
            ? `Permanently Delete: "${confirmDialog.tenant?.businessName}"?`
            : confirmDialog.type === 'archive'
            ? `Archive Tenant: ${confirmDialog.tenant?.businessName}?`
            : confirmDialog.type === 'restore'
            ? `Restore Tenant: ${confirmDialog.tenant?.businessName}?`
            : confirmDialog.type === 'deactivate'
            ? `Suspend Tenant: ${confirmDialog.tenant?.businessName}`
            : `Reactivate Tenant: ${confirmDialog.tenant?.businessName}`
        }
        message={
          confirmDialog.type === 'delete'
            ? `⚠️ CRITICAL WARNING: You are about to permanently delete "${confirmDialog.tenant?.businessName}" (Code: ${confirmDialog.tenant?.tenantCode}). This action is destructive and irreversible. Deleting this tenant will permanently remove all associated business data belonging exclusively to this shop: all customer records, permanent measurement profiles, orders and historical snapshots, garment patterns, staff and admin accounts, and sequence counters. Other tenants and platform data will remain unaffected.`
            : confirmDialog.type === 'archive'
            ? `This action will archive "${confirmDialog.tenant?.businessName}" and immediately revoke login access. ALL historical customer profiles, measurement records, and orders are permanently preserved in MongoDB. The platform owner can restore this studio at any time.`
            : confirmDialog.type === 'restore'
            ? `Restoring "${confirmDialog.tenant?.businessName}" will immediately restore active status and allow staff to resume operations.`
            : confirmDialog.type === 'deactivate'
            ? `Suspending "${confirmDialog.tenant?.businessName}" will immediately block business API access for all associated staff. All data remains preserved.`
            : `Reactivating "${confirmDialog.tenant?.businessName}" will restore immediate business operations access.`
        }
        confirmText={
          confirmDialog.type === 'delete'
            ? 'Delete Tenant & All Associated Data'
            : confirmDialog.type === 'archive'
            ? 'Archive Tenant Safely'
            : confirmDialog.type === 'restore'
            ? 'Restore Tenant'
            : confirmDialog.type === 'deactivate'
            ? 'Suspend Tenant'
            : 'Activate Tenant'
        }
        cancelText="Cancel"
        danger={confirmDialog.type === 'delete' || confirmDialog.type === 'archive' || confirmDialog.type === 'deactivate'}
        loading={confirmDialog.loading}
        error={confirmDialog.error}
      />
    </div>
  );
};
