import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ChangePasswordPage = () => {
  const { user, isAuthenticated, loading: authLoading, changePassword, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Authentication guards
  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is already verified and does not need to change password, redirect to dashboard
  if (!user?.mustChangePassword) {
    if (user?.role === 'platform_owner') {
      return <Navigate to="/owner/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Password rules validation
  const rules = {
    minLength: newPassword.length >= 12,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
    differentFromCurrent: currentPassword.length > 0 ? newPassword !== currentPassword : true,
  };

  const isFormValid =
    currentPassword.trim().length > 0 &&
    rules.minLength &&
    rules.hasUpper &&
    rules.hasLower &&
    rules.hasNumber &&
    rules.passwordsMatch &&
    rules.differentFromCurrent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword.trim()) {
      setError('Please enter your initial or current password.');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password cannot be identical to your initial or current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (!rules.hasUpper || !rules.hasLower || !rules.hasNumber) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      success('Password updated successfully! Welcome to your tailoring dashboard.');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1f3a 0%, #142d4e 100%)',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '40px 36px',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          background: 'rgba(255, 255, 255, 0.99)',
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #142d4e, #0b1f3a)',
              border: '2px solid #d4af37',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
              marginBottom: '16px',
            }}
          >
            <KeyRound size={32} color="#d4af37" />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#b45309',
              backgroundColor: '#fef3c7',
              padding: '4px 12px',
              borderRadius: '12px',
              marginBottom: '10px',
            }}
          >
            <AlertTriangle size={13} />
            Mandatory First-Login Action
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0b1f3a', margin: '0 0 6px 0' }}>
            Set Your New Password
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.45 }}>
            You are signing in with temporary credentials for{' '}
            <strong style={{ color: '#0b1f3a' }}>{user?.shopName || 'your tailor studio'}</strong>. To secure your account and business records, please establish a new permanent password.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <XCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Current / Initial Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Initial / Temporary Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter the password provided by platform owner"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              New Permanent Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password Validation Checklist */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Password Requirements:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.minLength ? '#16a34a' : '#64748b' }}>
                {rules.minLength ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                At least 12 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.hasUpper ? '#16a34a' : '#64748b' }}>
                {rules.hasUpper ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                Uppercase letter (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.hasLower ? '#16a34a' : '#64748b' }}>
                {rules.hasLower ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                Lowercase letter (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.hasNumber ? '#16a34a' : '#64748b' }}>
                {rules.hasNumber ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                At least one number (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.passwordsMatch ? '#16a34a' : '#64748b' }}>
                {rules.passwordsMatch ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                Passwords match
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rules.differentFromCurrent ? '#16a34a' : '#dc2626' }}>
                {rules.differentFromCurrent ? <CheckCircle2 size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                Different from initial
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isFormValid ? '#0b1f3a' : '#94a3b8',
                color: isFormValid ? '#d4af37' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isFormValid ? '0 4px 14px rgba(11, 31, 58, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                'Securing Account...'
              ) : (
                <>
                  Update Password & Enter Dashboard <ArrowRight size={17} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
              }}
            >
              <LogOut size={14} />
              Sign out and return to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
