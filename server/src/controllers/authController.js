import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { AuditLog } from '../models/AuditLog.js';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'super_secret_tailor_management_key_2026_xyz',
    { expiresIn: '30d' }
  );
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Please contact administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Role check: Reject Platform Owner accounts from the standard tailor portal
    if (user.role === 'platform_owner') {
      return res.status(403).json({
        success: false,
        code: 'OWNER_ACCOUNT_RESTRICTED',
        message: 'Platform Owner accounts cannot log in through the tailor portal. Please use the Owner Login at /owner/login.',
      });
    }

    // Tenant check: Tenant users must belong to a valid, active tenant
    if (!user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tailoring business tenant associated with this account.',
      });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Associated tailoring business tenant not found.',
      });
    }

    if (tenant.status === 'inactive' || tenant.status === 'archived' || tenant.status === 'deleting') {
      const isArchived = tenant.status === 'archived';
      const isDeleting = tenant.status === 'deleting';
      return res.status(403).json({
        success: false,
        code: isArchived ? 'TENANT_ARCHIVED' : isDeleting ? 'TENANT_DELETING' : 'TENANT_INACTIVE',
        message: isDeleting
          ? 'This business account is undergoing deletion. Access is revoked.'
          : `Your business account has been ${isArchived ? 'archived' : 'deactivated'}. Please contact platform support.`,
      });
    }

    const tenantData = {
      id: tenant._id,
      businessName: tenant.businessName,
      tenantCode: tenant.tenantCode,
      status: tenant.status,
    };

    const token = generateToken(user._id);

    // Record login in audit log
    try {
      await AuditLog.create({
        actor: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'tenant_login',
        targetTenant: user.tenantId,
        targetTenantName: tenantData.businessName,
        details: { ip: req.ip },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record login audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        shopName: tenantData.businessName,
        tenant: tenantData,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform Owner dedicated login flow
 */
export const ownerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Please contact system administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Role check: ONLY platform_owner role is permitted
    if (user.role !== 'platform_owner') {
      return res.status(403).json({
        success: false,
        code: 'NOT_PLATFORM_OWNER',
        message: 'Access denied: This portal is strictly reserved for Platform Owner accounts. Tailor studios must log in via /login.',
      });
    }

    const token = generateToken(user._id);

    // Record login in audit log
    try {
      await AuditLog.create({
        actor: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'platform_owner_login',
        targetTenant: null,
        targetTenantName: 'Platform Central',
        details: { ip: req.ip },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record owner login audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: 'Platform Owner login successful',
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: null,
        tenant: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  let tenantData = null;
  if (req.tenant) {
    tenantData = {
      id: req.tenant._id,
      businessName: req.tenant.businessName,
      tenantCode: req.tenant.tenantCode,
      status: req.tenant.status,
    };
  }

  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
      shopName: req.tenant ? req.tenant.businessName : req.user.shopName,
      tenant: tenantData,
      mustChangePassword: Boolean(req.user.mustChangePassword),
    },
  });
};

/**
 * Change password (Mandatory for first login, or user-initiated)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If current password provided, verify it
    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
    }

    // Check if new password is identical to current password
    const isSame = await user.comparePassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be identical to your current or initial password',
      });
    }

    const passwordHash = await User.hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.mustChangePassword = false;
    await user.save();

    // Issue fresh JWT session token
    const freshToken = generateToken(user._id);

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'password_changed',
        targetTenant: user.tenantId || null,
        targetTenantName: user.shopName || '',
        details: { reason: 'Password change completed successfully' },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record password change audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: 'Password changed successfully! You may now access your tailoring dashboard.',
      token: freshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        shopName: user.shopName,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
};
