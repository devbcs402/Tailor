import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { ORDER_STATUS_CONFIG } from '../../utils/patternOptions';
import { ordersApi } from '../../api/ordersApi';
import { useToast } from '../../context/ToastContext';

export const StatusChangeModal = ({ isOpen, onClose, order, onStatusUpdated }) => {
  const [selectedStatus, setSelectedStatus] = useState(
    order?.status === 'pending' ? 'in_progress' : (order?.status || 'in_progress')
  );
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!isOpen || !order) return null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.updateStatus(order._id, selectedStatus);
      success(`Order #${order.orderNumber} status updated to ${ORDER_STATUS_CONFIG[selectedStatus]?.label}`);
      onStatusUpdated(res.data);
      onClose();
    } catch (err) {
      error(err.message || 'Error updating order status');
    } finally {
      setLoading(false);
    }
  };

  // Only offer active statuses to select from; remove 'pending'
  const statuses = Object.values(ORDER_STATUS_CONFIG).filter((s) => s.key !== 'pending');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div className="card-header">
          <div className="card-title" style={{ fontSize: '1.05rem' }}>
            Update Order Status ({order.orderNumber})
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0' }}>
          {statuses.map((s) => {
            const isSelected = selectedStatus === s.key;
            return (
              <div
                key={s.key}
                onClick={() => setSelectedStatus(s.key)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`status-badge ${s.badgeClass}`}>
                    <span className="status-dot"></span>
                    {s.label}
                  </span>
                </div>
                {isSelected && <Check size={18} color="var(--primary)" />}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleUpdate} className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Save Status'}
          </button>
        </div>
      </div>
    </div>
  );
};
