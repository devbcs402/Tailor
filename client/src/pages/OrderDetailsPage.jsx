import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Clock,
  User,
  Phone,
  MapPin,
  FileText,
  Edit,
  Trash2,
  Download,
} from 'lucide-react';
import { ordersApi } from '../api/ordersApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, getDeadlineStatus } from '../utils/dateUtils';
import { SHIRT_FIELDS, PANT_FIELDS, getFieldValue } from '../utils/measurementLabels';
import { getShirtPatternLabel, getPantPatternLabel } from '../utils/patternOptions';
import { StatusChangeModal } from '../components/orders/StatusChangeModal';
import { OrderPrintSlip } from '../components/orders/OrderPrintSlip';
import { EditOrderModal } from '../components/orders/EditOrderModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { downloadOrderSlipPdf } from '../services/orderSlipPdfService';
import { useTenantMeasurements } from '../hooks/useTenantMeasurements';

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { shirtDefinitions, pantDefinitions } = useTenantMeasurements();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ordersApi.getOrderById(id);
      setOrder(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (loading) return <Loading text="Loading order details..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchOrder} />;
  if (!order) return <ErrorMessage message="Order not found" />;

  const deadlineInfo = getDeadlineStatus(order.deadline, order.status);

  // Compute pattern display strings for shirt & pant
  const shirtPatternDisplay = [
    ...(Array.isArray(order.shirt?.patterns) ? order.shirt.patterns : (order.shirt?.pattern ? [order.shirt.pattern] : [])),
    order.shirt?.customPattern
  ].filter(Boolean).join(', ') || 'None';

  const pantPatternDisplay = [
    ...(Array.isArray(order.pant?.patterns) ? order.pant.patterns : (order.pant?.pattern ? [order.pant.pattern] : [])),
    order.pant?.customPattern
  ].filter(Boolean).join(', ') || 'None';

  const handleDeleteOrder = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await ordersApi.deleteOrder(order._id);
      success(`Order #${order.orderNumber} deleted successfully`);
      navigate('/orders');
    } catch (err) {
      toastError(err.message || 'Failed to delete order');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Dynamic fields resolution supporting custom fields and historical snapshots
  const resolveGarmentFields = (snapshotList, rawMeasurements, definitions) => {
    if (Array.isArray(snapshotList) && snapshotList.length > 0) {
      return snapshotList.map((item) => ({
        key: item.fieldKey,
        label: item.displayName,
        gujaratiLabel: item.gujaratiName,
        value: item.value,
      }));
    }

    const measurements = rawMeasurements || {};
    const baseDefs = (definitions && definitions.length > 0)
      ? definitions
      : SHIRT_FIELDS.map((f) => ({ fieldKey: f.key, displayName: f.label, gujaratiName: f.gujaratiLabel }));
    const defKeys = new Set(baseDefs.map((d) => d.fieldKey));

    const fields = baseDefs.map((d) => ({
      key: d.fieldKey,
      label: d.displayName,
      gujaratiLabel: d.gujaratiName,
      value: getFieldValue(measurements, d.fieldKey) || '-',
    }));

    Object.keys(measurements).forEach((k) => {
      if (k !== 'notes' && k !== '_id' && !defKeys.has(k) && measurements[k] !== undefined && measurements[k] !== null && String(measurements[k]).trim().length > 0) {
        fields.push({
          key: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          gujaratiLabel: '',
          value: measurements[k],
        });
      }
    });

    return fields;
  };

  const shirtDisplayFields = resolveGarmentFields(order.measurementSnapshot?.shirt, order.shirt?.measurements, shirtDefinitions);
  const pantDisplayFields = resolveGarmentFields(order.measurementSnapshot?.pant, order.pant?.measurements, pantDefinitions);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/orders')}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Orders
        </button>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/orders/${order._id}/edit`)}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--accent-gold)', color: 'var(--primary)' }}
          >
            <Edit size={16} color="var(--accent-gold)" /> Edit Order
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="btn btn-secondary btn-sm"
          >
            Change Status
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Preview Order Slip Modal"
          >
            <FileText size={15} /> Order Slip
          </button>
          <button
            onClick={() => {
              try {
                downloadOrderSlipPdf(order, user, { shirtDefinitions, pantDefinitions });
                success(`Order Slip #${order.orderNumber} downloaded!`);
              } catch (err) {
                toastError(err.message || 'Failed to generate PDF');
              }
            }}
            className="btn btn-gold btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Download PDF order slip directly"
          >
            <Download size={15} /> Download PDF
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fca5a5' }}
            title="Delete Order"
          >
            <Trash2 size={16} /> Delete Order
          </button>
        </div>
      </div>

      {/* Hero Order Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0b1f3a 0%, #142d4e 100%)',
          color: '#ffffff',
          padding: '28px',
          boxShadow: 'var(--shadow-lg)',
          borderLeft: '5px solid var(--accent-gold)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Order Number</div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>
              {order.orderNumber}
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginTop: '6px' }}>
              Order Date: {formatDate(order.orderDate)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ background: '#ffffff', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
              <StatusBadge status={order.status} />
            </div>
            {deadlineInfo.isUrgent && (
              <span
                style={{
                  fontSize: '0.82rem',
                  padding: '4px 10px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}
              >
                ⚠️ {deadlineInfo.badge}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Delivery Schedule Row */}
      <div className="grid-2">
        {/* Customer Details Snapshot Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <User size={18} color="var(--primary)" />
              <span>Customer Details</span>
            </div>
            {order.customer && (
              <Link
                to={`/customers/${order.customer._id || order.customer}`}
                style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                View Customer Profile →
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {order.customerSnapshot?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.95rem' }}>
              <Phone size={16} /> {order.customerSnapshot?.mobileNumber}
            </div>
            {order.customerSnapshot?.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                <MapPin size={16} /> {order.customerSnapshot?.address}
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Timing Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} color="var(--accent-gold)" />
              <span>Delivery Schedule</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Deadline Date:</span>
              <strong style={{ fontSize: '1.05rem', color: '#b45309' }}>{formatDate(order.deadline)}</strong>
            </div>
            {order.deliveryTime && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery Time:</span>
                <span>{order.deliveryTime}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Deadline Status:</span>
              <strong style={{ color: deadlineInfo.isUrgent ? '#dc2626' : '#15803d' }}>
                {deadlineInfo.text}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Garments Snapshots */}
      <div className="grid-2">
        {/* Shirt Snapshot */}
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title">
              Shirt Details ({order.shirt?.quantity || 0} pcs)
            </div>
            <span style={{ fontSize: '0.82rem', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-light)' }}>
              Pattern: {shirtPatternDisplay}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {shirtDisplayFields.map((f) => (
              <div key={f.key} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {f.label} {f.gujaratiLabel ? `(${f.gujaratiLabel})` : ''}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {f.value || '-'}
                </div>
              </div>
            ))}
          </div>

          {order.shirt?.measurements?.notes && (
            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#475569', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
              <strong>Notes:</strong> {order.shirt.measurements.notes}
            </div>
          )}
        </div>

        {/* Pant Snapshot */}
        <div className="card" style={{ borderTop: '4px solid var(--secondary)' }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title">
              Pant Details ({order.pant?.quantity || 0} pcs)
            </div>
            <span style={{ fontSize: '0.82rem', padding: '4px 12px', backgroundColor: 'var(--accent-gold-light)', color: 'var(--secondary)', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid #f3e8c2' }}>
              Pattern: {pantPatternDisplay}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {pantDisplayFields.map((f) => (
              <div key={f.key} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {f.label} {f.gujaratiLabel ? `(${f.gujaratiLabel})` : ''}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {f.value || '-'}
                </div>
              </div>
            ))}
          </div>

          {order.pant?.measurements?.notes && (
            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#475569', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
              <strong>Notes:</strong> {order.pant.measurements.notes}
            </div>
          )}
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} color="var(--primary)" />
              <span>Special Instructions</span>
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)', minHeight: '80px', color: '#334155' }}>
            {order.specialInstructions || 'No special instructions recorded.'}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditOrderModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          order={order}
          onOrderUpdated={(updated) => setOrder(updated)}
        />
      )}

      {showStatusModal && (
        <StatusChangeModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          order={order}
          onStatusUpdated={(updated) => setOrder(updated)}
        />
      )}

      {showPrintModal && (
        <OrderPrintSlip
          order={order}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !deleting && setShowDeleteDialog(false)}
        onConfirm={handleDeleteOrder}
        title="Delete Order"
        message={`Are you sure you want to delete order #${order?.orderNumber}? This action cannot be undone.`}
        confirmText="Delete Order"
        cancelText="Cancel"
        danger={true}
        loading={deleting}
      />
    </div>
  );
};
