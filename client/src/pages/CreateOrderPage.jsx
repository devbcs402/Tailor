import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowLeft,
  Edit,
  RotateCcw,
  Sparkles,
  Scissors,
  Check,
  FileText,
} from 'lucide-react';
import { CustomerSelector } from '../components/customers/CustomerSelector';
import { ShirtMeasurements } from '../components/orders/ShirtMeasurements';
import { PantMeasurements } from '../components/orders/PantMeasurements';
import { ordersApi } from '../api/ordersApi';
import { customersApi } from '../api/customersApi';
import { useToast } from '../context/ToastContext';
import { OrderPrintSlip } from '../components/orders/OrderPrintSlip';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { getFieldValue } from '../utils/measurementLabels';
import { formatDate } from '../utils/dateUtils';
import { useTenantMeasurements } from '../hooks/useTenantMeasurements';

// Helper to determine whether a customer has saved measurements in their profile
export const checkHasCustomerMeasurements = (customer) => {
  if (!customer || !customer.latestMeasurements) return false;
  const lm = customer.latestMeasurements;
  const shirtHas =
    lm.shirt &&
    Object.entries(lm.shirt).some(
      ([k, v]) => k !== '_id' && k !== 'notes' && String(v || '').trim().length > 0
    );
  const pantHas =
    lm.pant &&
    Object.entries(lm.pant).some(
      ([k, v]) => k !== '_id' && k !== 'notes' && String(v || '').trim().length > 0
    );
  return Boolean(shirtHas || pantHas);
};

