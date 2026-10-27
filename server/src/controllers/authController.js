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

    let tenantData = null;
    if (user.role !== 'platform_owner' && user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant) {
        return res.status(403).json({
          success: false,
          message: 'Associated tailoring business tenant not found.',
        });
      }

      if (tenant.status === 'inactive' || tenant.status === 'archived') {
        const isArchived = tenant.status === 'archived';
        return res.status(403).json({
          success: false,
          code: isArchived ? 'TENANT_ARCHIVED' : 'TENANT_INACTIVE',
          message: `Your business account has been ${isArchived ? 'archived' : 'deactivated'}. Please contact platform support.`,
        });
      }

      tenantData = {
        id: tenant._id,
        businessName: tenant.businessName,
        tenantCode: tenant.tenantCode,
        status: tenant.status,
      };
    }

    const token = generateToken(user._id);

    // Record login in audit log
    try {
      await AuditLog.create({
        actor: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: user.role === 'platform_owner' ? 'platform_owner_login' : 'tenant_login',
        targetTenant: user.tenantId || null,
        targetTenantName: tenantData ? tenantData.businessName : 'Platform',
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        shopName: tenantData ? tenantData.businessName : user.shopName,
        tenant: tenantData,
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
    },
  });
};

export const logout = async (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
};
