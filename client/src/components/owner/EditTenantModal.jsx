import React, { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { useToast } from '../../context/ToastContext';

export const EditTenantModal = ({ isOpen, onClose, tenant, onUpdated }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success } = useToast();

  useEffect(() => {
    if (tenant) {
      setFormData({
        businessName: tenant.businessName || '',
        ownerName: tenant.ownerName || '',
        email: tenant.email || '',
        mobileNumber: tenant.mobileNumber || '',
        address: tenant.address || '',
        city: tenant.city || '',
        state: tenant.state || '',
        pincode: tenant.pincode || '',
        notes: tenant.notes || '',
      });
    }
    setError('');
  }, [tenant, isOpen]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBiz = formData.businessName.trim();
    const cleanOwner = formData.ownerName.trim();
    const cleanMobile = formData.mobileNumber.replace(/\D/g, '').trim();

    if (!cleanBiz || !cleanOwner) {
      setError('Business name and owner name are required');
      return;
    }

    if (cleanMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await ownerApi.updateTenant(tenant._id, {
        ...formData,
        businessName: cleanBiz,
        ownerName: cleanOwner,
        mobileNumber: cleanMobile,
      });

      success(`Tenant "${cleanBiz}" updated successfully`);
      if (onUpdated) onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 31, 58, 0.7)',
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
          maxWidth: '600px',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        <div className="card-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div className="card-title" style={{ fontSize: '1.2rem' }}>
            <Building2 size={22} color="var(--primary)" />
            <span>Edit Tenant Profile ({tenant.tenantCode})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
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

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, paddingRight: '2px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Business Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Owner Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Primary Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mobile Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Studio Address</label>
              <input
                type="text"
                className="form-control"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Administrative Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

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
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