export const CreateOrderPage = ({ isEdit: isEditProp }) => {
  const { id } = useParams();
  const isEditing = Boolean(id || isEditProp);
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  // Loading & error states for edit mode
  const [orderLoading, setOrderLoading] = useState(isEditing);
  const [orderLoadError, setOrderLoadError] = useState('');
  const [originalOrder, setOriginalOrder] = useState(null);

  // Tenant dynamic measurement definitions
  const { shirtDefinitions, pantDefinitions } = useTenantMeasurements();

  // Customer Mode: 'existing' | 'new'
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

  // Customer measurement choice: 'use_existing' | 'edit_measurements' | 'add_new'
  const [measurementChoice, setMeasurementChoice] = useState('use_existing');

  // Source of current measurements displayed in the form
  // 'order_snapshot' (current order) | 'customer_default' (customer's saved profile) | 'custom' (new/edited)
  const [measurementSource, setMeasurementSource] = useState(isEditing ? 'order_snapshot' : 'customer_default');

  // Save updated measurements to customer profile?
  // New orders default to true; editing orders default to false so customer profile is not accidentally overwritten!
  const [saveAsDefaultMeasurements, setSaveAsDefaultMeasurements] = useState(!isEditing);

  // Shirt State
  const [shirtMeasurements, setShirtMeasurements] = useState({});
  const [shirtPatterns, setShirtPatterns] = useState([]);
  const [shirtCustomPattern, setShirtCustomPattern] = useState('');
  const [shirtQuantity, setShirtQuantity] = useState(1);
  const [shirtErrors, setShirtErrors] = useState({});

  // Pant State
  const [pantMeasurements, setPantMeasurements] = useState({});
  const [pantPatterns, setPantPatterns] = useState([]);
  const [pantCustomPattern, setPantCustomPattern] = useState('');
  const [pantQuantity, setPantQuantity] = useState(1);
  const [pantErrors, setPantErrors] = useState({});

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

  // -------------------------------------------------------------
  // Load Existing Order in Edit Mode
  // -------------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    const loadOrderData = async () => {
      setOrderLoading(true);
      setOrderLoadError('');
      try {
        const res = await ordersApi.getOrderById(id);
        const ord = res.data;
        if (!ord) {
          setOrderLoadError('Order not found or does not exist.');
          return;
        }

        setOriginalOrder(ord);

        // Populate order details
        setDeadline(ord.deadline ? ord.deadline.split('T')[0] : '');
        setOrderDate(ord.orderDate ? ord.orderDate.split('T')[0] : todayStr);
        setDeliveryTime(ord.deliveryTime || '');
        setSpecialInstructions(ord.specialInstructions || '');

        // Populate shirt specifications from order snapshot
        setShirtQuantity(ord.shirt?.quantity ?? 0);
        const sPatterns = Array.isArray(ord.shirt?.patterns) && ord.shirt.patterns.length > 0
          ? ord.shirt.patterns
          : (ord.shirt?.pattern ? ord.shirt.pattern.split(',').map((p) => p.trim()).filter(Boolean) : []);
        setShirtPatterns(sPatterns);
        setShirtCustomPattern(ord.shirt?.customPattern || '');
        const sMeasurements = { ...(ord.shirt?.measurements || {}) };
        if (Array.isArray(ord.measurementSnapshot?.shirt)) {
          ord.measurementSnapshot.shirt.forEach((item) => {
            if (item.fieldKey && sMeasurements[item.fieldKey] === undefined && item.value !== undefined) {
              sMeasurements[item.fieldKey] = item.value;
            }
          });
        }
        setShirtMeasurements(sMeasurements);

        // Populate pant specifications from order snapshot
        setPantQuantity(ord.pant?.quantity ?? 0);
        const pPatterns = Array.isArray(ord.pant?.patterns) && ord.pant.patterns.length > 0
          ? ord.pant.patterns
          : (ord.pant?.pattern ? ord.pant.pattern.split(',').map((p) => p.trim()).filter(Boolean) : []);
        setPantPatterns(pPatterns);
        setPantCustomPattern(ord.pant?.customPattern || '');

        const pMeasurements = { ...(ord.pant?.measurements || {}) };
        if (Array.isArray(ord.measurementSnapshot?.pant)) {
          ord.measurementSnapshot.pant.forEach((item) => {
            if (item.fieldKey && pMeasurements[item.fieldKey] === undefined && item.value !== undefined) {
              pMeasurements[item.fieldKey] = item.value;
            }
          });
        }
        setPantMeasurements(pMeasurements);

        // Set customer
        if (ord.customer) {
          let custObj = ord.customer;
          const custId = typeof custObj === 'object' && custObj._id ? custObj._id : custObj;
          try {
            const custRes = await customersApi.getCustomerById(custId);
            if (custRes.data) custObj = custRes.data;
          } catch (_) {}
          setSelectedCustomer(custObj);
          setCustomerMode('existing');
        } else if (ord.customerSnapshot) {
          setSelectedCustomer({
            name: ord.customerSnapshot.name,
            mobileNumber: ord.customerSnapshot.mobileNumber,
            address: ord.customerSnapshot.address || '',
          });
        }

        setMeasurementSource('order_snapshot');
        setSaveAsDefaultMeasurements(false); // Default to false when editing!
      } catch (err) {
        setOrderLoadError(err.message || 'Failed to load order information.');
      } finally {
        setOrderLoading(false);
      }
    };

    loadOrderData();
  }, [id]);

  // Preselected customer from navigation state (create mode)
  useEffect(() => {
    if (!isEditing && location.state?.preselectedCustomer) {
      handleSelectCustomer(location.state.preselectedCustomer);
    }
  }, [location.state, isEditing]);

  // -------------------------------------------------------------
  // Measurement Loading Helpers
  // -------------------------------------------------------------
  // Helper to map saved customer measurements strictly to active definitions
  // Ensures historical fields (e.g. deactivated Length) never leak into new orders
  const mapSavedMeasurementsToDefinitions = (savedObj, definitions) => {
    if (!savedObj || !Array.isArray(definitions) || definitions.length === 0) return {};
    const mapped = {};
    for (const def of definitions) {
      const val = getFieldValue(savedObj, def.fieldKey);
      if (val !== undefined && val !== null && String(val).trim().length > 0) {
        mapped[def.fieldKey] = String(val).trim();
      }
    }
    return mapped;
  };

  const loadCustomerSavedMeasurements = (customer) => {
    const lm = customer?.latestMeasurements || {};

    if (lm.shirt) {
      const mappedShirt = isEditing
        ? { ...lm.shirt }
        : mapSavedMeasurementsToDefinitions(lm.shirt, shirtDefinitions);
      setShirtMeasurements(mappedShirt);
      const sPatterns = Array.isArray(lm.shirtPatterns) && lm.shirtPatterns.length > 0
        ? lm.shirtPatterns
        : (lm.shirtPattern ? [lm.shirtPattern] : []);
      setShirtPatterns(sPatterns);
      setShirtCustomPattern(lm.shirtCustomPattern || '');
    }

    if (lm.pant) {
      const mappedPant = isEditing
        ? { ...lm.pant }
        : mapSavedMeasurementsToDefinitions(lm.pant, pantDefinitions);
      setPantMeasurements(mappedPant);
      const pPatterns = Array.isArray(lm.pantPatterns) && lm.pantPatterns.length > 0
        ? lm.pantPatterns
        : (lm.pantPattern ? [lm.pantPattern] : []);
      setPantPatterns(pPatterns);
      setPantCustomPattern(lm.pantCustomPattern || '');
    }

    setMeasurementSource('customer_default');
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShirtErrors({});
    setPantErrors({});
    setValidationError('');

    // For new orders, keep inputs clean and default to fresh input unless user explicitly reuses measurements
    if (!isEditing) {
      setMeasurementChoice('add_new');
      setMeasurementSource('custom');
      setShirtMeasurements({});
      setPantMeasurements({});
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setShirtMeasurements({});
    setShirtPatterns([]);
    setShirtCustomPattern('');
    setShirtErrors({});
    setPantMeasurements({});
    setPantPatterns([]);
    setPantCustomPattern('');
    setPantErrors({});
    setMeasurementChoice('add_new');
    setMeasurementSource('custom');
  };

  // Measurement selection choice change (Use Existing | Edit | Add New)
  const handleMeasurementChoiceChange = (choice) => {
    setMeasurementChoice(choice);
    setShirtErrors({});
    setPantErrors({});

    if (choice === 'use_existing' || choice === 'edit_measurements') {
      loadCustomerSavedMeasurements(selectedCustomer);
      if (choice === 'edit_measurements') {
        setMeasurementSource('custom');
      }
    } else if (choice === 'add_new') {
      setShirtMeasurements({});
      setPantMeasurements({});
      setMeasurementSource('custom');
    }
  };

  // In Edit mode: reload the order's original snapshot
  const handleResetToOrderSnapshot = () => {
    if (!originalOrder) return;
    setShirtMeasurements(originalOrder.shirt?.measurements ? { ...originalOrder.shirt.measurements } : {});
    setPantMeasurements(originalOrder.pant?.measurements ? { ...originalOrder.pant.measurements } : {});
    setMeasurementSource('order_snapshot');
    success('Reloaded original order measurement snapshot');
  };

  // In Edit mode: load the customer's latest default measurements
  const handleLoadCustomerDefaults = () => {
    if (!selectedCustomer) return;
    loadCustomerSavedMeasurements(selectedCustomer);
    success("Loaded customer's latest default profile measurements");
  };

  // -------------------------------------------------------------
  // Garment Quantity Handlers
  // -------------------------------------------------------------
  const handleShirtQuantityChange = (val) => {
    setShirtQuantity(val);
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setShirtMeasurements({});
      setShirtErrors({});
    }
  };

  const handlePantQuantityChange = (val) => {
    setPantQuantity(val);
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setPantMeasurements({});
      setPantErrors({});
    }
  };

  const handleClearShirtError = (key) => {
    setShirtErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleClearPantError = (key) => {
    setPantErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // -------------------------------------------------------------
  // Form Submission
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
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
      const rawMobile = (newCustomer.mobileNumber || '').trim();
      if (!rawMobile || !/^\d{10}$/.test(rawMobile)) {
        setValidationError('Mobile number must be exactly 10 digits.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // 2. Schedule Validations
    if (!deadline) {
      setValidationError('Please select a valid delivery deadline.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setValidationError('Please select at least 1 Shirt or 1 Pant for this order.');
      return;
    }

    // 4. Quantity-based Dynamic Measurement Validations
    const newShirtErrors = {};
    const newPantErrors = {};

    if (sQty > 0) {
      if (shirtDefinitions && shirtDefinitions.length > 0) {
        for (const def of shirtDefinitions) {
          if (def.isActive && def.isRequired) {
            const val = getFieldValue(shirtMeasurements, def.fieldKey);
            if (val === undefined || val === null || String(val).trim() === '') {
              newShirtErrors[def.fieldKey] = 'Required';
            }
          }
        }
      }
      for (const [key, val] of Object.entries(shirtMeasurements)) {
        if (key !== 'notes' && key !== '_id' && !key.startsWith('$') && !key.startsWith('_') && val !== undefined && val !== null && String(val).trim() !== '') {
          const def = (shirtDefinitions || []).find((d) => d.fieldKey === key);
          if (!def || def.fieldType === 'number') {
            const num = parseFloat(val);
            if (isNaN(num) || num <= 0) {
              newShirtErrors[key] = 'Must be > 0';
            }
          }
        }
      }
    }

    if (pQty > 0) {
      if (pantDefinitions && pantDefinitions.length > 0) {
        for (const def of pantDefinitions) {
          if (def.isActive && def.isRequired) {
            const val = getFieldValue(pantMeasurements, def.fieldKey);
            if (val === undefined || val === null || String(val).trim() === '') {
              newPantErrors[def.fieldKey] = 'Required';
            }
          }
        }
      }
      for (const [key, val] of Object.entries(pantMeasurements)) {
        if (key !== 'notes' && key !== '_id' && !key.startsWith('$') && !key.startsWith('_') && val !== undefined && val !== null && String(val).trim() !== '') {
          const def = (pantDefinitions || []).find((d) => d.fieldKey === key);
          if (!def || def.fieldType === 'number') {
            const num = parseFloat(val);
            if (isNaN(num) || num <= 0) {
              newPantErrors[key] = 'Must be > 0';
            }
          }
        }
      }
    }

    setShirtErrors(newShirtErrors);
    setPantErrors(newPantErrors);

    if (Object.keys(newShirtErrors).length > 0 || Object.keys(newPantErrors).length > 0) {
      const messages = [];
      if (Object.keys(newShirtErrors).length > 0) {
        messages.push(`Please provide all required shirt measurements (${Object.keys(newShirtErrors).join(', ')})`);
      }
      if (Object.keys(newPantErrors).length > 0) {
        messages.push(`Please provide all required pant measurements (${Object.keys(newPantErrors).join(', ')})`);
      }
      setValidationError(messages.join('. '));
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        // --- EDIT EXISTING ORDER WORKFLOW ---
        const updatePayload = {
          customerId: selectedCustomer?._id,
          customerDetails: selectedCustomer ? {
            name: selectedCustomer.name,
            mobileNumber: selectedCustomer.mobileNumber,
            address: selectedCustomer.address || '',
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
          saveAsDefaultMeasurements: Boolean(saveAsDefaultMeasurements),
        };

        const res = await ordersApi.updateOrder(id, updatePayload);
        const updatedOrderNumber = res.data?.orderNumber || originalOrder?.orderNumber || id;
        success(`Order #${updatedOrderNumber} updated successfully!`);
        navigate(`/orders/${id}`);
      } else {
        // --- CREATE NEW ORDER WORKFLOW ---
        const createPayload = {
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
          saveAsDefaultMeasurements: Boolean(saveAsDefaultMeasurements),
          saveAsLatestMeasurements: Boolean(saveAsDefaultMeasurements),
        };

        const res = await ordersApi.createOrder(createPayload);
        success(`Order #${res.data.orderNumber} created successfully!`);
        setSavedOrder(res.data);
      }
    } catch (err) {
      setValidationError(err.message || (isEditing ? 'Error updating order' : 'Error saving order'));
      toastError(err.message || (isEditing ? 'Error updating order' : 'Error saving order'));
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading or error states in edit mode
  if (orderLoading) {
    return <Loading text="Loading order for editing..." />;
  }

  if (orderLoadError) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <ErrorMessage message={orderLoadError} />
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={() => navigate('/orders')} className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const customerHasSaved = checkHasCustomerMeasurements(selectedCustomer);

  // For existing orders, load definition labels and keys from that order's saved snapshot
  // For new orders, use the currently active definitions from Measurement Settings
  const shirtEditDefs = (isEditing && Array.isArray(originalOrder?.measurementSnapshot?.shirt) && originalOrder.measurementSnapshot.shirt.length > 0)
    ? originalOrder.measurementSnapshot.shirt.map((item) => ({
        fieldKey: item.fieldKey,
        displayName: item.displayName || item.fieldKey,
        gujaratiName: item.gujaratiName || '',
        fieldType: item.fieldType || 'number',
        unit: item.unit || '',
        isRequired: false,
      }))
    : shirtDefinitions;

  const pantEditDefs = (isEditing && Array.isArray(originalOrder?.measurementSnapshot?.pant) && originalOrder.measurementSnapshot.pant.length > 0)
    ? originalOrder.measurementSnapshot.pant.map((item) => ({
        fieldKey: item.fieldKey,
        displayName: item.displayName || item.fieldKey,
        gujaratiName: item.gujaratiName || '',
        fieldType: item.fieldType || 'number',
        unit: item.unit || '',
        isRequired: false,
      }))
    : pantDefinitions;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: Order Header & Indicator */}
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate(isEditing ? `/orders/${id}` : '/orders')}
            className="btn btn-outline btn-sm"
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {isEditing ? `Edit Order #${originalOrder?.orderNumber}` : 'Create New Tailor Order'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#cbd5e1' }}>
              {isEditing
                ? `Editing existing order record (ID: ${id}) • Created on ${formatDate(originalOrder?.orderDate || originalOrder?.createdAt)}`
                : 'Customer measurement record, garment specifications, and delivery deadline.'}
            </p>
          </div>
        </div>

        {isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Edit size={14} /> Editing Mode
            </span>
          </div>
        )}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={20} color="#dc2626" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* SECTION 1: Customer Details & Measurement Source */}
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">
              <Users size={20} color="var(--primary)" />
              <span>Section 1 — Customer Information</span>
            </div>

            {/* Toggle New vs Existing (only when creating new order) */}
            {!isEditing && (
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    backgroundColor: customerMode === 'existing' ? '#ffffff' : 'transparent',
                    color: customerMode === 'existing' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: customerMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    setSelectedCustomer(null);
                    setMeasurementChoice('add_new');
                    setMeasurementSource('custom');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    backgroundColor: customerMode === 'new' ? '#ffffff' : 'transparent',
                    color: customerMode === 'new' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: customerMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  New Customer
                </button>
              </div>
            )}
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

              {/* Customer Measurement Selection Workflow (When Customer Has Saved Measurements) */}
              {selectedCustomer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  {customerHasSaved ? (
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Scissors size={16} color="var(--primary)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                            Customer Profile Measurements Available:
                          </span>
                        </div>
                        {isEditing && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Source:</span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                backgroundColor: measurementSource === 'order_snapshot' ? '#e0f2fe' : '#fef3c7',
                                color: measurementSource === 'order_snapshot' ? '#0369a1' : '#92400e',
                              }}
                            >
                              {measurementSource === 'order_snapshot' ? 'Order Snapshot' : "Customer's Latest Default"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 3 Interactive Measurement Options (Use Existing | Edit Measurements | Add New Measurements) */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleMeasurementChoiceChange('use_existing')}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: measurementChoice === 'use_existing' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                            backgroundColor: measurementChoice === 'use_existing' ? '#f0fdf4' : '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                            <CheckSquare size={16} color={measurementChoice === 'use_existing' ? '#16a34a' : '#64748b'} />
                            Use Existing Measurements
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Load customer's saved profile measurements directly into order.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMeasurementChoiceChange('edit_measurements')}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: measurementChoice === 'edit_measurements' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                            backgroundColor: measurementChoice === 'edit_measurements' ? '#eff6ff' : '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                            <Edit size={16} color={measurementChoice === 'edit_measurements' ? '#2563eb' : '#64748b'} />
                            Edit Measurements
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Populate saved measurements and modify values for this order.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMeasurementChoiceChange('add_new')}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: measurementChoice === 'add_new' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                            backgroundColor: measurementChoice === 'add_new' ? '#fffbeb' : '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                            <RotateCcw size={16} color={measurementChoice === 'add_new' ? '#d97706' : '#64748b'} />
                            Add New Measurements
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Open empty measurement form to take fresh measurements.
                          </span>
                        </button>
                      </div>

                      {/* Edit Mode Shortcut Controls */}
                      {isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={handleLoadCustomerDefaults}
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--accent-gold)', color: 'var(--primary)', fontSize: '0.82rem' }}
                          >
                            <Sparkles size={14} color="var(--accent-gold)" /> Use Customer's Latest Saved Measurements
                          </button>
                          <button
                            type="button"
                            onClick={handleResetToOrderSnapshot}
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: '#cbd5e1', color: '#475569', fontSize: '0.82rem' }}
                          >
                            <RotateCcw size={14} /> Restore Original Order Snapshot
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: '8px',
                        color: '#92400e',
                        fontSize: '0.86rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>
                        This customer does not have saved default measurements yet. Enter measurements below and check the option to save them for future orders.
                      </span>
                    </div>
                  )}

                  {/* Checkbox: Save as Customer's Default Measurements */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 16px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="saveDefaultMeasurements"
                      checked={saveAsDefaultMeasurements}
                      onChange={(e) => setSaveAsDefaultMeasurements(e.target.checked)}
                      style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div>
                      <label htmlFor="saveDefaultMeasurements" style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                        Save as Customer's Default Measurements
                      </label>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        {isEditing
                          ? "If checked, this customer's saved profile measurements will also be updated. If unchecked, only this order's snapshot is updated without altering their profile."
                          : "Save these measurements to the customer's permanent profile so they can be reused on future orders."}
                      </div>
                    </div>
                  </div>
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
                  inputMode="numeric"
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={newCustomer.mobileNumber}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewCustomer({ ...newCustomer, mobileNumber: digitsOnly });
                  }}
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

        {/* SECTION 2: Shirt Specifications & Measurements */}
        <ShirtMeasurements
          measurements={shirtMeasurements}
          onChangeMeasurements={setShirtMeasurements}
          selectedPatterns={shirtPatterns}
          onChangeSelectedPatterns={setShirtPatterns}
          customPattern={shirtCustomPattern}
          onChangeCustomPattern={setShirtCustomPattern}
          quantity={shirtQuantity}
          onChangeQuantity={handleShirtQuantityChange}
          errors={shirtErrors}
          onClearError={handleClearShirtError}
          definitions={isEditing ? shirtEditDefs : shirtDefinitions}
          allowHistoricalFields={isEditing}
        />

        {/* SECTION 3: Pant Specifications & Measurements */}
        <PantMeasurements
          measurements={pantMeasurements}
          onChangeMeasurements={setPantMeasurements}
          selectedPatterns={pantPatterns}
          onChangeSelectedPatterns={setPantPatterns}
          customPattern={pantCustomPattern}
          onChangeCustomPattern={setPantCustomPattern}
          quantity={pantQuantity}
          onChangeQuantity={handlePantQuantityChange}
          errors={pantErrors}
          onClearError={handleClearPantError}
          definitions={isEditing ? pantEditDefs : pantDefinitions}
          allowHistoricalFields={isEditing}
        />

        {/* SECTION 4: Order Schedule & Instructions */}
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
              onClick={() => navigate(isEditing ? `/orders/${id}` : '/orders')}
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
              {submitting ? (isEditing ? 'Saving Changes...' : 'Saving Order...') : (isEditing ? 'Save Changes' : 'Save Order')}
            </button>
          </div>
        </div>
      </form>

      {/* Success Print Receipt Modal (Only for new order creation) */}
      {savedOrder && !isEditing && (
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

export default CreateOrderPage;
