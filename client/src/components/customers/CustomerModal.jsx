import React, { useState, useEffect } from 'react';
import { X, User, Save } from 'lucide-react';
import { customersApi } from '../../api/customersApi';
import { useToast } from '../../context/ToastContext';

export const CustomerModal = ({ isOpen, onClose, customerToEdit, onSaved }) => {
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
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        mobileNumber: customerToEdit.mobileNumber || '',
        address: customerToEdit.address || '',
        notes: customerToEdit.notes || '',
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
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Mobile number is required');
      return;
    }

    setLoading(true);
    try {
      if (customerToEdit) {
        const res = await customersApi.updateCustomer(customerToEdit._id, formData);
        success('Customer details updated');
        onSaved(res.data);
      } else {
        const res = await customersApi.createCustomer(formData);
        success('New customer created');
        onSaved(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving customer');
    } finally {
      setLoading(false);
    }
  };

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
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}
      >
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div className="card-title">
            <User size={20} color="var(--primary)" />
            {customerToEdit ? 'Edit Customer' : 'Add New Customer'}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address <span className="label-sub">(Optional)</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="Street, Area, City..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes <span className="label-sub">(Optional)</span></label>
            <textarea
              className="form-textarea"
              placeholder="Preferences, fitting notes, reference..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
