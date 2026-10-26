import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Eye,
  Scissors,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, getDeadlineStatus } from '../utils/dateUtils';
import { StatusChangeModal } from '../components/orders/StatusChangeModal';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModalOrder, setStatusModalOrder] = useState(null);

  const navigate = useNavigate();

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.getSummary();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return <Loading text="Loading dashboard data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchSummary} />;
  }

  const { counts, dueTodayOrders = [], overdueOrders = [], upcomingDeadlines = [], recentOrders = [] } =
    data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Urgent Alert Banner (if orders overdue or due today) */}
      {(counts?.overdueCount > 0 || counts?.dueTodayCount > 0) && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: counts?.overdueCount > 0 ? '#fef2f2' : '#fffbeb',
            border: `1.5px solid ${counts?.overdueCount > 0 ? '#fca5a5' : '#fde68a'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle
              size={24}
              color={counts?.overdueCount > 0 ? '#dc2626' : '#d97706'}
              style={{ flexShrink: 0 }}
            />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: counts?.overdueCount > 0 ? '#991b1b' : '#92400e',
                }}
              >
                {counts?.overdueCount > 0
                  ? `Attention: ${counts.overdueCount} orders are overdue!`
                  : `You have ${counts?.dueTodayCount} orders due today!`}
              </div>
              <div
                style={{
                  fontSize: '0.84rem',
                  color: counts?.overdueCount > 0 ? '#b91c1c' : '#b45309',
                }}
              >
                Check the orders below to ensure on-time delivery for customers.
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/orders')}
            className="btn btn-sm"
            style={{
              backgroundColor: counts?.overdueCount > 0 ? '#dc2626' : '#d97706',
              color: '#ffffff',
            }}
          >
            View Active Orders <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid-4">
        {/* Total Orders */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Total Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {counts?.totalOrders || 0}
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', color: '#b45309', fontWeight: 600 }}>
              Orders Due Today
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
              {counts?.dueTodayCount || 0}
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Active Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
              {(counts?.inProgressOrders || counts?.pendingOrders || 0)}
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Completed Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {counts?.completedOrders || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Due Today & Upcoming Section */}
      <div className="grid-2">
        {/* Orders Due Today Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Calendar size={20} color="#d97706" />
              <span>Orders Due Today</span>
            </div>
            <span
              style={{
                fontSize: '0.82rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontWeight: 700,
              }}
            >
              {dueTodayOrders.length} Orders
            </span>
          </div>

          {dueTodayOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600 }}>No orders due today!</div>
              <div style={{ fontSize: '0.84rem', marginTop: '4px' }}>All orders are delivered or on schedule.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dueTodayOrders.map((o) => (
                <div
                  key={o._id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #fed7aa',
                    backgroundColor: '#fffaf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>
                        {o.orderNumber}
                      </span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {o.customerSnapshot?.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                      Phone: {o.customerSnapshot?.mobileNumber}
                      {o.deliveryTime && ` • Time: ${o.deliveryTime}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setStatusModalOrder(o)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <StatusBadge status={o.status} />
                    </button>
                    <button
                      onClick={() => navigate(`/orders/${o._id}`)}
                      className="btn btn-outline btn-sm"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines (Next 7 Days) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--primary)" />
              <span>Upcoming Deadlines</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Next 7 Days</span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <div>No upcoming delivery deadlines in the next 7 days.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingDeadlines.map((o) => {
                const deadlineInfo = getDeadlineStatus(o.deadline, o.status);
                return (
                  <div
                    key={o._id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>
                          {o.orderNumber}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {o.customerSnapshot?.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                        Deadline: <strong>{formatDate(o.deadline)}</strong> ({deadlineInfo.badge})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setStatusModalOrder(o)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <StatusBadge status={o.status} />
                      </button>
                      <button
                        onClick={() => navigate(`/orders/${o._id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Scissors size={20} color="var(--primary)" />
            <span>Recent Orders</span>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-outline btn-sm"
          >
            View All Orders <ArrowRight size={14} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div>No orders recorded yet.</div>
            <button
              onClick={() => navigate('/orders/create')}
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
            >
              <Plus size={16} /> Create First Order
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Order Date</th>
                  <th>Deadline</th>
                  <th>Garments</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const deadlineInfo = getDeadlineStatus(o.deadline, o.status);
                  return (
                    <tr key={o._id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {o.orderNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.customerSnapshot?.name}</td>
                      <td style={{ color: '#475569' }}>{o.customerSnapshot?.mobileNumber}</td>
                      <td>{formatDate(o.orderDate)}</td>
                      <td>
                        <div>{formatDate(o.deadline)}</div>
                        {deadlineInfo.isUrgent && (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                            {deadlineInfo.badge}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {o.shirt?.quantity > 0 && (
                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>
                              Shirt: {o.shirt.quantity}
                            </span>
                          )}
                          {o.pant?.quantity > 0 && (
                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--accent-gold-light)', color: 'var(--secondary)', borderRadius: '4px', fontWeight: 600 }}>
                              Pant: {o.pant.quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => setStatusModalOrder(o)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Change Status"
                        >
                          <StatusBadge status={o.status} />
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/orders/${o._id}`)}
                          className="btn btn-outline btn-sm"
                        >
                          <Eye size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Status Modal */}
      {statusModalOrder && (
        <StatusChangeModal
          isOpen={!!statusModalOrder}
          onClose={() => setStatusModalOrder(null)}
          order={statusModalOrder}
          onStatusUpdated={() => {
            fetchSummary();
            setStatusModalOrder(null);
          }}
        />
      )}
    </div>
  );
};
