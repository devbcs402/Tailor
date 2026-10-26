import React, { useState, useEffect } from 'react';
import { X, User, Save } from 'lucide-react';
import { customersApi } from '../../api/customersApi';
import { useToast } from '../../context/ToastContext';

export const CustomerModal = ({
  isOpen,
  onClose,
  customerToEdit,
  customer,
  onSaved,
  onSuccess,
}) => {
  const activeCustomer = customerToEdit || customer || null;
  const isEditMode = Boolean(activeCustomer && activeCustomer._id);
  const handleSuccess = onSaved || onSuccess;

  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success } = useToast();

  useEffect(() => {
    if (activeCustomer) {
      setFormData({
        name: activeCustomer.name || '',
        mobileNumber: activeCustomer.mobileNumber || '',
        address: activeCustomer.address || '',
        notes: activeCustomer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        mobileNumber: '',
        address: '',
        notes: '',
      });
    }
    setError('');
  }, [activeCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter a valid customer name (at least 2 characters)');
      return;
    }

    const digitsOnly = formData.mobileNumber.replace(/\D/g, '');
    if (!formData.mobileNumber.trim() || digitsOnly.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    const sanitizedData = {
      name: cleanName,
      mobileNumber: digitsOnly,
      address: formData.address ? formData.address.trim() : '',
      notes: formData.notes ? formData.notes.trim() : '',
    };

    setLoading(true);
    try {
      if (isEditMode) {
        const res = await customersApi.updateCustomer(activeCustomer._id, sanitizedData);
        success('Customer details updated successfully');
        if (handleSuccess) handleSuccess(res.data);
      } else {
        const res = await customersApi.createCustomer(sanitizedData);
        success('New customer created successfully');
        if (handleSuccess) handleSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEditMode ? 'Error updating customer' : 'Error creating customer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          className="card-header"
          style={{
            marginBottom: '16px',
            flexShrink: 0,
            paddingBottom: '12px',
          }}
        >
          <div className="card-title" style={{ fontSize: '1.15rem' }}>
            <User size={20} color="var(--primary)" />
            <span>{isEditMode ? 'Edit Customer' : 'Add New Customer'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '0.88rem',
              marginBottom: '16px',
              border: '1px solid #fecaca',
              flexShrink: 0,
            }}
          >
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
            paddingRight: '2px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div className="form-group">
              <label className="form-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Patel"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Mobile Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                className="form-control"
                placeholder="e.g. 9876543210 (10 digits)"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Address <span className="label-sub">(Optional)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Street, Area, City..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Notes <span className="label-sub">(Optional)</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Preferences, fitting notes, reference..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '20px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-light)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Save size={16} />{' '}
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Saving...'
                : isEditMode
                ? 'Update Customer'
                : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
