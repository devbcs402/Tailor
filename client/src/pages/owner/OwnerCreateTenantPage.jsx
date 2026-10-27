import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Copy,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ownerApi } from '../../api/ownerApi';
import { useToast } from '../../context/ToastContext';

export const OwnerCreateTenantPage = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

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

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, adminPassword: pwd }));
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBiz = formData.businessName.trim();
    const cleanOwner = formData.ownerName.trim();
    const cleanEmail = formData.email.toLowerCase().trim();
    const cleanMobile = String(formData.mobileNumber).replace(/\D/g, '').trim();

    if (!cleanBiz || !cleanOwner || !cleanEmail || !cleanMobile) {
      setError('Business name, owner name, email, and mobile number are required.');
      return;
    }

    if (cleanMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (formData.adminPassword && formData.adminPassword.trim().length < 8) {
      setError('Password must be at least 8 characters long.');
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

      if (res?.success && res?.data) {
        toastSuccess(`Tenant "${cleanBiz}" onboarded successfully!`);
        setCreatedResult(res.data);
      } else {
        setError(res?.message || 'Failed to onboard tenant');
      }
    } catch (err) {
      console.error('Tenant onboarding failed:', err);
      setError(err.message || 'Failed to onboard tenant. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const { tenant, adminUser } = createdResult;
    const text = `=== TAILOR MANAGEMENT ONBOARDING DETAILS ===\nStudio: ${tenant.businessName}\nTenant Code: ${tenant.tenantCode}\nPortal URL: ${window.location.origin}/login\nAdministrator Email: ${adminUser.email}\nInitial Password: ${adminUser.initialPassword}\n============================================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Preview code generator
  const previewCode = (formData.businessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'TAILR') + '-XXXX';

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/owner/tenants')}
          className="btn btn-outline"
          style={{ padding: '8px 12px', backgroundColor: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Tenants
        </button>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <Link to="/owner/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Platform Owner</Link> /{' '}
            <Link to="/owner/tenants" style={{ color: '#64748b', textDecoration: 'none' }}>Tenants</Link> / Onboard
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0b1f3a', margin: '2px 0 0' }}>
            Onboard New Tailor Studio
          </h1>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            marginBottom: '24px',
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

      {/* Success Modal / Card if Created */}
      {createdResult ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #bbf7d0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            padding: '36px',
            maxWidth: '640px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f3a', margin: 0 }}>
            {createdResult.tenant.businessName} Successfully Onboarded!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
            The tenant account is active, starter garment patterns have been provisioned, and the initial administrator account is ready.
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              margin: '24px 0',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Tenant Code:</span>
              <strong style={{ fontFamily: 'monospace', color: '#0b1f3a', fontSize: '1rem' }}>{createdResult.tenant.tenantCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Portal URL:</span>
              <span style={{ color: '#2563eb', fontWeight: 500 }}>{window.location.origin}/login</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Admin Login Email:</span>
              <strong style={{ color: '#0b1f3a' }}>{createdResult.adminUser.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Initial Password:</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: '#fef08a',
                  color: '#854d0e',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                {createdResult.adminUser.initialPassword}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyCredentials}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: copied ? '#f0fdf4' : '#ffffff',
                borderColor: copied ? '#86efac' : '#cbd5e1',
                color: copied ? '#15803d' : '#334155',
                fontWeight: 600,
              }}
            >
              <Copy size={16} /> {copied ? 'Copied to Clipboard!' : 'Copy Onboarding Details'}
            </button>

            <Link
              to={`/owner/tenants/${createdResult.tenant._id}`}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#0b1f3a',
                color: '#d4af37',
                borderColor: '#d4af37',
                textDecoration: 'none',
              }}
            >
              View Tenant Profile &rarr;
            </Link>

            <button
              onClick={() => {
                setCreatedResult(null);
                setFormData({
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
              }}
              className="btn btn-outline"
            >
              Onboard Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Left Column: Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Business Profile */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <Building2 size={20} color="#0b1f3a" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    1. Business Profile & Ownership
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Tailoring Business Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Classic Tailors Studio"
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
                      Business Owner / Principal Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Sharma"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="admin@business.com"
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
                        placeholder="9825012345"
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
              </div>

              {/* Physical Location */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <MapPin size={20} color="#0b1f3a" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    2. Physical Studio Address
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
                      placeholder="Shop No. 12, Heritage Market, Station Road"
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Ahmedabad"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
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
                        placeholder="Gujarat"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
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
                        placeholder="380001"
                        maxLength="6"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Account Security */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <Lock size={20} color="#0b1f3a" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    3. Initial Administrator Access
                  </h2>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#334155' }}>
                      Initial Admin Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d4af37',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={14} /> Auto-Generate
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleChange}
                      placeholder="Leave blank for secure auto-generated password"
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.92rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    If left blank, a secure initial password will be provisioned and shown upon completion.
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Administrative Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Subscription tier, reference, or internal owner notes..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Preview & Provisioning Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: '#0b1f3a',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(11, 31, 58, 0.25)',
                  border: '1.5px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d4af37', fontWeight: 700, marginBottom: '6px' }}>
                  Live Tenant Preview
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                  {formData.businessName.trim() || 'Your Tailor Studio'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#d4af37',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                    }}
                  >
                    Code: {previewCode}
                  </span>
                  <span
                    style={{
                      backgroundColor: 'rgba(22, 163, 74, 0.2)',
                      color: '#4ade80',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                    }}
                  >
                    Active on Provision
                  </span>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Owner:</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{formData.ownerName.trim() || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Login Email:</span>
                    <span style={{ color: '#ffffff' }}>{formData.email.trim() || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Phone:</span>
                    <span style={{ color: '#ffffff' }}>{formData.mobileNumber.trim() || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>City / State:</span>
                    <span style={{ color: '#ffffff' }}>{formData.city || formData.state ? `${formData.city}${formData.state ? `, ${formData.state}` : ''}` : '—'}</span>
                  </div>
                </div>
              </div>

              {/* What Happens Next Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <HelpCircle size={18} color="#0b1f3a" />
                  <div style={{ fontWeight: 700, color: '#0b1f3a', fontSize: '0.95rem' }}>Automated Onboarding Actions:</div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: '#475569', lineHeight: 1.6 }}>
                  <li>Generates an immutable, unique tenant database document.</li>
                  <li>Initializes isolated sequence generator for order numbering.</li>
                  <li>Seeds standard shirt and pant styling patterns.</li>
                  <li>Provisions the first administrator account with tenant membership.</li>
                  <li>Records an entry in the platform audit log.</li>
                </ul>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/owner/tenants')}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    padding: '12px',
                    backgroundColor: '#0b1f3a',
                    color: '#d4af37',
                    borderColor: '#d4af37',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(11, 31, 58, 0.25)',
                  }}
                >
                  {loading ? 'Provisioning...' : 'Onboard Tailor Studio'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
export default OwnerCreateTenantPage;
