import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Ban,
  Users,
  UserCheck,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { CreateTenantModal } from '../../components/owner/CreateTenantModal';

export const OwnerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await ownerApi.getPlatformStats();
      if (response.data?.success) {
        setStats(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to load platform statistics');
      }
    } catch (err) {
      console.error('Error loading platform stats:', err);
      setError(err.response?.data?.message || 'Failed to connect to platform server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner / Welcome */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
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
              SaaS Administration
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f3a', margin: 0 }}>
            Platform Overview
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px', margin: 0 }}>
            Live platform metrics, tenant provisioning, and global tailoring operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              fontSize: '0.88rem',
            }}
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
            }}
          >
            <Plus size={18} />
            Onboard Tenant
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* 6 Statistic Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '18px',
          marginBottom: '32px',
        }}
      >
        {/* Total Tenants */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Tenants
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0b1f3a', marginTop: '6px' }}>
                {loading ? '...' : (stats?.totalTenants ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(11, 31, 58, 0.08)',
                color: '#0b1f3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Registered tailoring businesses
          </div>
        </div>

        {/* Active Tenants */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Tenants
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                {loading ? '...' : (stats?.activeTenants ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Currently operating normally
          </div>
        </div>

        {/* Inactive Tenants */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Suspended / Inactive
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
                {loading ? '...' : (stats?.inactiveTenants ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ban size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Access temporarily disabled
          </div>
        </div>

        {/* Total Tenant Users */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Staff Accounts
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0b1f3a', marginTop: '6px' }}>
                {loading ? '...' : (stats?.totalTenantUsers ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: '#b8941f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Admins, tailors & salesmen
          </div>
        </div>

        {/* Total Customers */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Global Customers
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0b1f3a', marginTop: '6px' }}>
                {loading ? '...' : (stats?.totalCustomers ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(11, 31, 58, 0.08)',
                color: '#0b1f3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Across all tenant databases
          </div>
        </div>

        {/* Total Orders */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Global Orders
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0b1f3a', marginTop: '6px' }}>
                {loading ? '...' : (stats?.totalOrders ?? 0)}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: '#b8941f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            Total processed tailor orders
          </div>
        </div>
      </div>

      {/* Main Content: Recent Tenants & Recent Audit Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Recent Tenants Table Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                Recently Onboarded Tenants
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Latest tailoring business instances provisioned on the platform
              </p>
            </div>
            <Link
              to="/owner/tenants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#0b1f3a',
                textDecoration: 'none',
              }}
            >
              Manage All Tenants
              <ArrowRight size={15} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Business Name</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tenant Code</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                      Loading tenants...
                    </td>
                  </tr>
                ) : !stats?.recentTenants || stats.recentTenants.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No tenants registered yet. Click "Onboard Tenant" to get started.
                    </td>
                  </tr>
                ) : (
                  stats.recentTenants.map((tenant) => (
                    <tr
                      key={tenant._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0b1f3a' }}>
                        {tenant.businessName}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            color: '#0b1f3a',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {tenant.tenantCode}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>
                        {tenant.ownerName}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                        <div>{tenant.email}</div>
                        <div>{tenant.mobileNumber}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
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
                          {tenant.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                        {formatDate(tenant.createdAt)}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <Link
                          to={`/owner/tenants/${tenant._id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#0b1f3a',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Details
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Platform Audit Activity Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                Recent Platform Audit Logs
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Secure trace of administrative and security events
              </p>
            </div>
            <Link
              to="/owner/activity-logs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#0b1f3a',
                textDecoration: 'none',
              }}
            >
              View Full Audit Trail
              <ArrowRight size={15} />
            </Link>
          </div>

          <div style={{ padding: '16px 24px' }}>
            {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No recent activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.recentAuditLogs.map((log) => (
                  <div
                    key={log._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          backgroundColor:
                            log.action === 'tenant_deactivated'
                              ? '#fee2e2'
                              : log.action === 'tenant_created'
                              ? '#dcfce7'
                              : log.action === 'tenant_reactivated'
                              ? '#dbeafe'
                              : '#f1f5f9',
                          color:
                            log.action === 'tenant_deactivated'
                              ? '#dc2626'
                              : log.action === 'tenant_created'
                              ? '#16a34a'
                              : log.action === 'tenant_reactivated'
                              ? '#2563eb'
                              : '#475569',
                        }}
                      >
                        {log.action}
                      </span>
                      <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}>
                        {log.targetTenantName ? (
                          <>
                            <strong>{log.targetTenantName}</strong> —{' '}
                          </>
                        ) : null}
                        {log.details?.reason || log.actorEmail || 'System event'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.78rem' }}>
                      <Clock size={13} />
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onboard Tenant Modal */}
      {isCreateModalOpen && (
        <CreateTenantModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchStats();
          }}
        />
      )}
    </div>
  );
};
