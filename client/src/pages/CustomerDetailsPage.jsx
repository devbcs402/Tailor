import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  Edit,
  ClipboardList,
  Eye,
  Ruler,
  Save,
} from 'lucide-react';
import { customersApi } from '../api/customersApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { MeasurementDisplay } from '../components/customers/MeasurementDisplay';
import { CustomerModal } from '../components/customers/CustomerModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { ShirtMeasurements } from '../components/orders/ShirtMeasurements';
import { PantMeasurements } from '../components/orders/PantMeasurements';

export const CustomerDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditMeasurementsOpen, setIsEditMeasurementsOpen] = useState(false);

  // Edit measurements state
  const [editShirt, setEditShirt] = useState({});
  const [editShirtPattern, setEditShirtPattern] = useState('');
  const [editShirtCustomPattern, setEditShirtCustomPattern] = useState('');
  const [editPant, setEditPant] = useState({});
  const [editPantPattern, setEditPantPattern] = useState('');
  const [editPantCustomPattern, setEditPantCustomPattern] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError('');
    try {
      const [custRes, ordersRes] = await Promise.all([
        customersApi.getCustomerById(id),
        customersApi.getCustomerOrders(id),
      ]);
      setCustomer(custRes.data);
      setOrders(ordersRes.data || []);

      // Prepare edit measurement states
      if (custRes.data.latestMeasurements) {
        const lm = custRes.data.latestMeasurements;
        setEditShirt(lm.shirt ? { ...lm.shirt } : {});
        setEditShirtPattern(lm.shirtPattern || lm.shirtCustomPattern || '');
        setEditShirtCustomPattern(lm.shirtCustomPattern || '');
        setEditPant(lm.pant ? { ...lm.pant } : {});
        setEditPantPattern(lm.pantPattern || lm.pantCustomPattern || '');
        setEditPantCustomPattern(lm.pantCustomPattern || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const handleSaveMeasurements = async (e) => {
    e.preventDefault();
    setSavingMeasurements(true);
    try {
      const updatedMeasurements = {
        unit: customer.latestMeasurements?.unit || 'inch',
        shirt: editShirt,
        shirtPattern: editShirtPattern,
        shirtCustomPattern: editShirtCustomPattern,
        pant: editPant,
        pantPattern: editPantPattern,
        pantCustomPattern: editPantCustomPattern,
        updatedAt: new Date(),
      };

      await customersApi.updateMeasurements(id, updatedMeasurements);
      success('Customer saved measurements updated');
      setIsEditMeasurementsOpen(false);
      fetchCustomerData();
    } catch (err) {
      toastError(err.message || 'Failed to update measurements');
    } finally {
      setSavingMeasurements(false);
    }
  };

  if (loading) return <Loading text="Loading customer details..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchCustomerData} />;
  if (!customer) return <ErrorMessage message="Customer not found" />;

  const lm = customer.latestMeasurements || {};

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back Button & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/customers')}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="btn btn-outline btn-sm"
          >
            <Edit size={14} /> Edit Info
          </button>
          <button
            onClick={() => navigate('/orders/create', { state: { preselectedCustomer: customer } })}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} /> New Order for this Customer
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.75rem',
                border: '2px solid var(--accent-gold)',
              }}
            >
              {customer.name?.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff' }}>
                {customer.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.92rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} color="var(--accent-gold)" /> {customer.mobileNumber}
                </span>
                {customer.address && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="var(--accent-gold)" /> {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Total Orders</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              {orders.length}
            </div>
          </div>
        </div>

        {customer.notes && (
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.88rem',
              color: '#e0e7ff',
            }}
          >
            <strong>Notes:</strong> {customer.notes}
          </div>
        )}
      </div>

      {/* Latest Saved Measurements Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Ruler size={20} color="var(--primary)" />
            <span>Customer Saved Measurements</span>
          </div>
          <button
            onClick={() => setIsEditMeasurementsOpen(!isEditMeasurementsOpen)}
            className="btn btn-outline btn-sm"
          >
            <Edit size={14} /> {isEditMeasurementsOpen ? 'Close Form' : 'Edit Measurements'}
          </button>
        </div>

        {isEditMeasurementsOpen ? (
          /* Inline Edit Measurements Form */
          <form onSubmit={handleSaveMeasurements} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ShirtMeasurements
              measurements={editShirt}
              onChangeMeasurements={setEditShirt}
              pattern={editShirtPattern}
              onChangePattern={setEditShirtPattern}
              quantity={1}
              onChangeQuantity={() => {}}
            />

            <PantMeasurements
              measurements={editPant}
              onChangeMeasurements={setEditPant}
              pattern={editPantPattern}
              onChangePattern={setEditPantPattern}
              quantity={1}
              onChangeQuantity={() => {}}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsEditMeasurementsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingMeasurements}
              >
                <Save size={16} /> {savingMeasurements ? 'Saving...' : 'Save Measurements'}
              </button>
            </div>
          </form>
        ) : (
          /* Readonly Measurement Display */
          <MeasurementDisplay
            measurements={lm}
            shirtPattern={lm.shirtPattern || 'plain'}
            shirtCustomPattern={lm.shirtCustomPattern || ''}
            pantPattern={lm.pantPattern || 'plain_pant'}
            pantCustomPattern={lm.pantCustomPattern || ''}
            updatedAt={lm.updatedAt}
          />
        )}
      </div>

      {/* Customer Order History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ClipboardList size={20} color="var(--primary)" />
            <span>Order History</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total {orders.length} Orders
          </span>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div>No orders yet for this customer.</div>
            <button
              onClick={() => navigate('/orders/create', { state: { preselectedCustomer: customer } })}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '14px' }}
            >
              <Plus size={14} /> Create First Order
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Order Date</th>
                  <th>Deadline</th>
                  <th>Garments</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {o.orderNumber}
                    </td>
                    <td>{formatDate(o.orderDate)}</td>
                    <td>{formatDate(o.deadline)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {o.shirt?.quantity > 0 && (
                          <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px' }}>
                            Shirt: {o.shirt.quantity}
                          </span>
                        )}
                        {o.pant?.quantity > 0 && (
                          <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--accent-gold-light)', color: 'var(--secondary)', borderRadius: '4px' }}>
                            Pant: {o.pant.quantity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/orders/${o._id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <CustomerModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        customerToEdit={customer}
        onSaved={() => fetchCustomerData()}
      />
    </div>
  );
};
