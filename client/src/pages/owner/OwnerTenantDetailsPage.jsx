import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  FileText,
  Clock,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Edit,
  Ban,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hash,
  Calendar,
  Layers,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { EditTenantModal } from '../../components/owner/EditTenantModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Loading } from '../../components/common/Loading';

export const OwnerTenantDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Confirm dialog state for Activate / Deactivate
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'deactivate',
    loading: false,
    reason: '',
  });

  const fetchTenantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await ownerApi.getTenantById(id);
      if (res?.success && res?.data) {
        setTenant(res.data);
      } else {
        setError(res?.message || 'Failed to retrieve tenant details');
      }
    } catch (err) {
      console.error('Error fetching tenant details:', err);
      setError(err.message || 'Error communicating with platform server');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenantDetails();
  }, [fetchTenantDetails]);

  const handleConfirmAction = async () => {
    if (!tenant) return;
    const { type, reason } = confirmDialog;

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));
      let res;
      if (type === 'deactivate') {
        res = await ownerApi.deactivateTenant(tenant._id, reason || 'Suspended by platform administrator');
      } else if (type === 'activate') {
        res = await ownerApi.activateTenant(tenant._id);
      } else if (type === 'archive') {
        res = await ownerApi.archiveTenant(tenant._id, reason || 'Archived by platform administrator');
      } else if (type === 'restore') {
        res = await ownerApi.restoreTenant(tenant._id);
      }

      if (res?.success) {
        let msg = `Tenant "${tenant.businessName}" status updated.`;
        if (type === 'deactivate') msg = `Tenant "${tenant.businessName}" has been suspended.`;
        if (type === 'activate') msg = `Tenant "${tenant.businessName}" has been reactivated.`;
        if (type === 'archive') msg = `Tenant "${tenant.businessName}" has been safely archived. All customer and order records retained.`;
        if (type === 'restore') msg = `Tenant "${tenant.businessName}" has been restored to active status.`;

        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 5000);
        setConfirmDialog({ isOpen: false, type: 'deactivate', loading: false, reason: '' });
        fetchTenantDetails();
      } else {
        alert(res?.message || 'Operation failed');
        setConfirmDialog((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert(err.message || 'Failed to execute status change');
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
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
    });
  };

  if (loading) {
    return <Loading text="Loading tenant specifications..." fullScreen />;
  }

  if (error || !tenant) {
    return (
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/owner/tenants')}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
        >
          <ArrowLeft size={16} /> Back to Tenants List
        </button>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={24} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Failed to load tenant details</div>
            <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>{error || 'Tenant not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  const { stats = {}, users = [] } = tenant;
  const statusBreakdown = stats.orderStatusBreakdown || [];
  const statusMap = new Map(statusBreakdown.map((s) => [s._id, s.count]));

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Action Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/owner/tenants')}
            className="btn btn-outline"
            style={{
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Return to Tenants"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', margin: 0 }}>
                {tenant.businessName}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: '#f1f5f9',
                  color: '#0b1f3a',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                }}
              >
                {tenant.tenantCode}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: tenant.status === 'active' ? '#dcfce7' : '#fee2e2',
                  color: tenant.status === 'active' ? '#16a34a' : '#dc2626',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tenant.status === 'active' ? '#16a34a' : '#dc2626',
                  }}
                />
                {tenant.status === 'active' ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
              Registered on {formatDate(tenant.createdAt)} • Managed by {tenant.ownerName}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchTenantDetails}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            to={`/owner/tenants/${tenant._id}/edit`}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', textDecoration: 'none' }}
          >
            <Edit size={16} color="#0b1f3a" />
            Edit Info
          </Link>

          {tenant.status === 'active' && (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: 'deactivate', loading: false, reason: '' })}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#ef4444',
                color: '#dc2626',
                backgroundColor: '#fef2f2',
              }}
            >
              <Ban size={16} />
              Suspend Tenant
            </button>
          )}

          {tenant.status === 'inactive' && (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: 'activate', loading: false, reason: '' })}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#16a34a',
                borderColor: '#16a34a',
                color: '#ffffff',
              }}
            >
              <CheckCircle2 size={16} />
              Reactivate Tenant
            </button>
          )}

          {tenant.status === 'archived' ? (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: 'restore', loading: false, reason: '' })}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#d97706',
                borderColor: '#d97706',
                color: '#ffffff',
              }}
            >
              <RotateCcw size={16} />
              Restore Tenant
            </button>
          ) : (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: 'archive', loading: false, reason: '' })}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#cbd5e1',
                color: '#64748b',
                backgroundColor: '#f8fafc',
              }}
            >
              <Trash2 size={16} />
              Archive / Delete
            </button>
          )}
        </div>
      </div>

      {/* Success banner */}
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

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(11, 31, 58, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b1f3a',
            }}
          >
            <UserCheck size={24} color="#0b1f3a" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Customers
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', marginTop: '2px' }}>
              {stats.customerCount ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37',
            }}
          >
            <FileText size={24} color="#d4af37" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', marginTop: '2px' }}>
              {stats.orderCount ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Users size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Staff Accounts
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', marginTop: '2px' }}>
              {stats.userCount ?? users.length}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Delivered Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', marginTop: '2px' }}>
              {statusMap.get('delivered') || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Business Profile Details */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '14px',
              marginBottom: '18px',
            }}
          >
            <Building2 size={20} color="#0b1f3a" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
              Business Profile
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Business Name</span>
              <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{tenant.businessName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Tenant Code</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0b1f3a' }}>{tenant.tenantCode}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Owner / Principal</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{tenant.ownerName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Email Address</span>
              <span style={{ color: '#1e293b' }}>{tenant.email}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Mobile Number</span>
              <span style={{ color: '#1e293b' }}>{tenant.mobileNumber}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Location</span>
              <span style={{ color: '#1e293b', textAlign: 'right' }}>
                {tenant.address ? `${tenant.address}, ` : ''}
                {tenant.city || '—'}{tenant.state ? `, ${tenant.state}` : ''}
                {tenant.pincode ? ` - ${tenant.pincode}` : ''}
              </span>
            </div>

            {tenant.notes && (
              <div style={{ borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Administrative Notes</span>
                <span style={{ color: '#334155', fontStyle: 'italic', fontSize: '0.88rem' }}>{tenant.notes}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Created Date</span>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatDate(tenant.createdAt)}</span>
            </div>

            {tenant.deactivatedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>Deactivation Record</span>
                <span style={{ color: '#991b1b', fontSize: '0.85rem' }}>{formatDate(tenant.deactivatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '14px',
              marginBottom: '18px',
            }}
          >
            <Layers size={20} color="#0b1f3a" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
              Order Lifecycle Breakdown
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>In Progress (Tailoring)</span>
                <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{statusMap.get('in_progress') || 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#eff6ff', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    width: `${stats.orderCount ? Math.round(((statusMap.get('in_progress') || 0) / stats.orderCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 600, color: '#eab308' }}>Ready for Trial / Pickup</span>
                <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{statusMap.get('ready') || 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#fefce8', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#eab308',
                    width: `${stats.orderCount ? Math.round(((statusMap.get('ready') || 0) / stats.orderCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 600, color: '#10b981' }}>Delivered / Completed</span>
                <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{statusMap.get('delivered') || 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#ecfdf5', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#10b981',
                    width: `${stats.orderCount ? Math.round(((statusMap.get('delivered') || 0) / stats.orderCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>Cancelled</span>
                <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{statusMap.get('cancelled') || 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#ef4444',
                    width: `${stats.orderCount ? Math.round(((statusMap.get('cancelled') || 0) / stats.orderCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff & User Accounts Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#0b1f3a" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
              Authorized Tenant Users ({users.length})
            </h2>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Email Address</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Shop Identity</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No authorized user accounts found for this tenant.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0b1f3a' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          textTransform: 'capitalize',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: u.role === 'admin' ? '#eff6ff' : '#f1f5f9',
                          color: u.role === 'admin' ? '#2563eb' : '#475569',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>
                      {u.shopName || tenant.businessName}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: u.isActive ? '#dcfce7' : '#fee2e2',
                          color: u.isActive ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {isEditOpen && (
        <EditTenantModal
          tenant={tenant}
          onClose={() => setIsEditOpen(false)}
          onUpdated={() => {
            fetchTenantDetails();
            setSuccessMessage(`Tenant "${tenant.businessName}" information updated.`);
            setTimeout(() => setSuccessMessage(''), 4000);
          }}
        />
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === 'archive'
            ? `Archive Tenant "${tenant.businessName}"?`
            : confirmDialog.type === 'restore'
            ? `Restore Tenant "${tenant.businessName}"?`
            : confirmDialog.type === 'deactivate'
            ? `Suspend "${tenant.businessName}"?`
            : `Reactivate "${tenant.businessName}"?`
        }
        message={
          confirmDialog.type === 'archive'
            ? `This action will safely archive "${tenant.businessName}" and immediately revoke login access. ALL customer profiles, measurement records, and historical orders are permanently preserved in MongoDB. The platform owner can restore this studio at any time.`
            : confirmDialog.type === 'restore'
            ? `Restoring "${tenant.businessName}" will immediately restore active status and allow staff to resume operations.`
            : confirmDialog.type === 'deactivate'
            ? `Suspending this tenant will immediately revoke business API and login access for all associated staff members. Historical customer, order, and pattern records will be safely preserved.`
            : `Reactivating this tenant will restore immediate business API access and allow staff to resume operations.`
        }
        confirmText={
          confirmDialog.type === 'archive'
            ? 'Archive Tenant Safely'
            : confirmDialog.type === 'restore'
            ? 'Restore to Active'
            : confirmDialog.type === 'deactivate'
            ? 'Suspend Tenant Access'
            : 'Reactivate Tenant Access'
        }
        confirmVariant={confirmDialog.type === 'archive' || confirmDialog.type === 'deactivate' ? 'danger' : 'primary'}
        loading={confirmDialog.loading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false, type: 'deactivate', loading: false, reason: '' })}
      />
    </div>
  );
};
export default OwnerTenantDetailsPage;
