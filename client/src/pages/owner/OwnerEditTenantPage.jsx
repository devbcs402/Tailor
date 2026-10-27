import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Save,
  MapPin,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { useToast } from '../../context/ToastContext';
import { Loading } from '../../components/common/Loading';

export const OwnerEditTenantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await ownerApi.getTenantById(id);
      if (res?.success && res?.data) {
        const t = res.data;
        setTenant(t);
        setFormData({
          businessName: t.businessName || '',
          ownerName: t.ownerName || '',
          email: t.email || '',
          mobileNumber: t.mobileNumber || '',
          address: t.address || '',
          city: t.city || '',
          state: t.state || '',
          pincode: t.pincode || '',
          notes: t.notes || '',
        });
      } else {
        setError(res?.message || 'Failed to retrieve tenant details');
      }
    } catch (err) {
      console.error('Failed to load tenant for edit:', err);
      setError(err.message || 'Error communicating with platform server');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanBiz = formData.businessName.trim();
    const cleanOwner = formData.ownerName.trim();
    const cleanEmail = formData.email.toLowerCase().trim();
    const cleanMobile = String(formData.mobileNumber).replace(/\D/g, '').trim();

    if (!cleanBiz || !cleanOwner) {
      setError('Business name and owner name are required.');
      return;
    }

    if (cleanMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ownerApi.updateTenant(id, {
        ...formData,
        businessName: cleanBiz,
        ownerName: cleanOwner,
        email: cleanEmail,
        mobileNumber: cleanMobile,
      });

      if (res?.success) {
        toastSuccess(`Tenant "${cleanBiz}" updated successfully!`);
        setSuccessMessage(`Tenant details updated successfully.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setError(res?.message || 'Failed to update tenant');
      }
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || 'Failed to update tenant');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading text="Loading tenant for modification..." fullScreen />;
  }

  if (error && !tenant) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/owner/tenants')}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
        >
          <ArrowLeft size={16} /> Back to Tenants
        </button>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={24} />
          <div>{error || 'Tenant not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`/owner/tenants/${id}`)}
          className="btn btn-outline"
          style={{ padding: '8px 12px', backgroundColor: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Details
        </button>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <Link to="/owner/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Platform Owner</Link> /{' '}
            <Link to="/owner/tenants" style={{ color: '#64748b', textDecoration: 'none' }}>Tenants</Link> /{' '}
            <Link to={`/owner/tenants/${id}`} style={{ color: '#64748b', textDecoration: 'none' }}>{tenant?.businessName}</Link> / Edit
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0b1f3a', margin: '2px 0 0' }}>
            Edit Tenant Information
          </h1>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.92rem',
          }}
        >
          <CheckCircle2 size={18} />
          <div>{successMessage}</div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.92rem',
          }}
        >
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Read-Only System Identity Card */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Tenant Code (Immutable)
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#0b1f3a' }}>
              {tenant?.tenantCode}
            </div>
          </div>
          <div style={{ height: '32px', width: '1px', backgroundColor: '#cbd5e1' }} />
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Account Status
            </div>
            <span
              style={{
                display: 'inline-block',
                marginTop: '2px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: tenant?.status === 'active' ? '#dcfce7' : '#fee2e2',
                color: tenant?.status === 'active' ? '#16a34a' : '#dc2626',
              }}
            >
              {tenant?.status}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Database ID: <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{id}</code>
        </div>
      </div>

      {/* Edit Form Card */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Section 1: Business Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '18px' }}>
              <Building2 size={20} color="#0b1f3a" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                Business Profile Information
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Business Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Owner / Principal Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Mobile Number (10 digits) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  maxLength="10"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '18px' }}>
              <MapPin size={20} color="#0b1f3a" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                Location & Studio Address
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    maxLength="6"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Administrative Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Internal Administrative Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => navigate(`/owner/tenants/${id}`)}
              className="btn btn-outline"
              style={{ padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '10px 24px',
                backgroundColor: '#0b1f3a',
                color: '#d4af37',
                borderColor: '#d4af37',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={16} />
              {submitting ? 'Saving Changes...' : 'Save Tenant Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default OwnerEditTenantPage;
