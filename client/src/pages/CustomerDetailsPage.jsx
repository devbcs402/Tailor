import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  Edit,
  Trash2,
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
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ShirtMeasurements } from '../components/orders/ShirtMeasurements';
import { PantMeasurements } from '../components/orders/PantMeasurements';
import { DataTablePagination } from '../components/common/DataTablePagination';

export const CustomerDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Orders pagination
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);

  const ordersTotalRecords = orders.length;
  const ordersTotalPages = Math.ceil(ordersTotalRecords / ordersPageSize) || 1;
  const ordersCurrentPage = Math.min(Math.max(1, ordersPage), ordersTotalPages);
  const ordersStartIndex = (ordersCurrentPage - 1) * ordersPageSize;
  const ordersEndIndex = ordersStartIndex + ordersPageSize;
  const displayedOrders = orders.slice(ordersStartIndex, ordersEndIndex);

  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditMeasurementsOpen, setIsEditMeasurementsOpen] = useState(false);

  // Edit measurements state
  const [editShirt, setEditShirt] = useState({});
  const [editShirtPatterns, setEditShirtPatterns] = useState([]);
  const [editShirtCustomPattern, setEditShirtCustomPattern] = useState('');
  const [editPant, setEditPant] = useState({});
  const [editPantPatterns, setEditPantPatterns] = useState([]);
  const [editPantCustomPattern, setEditPantCustomPattern] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  // Delete / Archive state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteNeedsArchive, setDeleteNeedsArchive] = useState(false);

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

      // Prepare edit measurement states safely
      if (custRes.data.latestMeasurements) {
        const lm = custRes.data.latestMeasurements;
        setEditShirt(lm.shirt ? { ...lm.shirt } : {});
        const sPatterns = Array.isArray(lm.shirtPatterns) && lm.shirtPatterns.length > 0
          ? lm.shirtPatterns
          : (lm.shirtPattern ? [lm.shirtPattern] : []);
        setEditShirtPatterns(sPatterns);
        setEditShirtCustomPattern(lm.shirtCustomPattern || '');

        setEditPant(lm.pant ? { ...lm.pant } : {});
        const pPatterns = Array.isArray(lm.pantPatterns) && lm.pantPatterns.length > 0
          ? lm.pantPatterns
          : (lm.pantPattern ? [lm.pantPattern] : []);
        setEditPantPatterns(pPatterns);
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

  useEffect(() => {
    if (customer?.name) {
      const businessName = user?.tenant?.businessName || user?.shopName || 'Tailor Studio';
      document.title = `${customer.name} | ${businessName}`;
    }
  }, [customer, user]);

  const handleSaveMeasurements = async (e) => {
    e.preventDefault();
    setSavingMeasurements(true);
    try {
      const updatedMeasurements = {
        shirt: editShirt,
        shirtPatterns: editShirtPatterns,
        shirtPattern: editShirtPatterns.join(', '),
        shirtCustomPattern: editShirtCustomPattern,
        pant: editPant,
        pantPatterns: editPantPatterns,
        pantPattern: editPantPatterns.join(', '),
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

  const handleOpenDelete = () => {
    setDeleteError('');
    setDeleteNeedsArchive(Boolean(orders && orders.length > 0));
    setDeleteModalOpen(true);
  };

  const handleCloseDelete = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteError('');
    setDeleteNeedsArchive(false);
  };

  const handleConfirmDelete = async () => {
    if (!customer || deleting) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const hasOrders = Boolean(orders && orders.length > 0);
      const shouldArchive = deleteNeedsArchive || hasOrders;

      const res = await customersApi.deleteCustomer(customer._id, {
        archive: shouldArchive,
      });

      const isArchived = res?.action === 'archived' || shouldArchive;
      const successMsg = isArchived
        ? `Customer "${customer.name}" archived successfully to preserve historical orders.`
        : `Customer "${customer.name}" deleted successfully.`;

      success(successMsg);
      navigate('/customers');
    } catch (err) {
      const isOrdersError =
        err.response?.data?.code === 'CUSTOMER_HAS_ORDERS' ||
        err.code === 'CUSTOMER_HAS_ORDERS' ||
        (err.message && err.message.toLowerCase().includes('existing order'));

      if (isOrdersError) {
        setDeleteNeedsArchive(true);
        setDeleteError(
          err.response?.data?.message ||
          `Customer "${customer.name}" has existing orders and cannot be permanently deleted. You can archive this customer instead to preserve historical records.`
        );
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to delete customer';
        setDeleteError(errorMsg);
        toastError(errorMsg);
      }
    } finally {
      setDeleting(false);
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
            onClick={handleOpenDelete}
            className="btn btn-outline btn-sm"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            title="Delete Customer"
          >
            <Trash2 size={14} /> Delete
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
              selectedPatterns={editShirtPatterns}
              onChangeSelectedPatterns={setEditShirtPatterns}
              customPattern={editShirtCustomPattern}
              onChangeCustomPattern={setEditShirtCustomPattern}
              quantity={1}
              onChangeQuantity={() => {}}
              allowHistoricalFields={false}
            />

            <PantMeasurements
              measurements={editPant}
              onChangeMeasurements={setEditPant}
              selectedPatterns={editPantPatterns}
              onChangeSelectedPatterns={setEditPantPatterns}
              customPattern={editPantCustomPattern}
              onChangeCustomPattern={setEditPantCustomPattern}
              quantity={1}
              onChangeQuantity={() => {}}
              allowHistoricalFields={false}
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
            shirtPattern={lm.shirtPattern || ''}
            shirtPatterns={lm.shirtPatterns || []}
            shirtCustomPattern={lm.shirtCustomPattern || ''}
            pantPattern={lm.pantPattern || ''}
            pantPatterns={lm.pantPatterns || []}
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
          <>
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
                  {displayedOrders.map((o) => (
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

            <DataTablePagination
              currentPage={ordersCurrentPage}
              totalPages={ordersTotalPages}
              totalRecords={ordersTotalRecords}
              pageSize={ordersPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setOrdersPage(newPage)}
              onPageSizeChange={(newSize) => {
                const newTotalPages = Math.ceil(ordersTotalRecords / newSize) || 1;
                if (ordersCurrentPage > newTotalPages) {
                  setOrdersPage(1);
                }
                setOrdersPageSize(newSize);
              }}
            />
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      <CustomerModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        customerToEdit={customer}
        onSaved={() => fetchCustomerData()}
      />

      {/* Delete / Archive Customer Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title={deleteNeedsArchive ? 'Archive Customer' : 'Delete Customer'}
        message={`Are you sure you want to delete customer '${customer?.name}'? This action may affect orders associated with this customer.`}
        confirmText={deleteNeedsArchive ? 'Archive Customer' : 'Delete Customer'}
        cancelText="Cancel"
        danger={!deleteNeedsArchive}
        confirmVariant={deleteNeedsArchive ? 'warning' : 'danger'}
        loading={deleting}
        error={deleteError}
      >
        {customer && (
          <div
            style={{
              backgroundColor: '#f8f7f2',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '0.88rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Customer Name:</span>
              <strong style={{ fontWeight: 700 }}>{customer.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Mobile Number:</span>
              <strong style={{ fontWeight: 600 }}>{customer.mobileNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#142d4e' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Total Orders:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: orders.length > 0 ? '#b45309' : '#15803d',
                }}
              >
                {orders.length} order(s)
              </span>
            </div>

            {deleteNeedsArchive && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}
              >
                This customer has {orders.length} historical order(s). To preserve order records, invoices, and measurement snapshots, this customer will be safely archived rather than permanently deleted.
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};
