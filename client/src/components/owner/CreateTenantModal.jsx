import React, { useState } from 'react';
import { X, Building2, CheckCircle2, Copy, Check, Save } from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { useToast } from '../../context/ToastContext';

export const CreateTenantModal = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    adminPassword: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const { success } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBiz = formData.businessName.trim();
    const cleanOwner = formData.ownerName.trim();
    const cleanEmail = formData.email.trim();
    const cleanMobile = formData.mobileNumber.replace(/\D/g, '').trim();

    if (!cleanBiz || !cleanOwner || !cleanEmail) {
      setError('Business name, owner name, and email are required');
      return;
    }

    if (cleanMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await ownerApi.createTenant({
        ...formData,
        businessName: cleanBiz,
        ownerName: cleanOwner,
        email: cleanEmail,
        mobileNumber: cleanMobile,
      });

      success(`Tenant "${cleanBiz}" onboarded successfully!`);
      setCreatedInfo(res.data);
      if (onCreated) onCreated(res.data);
    } catch (err) {
      setError(err.message || 'Failed to onboard tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdInfo) return;
    const text = `Tailoring Business: ${createdInfo.tenant.businessName}\nTenant Code: ${createdInfo.tenant.tenantCode}\nPortal URL: ${window.location.origin}/login\nAdmin Email: ${createdInfo.adminUser.email}\nInitial Password: ${createdInfo.adminUser.initialPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    setCreatedInfo(null);
    onClose();
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
          maxWidth: '620px',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="card-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div className="card-title" style={{ fontSize: '1.2rem' }}>
            <Building2 size={22} color="var(--accent-gold)" />
            <span>{createdInfo ? 'Tenant Onboarded Successfully' : 'Onboard New Tailor Tenant'}</span>
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

        {createdInfo ? (
          /* Credentials Display Step */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#166534' }}>
                  Tenant is Active and Initialized!
                </div>
                <div style={{ fontSize: '0.84rem', color: '#15803d' }}>
                  A unique tenant code and default garment patterns have been provisioned.
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Business Name</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{createdInfo.tenant.businessName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Generated Tenant Code</span>
                <span style={{ fontWeight: 800, color: '#0b1f3a', background: 'rgba(212, 175, 55, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                  {createdInfo.tenant.tenantCode}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Admin Login Email</span>
                <span style={{ fontWeight: 600 }}>{createdInfo.adminUser.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Initial Password</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#b45309' }}>
                  {createdInfo.adminUser.initialPassword}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Login Portal</span>
                <span style={{ fontSize: '0.86rem', color: 'var(--primary)' }}>
                  {window.location.origin}/login
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Input Form Step */
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}
          >
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, paddingRight: '2px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Business / Studio Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Royal Fit Tailors"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Business Owner Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Vikram Sharma"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Admin Login Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. vikram@royaltailors.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
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
                    placeholder="10-digit mobile"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Studio Street Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Shop #, Complex, Market street..."
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
                    placeholder="City"
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
                    placeholder="State"
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
                    placeholder="PIN Code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Initial Password <span className="label-sub">(Optional, defaults to Tailor@2026!)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Leave empty for auto-generated password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Administrative Notes <span className="label-sub">(Optional)</span></label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Onboarding notes, referral source, plan details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Footer */}
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
                <Save size={16} /> {loading ? 'Onboarding...' : 'Create & Onboard Tenant'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
