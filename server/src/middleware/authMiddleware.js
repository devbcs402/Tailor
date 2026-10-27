import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_tailor_management_key_2026_xyz');

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or session expired.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Please contact administrator.',
      });
    }

    // Tenant check for tenant-scoped users
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

      req.tenant = tenant;
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session.',
      error: error.message,
    });
  }
};

/**
 * Middleware: Strictly requires Platform Owner role
 */
export const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== 'platform_owner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Platform owner authorization required.',
    });
  }
  next();
};

/**
 * Middleware: Requires an active Tenant Context
 */
export const requireTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role === 'platform_owner') {
    return res.status(403).json({
      success: false,
      message: 'Platform owner cannot directly modify business data without explicit tenant scoping.',
    });
  }

  if (!req.user.tenantId || !req.tenant) {
    return res.status(403).json({
      success: false,
      message: 'Tenant access required.',
    });
  }

  next();
};
