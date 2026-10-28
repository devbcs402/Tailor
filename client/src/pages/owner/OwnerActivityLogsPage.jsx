import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Clock,
  Terminal,
  AlertCircle,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { DataTablePagination } from '../../components/common/DataTablePagination';
import { Loading } from '../../components/common/Loading';

export const OwnerActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Delete Logs by Date State
  const [selectedLogDate, setSelectedLogDate] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLogs, setDeletingLogs] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [modalError, setModalError] = useState('');

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleOpenDeleteModal = (e) => {
    if (e) e.preventDefault();
    if (!selectedLogDate) return;
    setModalError('');
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (deletingLogs) return;
    setShowDeleteModal(false);
    setModalError('');
  };

  const handleConfirmDelete = async () => {
    if (!selectedLogDate || deletingLogs) return;
    setDeletingLogs(true);
    setModalError('');
    setDeleteSuccessMsg('');
    setDeleteErrorMsg('');

    try {
      const res = await ownerApi.deleteActivityLogsByDate(selectedLogDate);
      if (res?.success) {
        const count = res.deletedCount ?? 0;
        const formatted = res.formattedDate || formatDisplayDate(selectedLogDate);
        setDeleteSuccessMsg(`Successfully deleted ${count} activity log record(s) for ${formatted}.`);
        setShowDeleteModal(false);
        fetchLogs();
      } else {
        setModalError(res?.message || 'Failed to delete activity logs');
      }
    } catch (err) {
      console.error('Error deleting activity logs:', err);
      setModalError(err.message || 'Error occurred while communicating with the server');
    } finally {
      setDeletingLogs(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: pageSize,
        ...(actionFilter ? { action: actionFilter } : {}),
      };

      const res = await ownerApi.getActivityLogs(params);
      if (res?.success && res?.data) {
        setLogs(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.totalRecords || res.pagination.total || 0);
        }
      } else {
        setError(res?.message || 'Failed to retrieve audit logs');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Error communicating with platform server');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'tenant_created':
        return {
          label: 'Tenant Created',
          bg: '#dcfce7',
          color: '#16a34a',
          border: '#bbf7d0',
        };
      case 'tenant_updated':
        return {
          label: 'Tenant Updated',
          bg: '#eff6ff',
          color: '#2563eb',
          border: '#bfdbfe',
        };
      case 'tenant_deactivated':
        return {
          label: 'Tenant Suspended',
          bg: '#fee2e2',
          color: '#dc2626',
          border: '#fecaca',
        };
      case 'tenant_reactivated':
        return {
          label: 'Tenant Reactivated',
          bg: '#fefce8',
          color: '#ca8a04',
          border: '#fef08a',
        };
      case 'platform_owner_login':
        return {
          label: 'Owner Login',
          bg: '#f3e8ff',
          color: '#9333ea',
          border: '#e9d5ff',
        };
      case 'tenant_login':
        return {
          label: 'Tenant Login',
          bg: '#f1f5f9',
          color: '#475569',
          border: '#cbd5e1',
        };
      default:
        return {
          label: action,
          bg: '#f1f5f9',
          color: '#334155',
          border: '#e2e8f0',
        };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                padding: '3px 10px',
                borderRadius: '12px',
              }}
            >
              <ShieldCheck size={13} />
              Security & Compliance
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', margin: 0 }}>
            Audit Activity Logs
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px', margin: 0 }}>
            Immutable administrative and tenant authentication audit trail.
          </p>
        </div>

        <button
          onClick={fetchLogs}
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
          Refresh Logs
        </button>
      </div>

      {/* Delete Logs by Date Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px 24px',
          border: '1px solid #fee2e2',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Trash2 size={18} color="#dc2626" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
            Delete Logs by Date
          </h2>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 16px 0' }}>
          Select a calendar date to permanently remove all activity logs recorded on that day in Indian Standard Time (Asia/Kolkata).
        </p>

        <form
          onSubmit={handleOpenDeleteModal}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              value={selectedLogDate}
              onChange={(e) => {
                setSelectedLogDate(e.target.value);
                setDeleteSuccessMsg('');
                setDeleteErrorMsg('');
              }}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!selectedLogDate || deletingLogs}
            className="btn"
            style={{
              backgroundColor: !selectedLogDate || deletingLogs ? '#fca5a5' : '#dc2626',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: !selectedLogDate || deletingLogs ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={15} />
            Delete Logs
          </button>
        </form>

        {/* Success message showing how many records were deleted */}
        {deleteSuccessMsg && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{deleteSuccessMsg}</span>
          </div>
        )}

        {/* Error message if deletion fails */}
        {deleteErrorMsg && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="#dc2626" />
            <span>{deleteErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Filter by Event:</span>
          <select
            value={actionFilter}
            onChange={handleActionChange}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              minWidth: '200px',
            }}
          >
            <option value="">All Events & Actions</option>
            <option value="tenant_created">Tenant Created</option>
            <option value="tenant_updated">Tenant Updated</option>
            <option value="tenant_deactivated">Tenant Suspended</option>
            <option value="tenant_reactivated">Tenant Reactivated</option>
            <option value="platform_owner_login">Platform Owner Login</option>
            <option value="tenant_login">Tenant User Login</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          Total logged events: <strong style={{ color: '#0b1f3a' }}>{totalRecords}</strong>
        </div>
      </div>

      {/* Error alert */}
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

      {/* Audit Log Table */}
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
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Event Action</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Target Tenant</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Event Metadata / Payload</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <Terminal size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '1rem' }}>No audit records found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                      Audit logs will automatically record tenant lifecycle and administration actions.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#94a3b8" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>

                      {/* Event Action Badge */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0b1f3a' }}>
                          {log.actorEmail || 'System Actor'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'capitalize' }}>
                          {log.actorRole || 'admin'}
                        </div>
                      </td>

                      {/* Target Tenant */}
                      <td style={{ padding: '16px 20px' }}>
                        {log.targetTenantName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={15} color="#0b1f3a" />
                            <span style={{ fontWeight: 600, color: '#0b1f3a' }}>{log.targetTenantName}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>

                      {/* Details */}
                      <td style={{ padding: '16px 20px' }}>
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: 'monospace',
                              fontSize: '0.78rem',
                              backgroundColor: '#f8fafc',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                              maxWidth: '460px',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No additional details</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
          <DataTablePagination
            currentPage={page}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            totalPages={totalPages}
            totalRecords={totalRecords}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(newSize) => {
              const newTotalPages = Math.ceil(totalRecords / newSize) || 1;
              const targetPage = page > newTotalPages ? 1 : page;
              setPageSize(newSize);
              setPage(targetPage);
            }}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingLogs) {
              handleCloseDeleteModal();
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={22} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0b1f3a' }}>
                  Confirm Log Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deletingLogs}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: deletingLogs ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '0.98rem',
                  color: '#1e293b',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                Are you sure you want to permanently delete all activity logs for {formatDisplayDate(selectedLogDate)}? This action cannot be undone.
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  fontSize: '0.88rem',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Calendar size={15} color="#64748b" />
                  <span>
                    Selected Date: <strong style={{ color: '#0b1f3a' }}>{formatDisplayDate(selectedLogDate)}</strong> ({selectedLogDate})
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Timezone: Indian Standard Time (Asia/Kolkata, UTC+5:30)
                </div>
              </div>

              {modalError && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} color="#dc2626" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer with Cancel & Delete Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deletingLogs}
                className="btn btn-outline"
                style={{ fontSize: '0.9rem', padding: '9px 18px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLogs}
                className="btn"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.9rem',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: deletingLogs ? 'not-allowed' : 'pointer',
                  opacity: deletingLogs ? 0.7 : 1,
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Trash2 size={16} />
                {deletingLogs ? 'Deleting...' : 'Delete Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OwnerActivityLogsPage;
