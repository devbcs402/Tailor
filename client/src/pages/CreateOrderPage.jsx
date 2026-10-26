import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Calendar,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import { CustomerSelector } from '../components/customers/CustomerSelector';
import { ShirtMeasurements } from '../components/orders/ShirtMeasurements';
import { PantMeasurements } from '../components/orders/PantMeasurements';
import { ordersApi } from '../api/ordersApi';
import { useToast } from '../context/ToastContext';
import { OrderPrintSlip } from '../components/orders/OrderPrintSlip';

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  // Mode: 'existing' | 'new'
  const [customerMode, setCustomerMode] = useState('existing');

  // Selected existing customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // New customer form fields
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    notes: '',
  });

  // Save updated measurements to customer profile? (Checked by default for new forms)
  const [saveAsLatestMeasurements, setSaveAsLatestMeasurements] = useState(true);

  // Shirt State
  const [shirtMeasurements, setShirtMeasurements] = useState({});
  const [shirtPatterns, setShirtPatterns] = useState([]);
  const [shirtCustomPattern, setShirtCustomPattern] = useState('');
  const [shirtQuantity, setShirtQuantity] = useState(1);

  // Pant State
  const [pantMeasurements, setPantMeasurements] = useState({});
  const [pantPatterns, setPantPatterns] = useState([]);
  const [pantCustomPattern, setPantCustomPattern] = useState('');
  const [pantQuantity, setPantQuantity] = useState(1);

  // Order Details State
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

  const [orderDate, setOrderDate] = useState(todayStr);
  const [deadline, setDeadline] = useState(nextWeek);
  const [deliveryTime, setDeliveryTime] = useState('Evening 6:00 PM');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [savedOrder, setSavedOrder] = useState(null);

  // If navigated here with a pre-selected customer in location.state
  useEffect(() => {
    if (location.state?.preselectedCustomer) {
      handleSelectCustomer(location.state.preselectedCustomer);
    }
  }, [location.state]);

  // When an existing customer is selected, pre-fill measurements ONLY if Qty is > 0
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    if (customer.latestMeasurements) {
      const latest = customer.latestMeasurements;
      const sQty = parseInt(shirtQuantity, 10);
      if (!isNaN(sQty) && sQty > 0) {
        setShirtMeasurements(latest.shirt ? { ...latest.shirt } : {});
        const sPatterns = Array.isArray(latest.shirtPatterns) && latest.shirtPatterns.length > 0
          ? latest.shirtPatterns
          : (latest.shirtPattern ? [latest.shirtPattern] : []);
        setShirtPatterns(sPatterns);
        setShirtCustomPattern(latest.shirtCustomPattern || '');
      } else {
        setShirtMeasurements({});
      }

      const pQty = parseInt(pantQuantity, 10);
      if (!isNaN(pQty) && pQty > 0) {
        setPantMeasurements(latest.pant ? { ...latest.pant } : {});
        const pPatterns = Array.isArray(latest.pantPatterns) && latest.pantPatterns.length > 0
          ? latest.pantPatterns
          : (latest.pantPattern ? [latest.pantPattern] : []);
        setPantPatterns(pPatterns);
        setPantCustomPattern(latest.pantCustomPattern || '');
      } else {
        setPantMeasurements({});
      }
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setShirtMeasurements({});
    setShirtPatterns([]);
    setShirtCustomPattern('');
    setPantMeasurements({});
    setPantPatterns([]);
    setPantCustomPattern('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // 1. Customer Validations
    if (customerMode === 'existing' && !selectedCustomer) {
      setValidationError('Please select an existing customer or switch to "New Customer".');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (customerMode === 'new') {
      if (!newCustomer.name.trim() || newCustomer.name.trim().length < 2) {
        setValidationError('Please enter a valid customer name (at least 2 characters).');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const digitsOnly = newCustomer.mobileNumber.replace(/\D/g, '');
      if (!newCustomer.mobileNumber.trim() || digitsOnly.length !== 10) {
        setValidationError('Please enter a valid 10-digit mobile number.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // 2. Schedule Validations
    if (!deadline) {
      setValidationError('Delivery deadline date is required.');
      return;
    }

    if (new Date(deadline) < new Date(orderDate)) {
      setValidationError('Delivery deadline cannot be earlier than the order date.');
      return;
    }

    // 3. Garment Quantity Validations
    const sQty = parseInt(shirtQuantity, 10) || 0;
    const pQty = parseInt(pantQuantity, 10) || 0;

    if (sQty < 0 || pQty < 0) {
      setValidationError('Garment quantities cannot be negative.');
      return;
    }

    if (sQty === 0 && pQty === 0) {
      setValidationError('Please specify at least 1 shirt or 1 pant quantity.');
      return;
    }

    // 4. Numeric Measurement Validations for positive garment quantities
    if (sQty > 0) {
      for (const [key, val] of Object.entries(shirtMeasurements)) {
        if (key !== 'notes' && val) {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) {
            setValidationError(`Shirt measurement for "${key}" must be a valid positive number.`);
            return;
          }
        }
      }
    }

    if (pQty > 0) {
      for (const [key, val] of Object.entries(pantMeasurements)) {
        if (key !== 'notes' && val) {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) {
            setValidationError(`Pant measurement for "${key}" must be a valid positive number.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        isNewCustomer: customerMode === 'new',
        customerId: selectedCustomer?._id,
        customerDetails: customerMode === 'new' ? {
          ...newCustomer,
          name: newCustomer.name.trim(),
          mobileNumber: newCustomer.mobileNumber.replace(/\D/g, ''),
        } : undefined,
        orderDate,
        deadline,
        deliveryTime,
        shirt: {
          quantity: sQty,
          patterns: sQty > 0 ? shirtPatterns : [],
          pattern: sQty > 0 ? shirtPatterns.join(', ') : '',
          customPattern: sQty > 0 ? shirtCustomPattern : '',
          measurements: sQty > 0 ? shirtMeasurements : {},
        },
        pant: {
          quantity: pQty,
          patterns: pQty > 0 ? pantPatterns : [],
          pattern: pQty > 0 ? pantPatterns.join(', ') : '',
          customPattern: pQty > 0 ? pantCustomPattern : '',
          measurements: pQty > 0 ? pantMeasurements : {},
        },
        specialInstructions,
        pricing: {
          shirtPrice: 0,
          pantPrice: 0,
          total: 0,
          advancePaid: 0,
          balanceDue: 0,
        },
        saveAsLatestMeasurements: customerMode === 'existing' ? !!saveAsLatestMeasurements : true,
      };

      const res = await ordersApi.createOrder(payload);
      success(`Order #${res.data.orderNumber} created successfully!`);
      setSavedOrder(res.data);
    } catch (err) {
      setValidationError(err.message || 'Error saving order');
      toastError(err.message || 'Error saving order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: Order Number Indicator */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1f3a 0%, #142d4e 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.84rem', color: '#c7d2fe', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Order Number
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d4af37', marginTop: '2px' }}>
            {savedOrder ? savedOrder.orderNumber : 'Will be generated automatically upon saving'}
          </div>
        </div>
      </div>

      {validationError && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.94rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Customer Details */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={20} color="var(--primary)" />
              <span>Section 1 — Customer Details</span>
            </div>

            {/* Mutually Exclusive Choices: Existing vs New Customer */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCustomerMode('existing')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: customerMode === 'existing' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  backgroundColor: customerMode === 'existing' ? 'var(--accent-gold-light)' : '#ffffff',
                  color: customerMode === 'existing' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {customerMode === 'existing' ? <CheckSquare size={16} color="var(--accent-gold)" /> : <Square size={16} />}
                Existing Customer
              </button>

              <button
                type="button"
                onClick={() => setCustomerMode('new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: customerMode === 'new' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  backgroundColor: customerMode === 'new' ? 'var(--accent-gold-light)' : '#ffffff',
                  color: customerMode === 'new' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {customerMode === 'new' ? <CheckSquare size={16} color="var(--accent-gold)" /> : <Square size={16} />}
                New Customer
              </button>
            </div>
          </div>

          {/* Mode A: Existing Customer Selector */}
          {customerMode === 'existing' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <CustomerSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={handleSelectCustomer}
                  onClearCustomer={handleClearCustomer}
                />
              </div>

              {selectedCustomer && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    marginTop: '12px',
                  }}
                >
                  <input
                    type="checkbox"
                    id="saveLatest"
                    checked={saveAsLatestMeasurements}
                    onChange={(e) => setSaveAsLatestMeasurements(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="saveLatest" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                    Save updated measurements to customer's permanent profile
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Mode B: New Customer Details Form */}
          {customerMode === 'new' && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Full Customer Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ramesh Patel"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mobile Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={newCustomer.mobileNumber}
                  onChange={(e) => setNewCustomer({ ...newCustomer, mobileNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Street, locality, city"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Notes (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Fitting preferences, references..."
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Shirt Measurements */}
        <ShirtMeasurements
          measurements={shirtMeasurements}
          onChangeMeasurements={setShirtMeasurements}
          selectedPatterns={shirtPatterns}
          onChangeSelectedPatterns={setShirtPatterns}
          customPattern={shirtCustomPattern}
          onChangeCustomPattern={setShirtCustomPattern}
          quantity={shirtQuantity}
          onChangeQuantity={setShirtQuantity}
        />

        {/* Section 3: Pant Measurements */}
        <PantMeasurements
          measurements={pantMeasurements}
          onChangeMeasurements={setPantMeasurements}
          selectedPatterns={pantPatterns}
          onChangeSelectedPatterns={setPantPatterns}
          customPattern={pantCustomPattern}
          onChangeCustomPattern={setPantCustomPattern}
          quantity={pantQuantity}
          onChangeQuantity={setPantQuantity}
        />

        {/* Section 4: Order Schedule & Instructions */}
        <div className="card" style={{ borderTop: '4px solid var(--accent-gold)' }}>
          <div className="card-header">
            <div className="card-title">
              <Calendar size={20} color="var(--accent-gold)" />
              <span>Section 4 — Order Schedule & Instructions</span>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Order Date:</label>
              <input
                type="date"
                className="form-control"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Delivery Deadline <span className="required">*</span>:
              </label>
              <input
                type="date"
                className="form-control"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                style={{ fontWeight: 700, borderColor: 'var(--accent-gold)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Time:</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Evening 6:00 PM"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Special Instructions & Master Notes:</label>
            <textarea
              className="form-textarea"
              placeholder="Special tailoring notes, event deadline, monogram, stitching preferences..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
            />
          </div>

          {/* Final Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="btn btn-outline"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
              style={{ minWidth: '220px' }}
            >
              <Save size={20} />
              {submitting ? 'Saving Order...' : 'Save Order'}
            </button>
          </div>
        </div>
      </form>

      {/* Success Print Receipt Modal */}
      {savedOrder && (
        <OrderPrintSlip
          order={savedOrder}
          onClose={() => {
            setSavedOrder(null);
            navigate(`/orders/${savedOrder._id}`);
          }}
        />
      )}
    </div>
  );
};
