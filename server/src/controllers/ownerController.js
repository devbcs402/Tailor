import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { AuditLog } from '../models/AuditLog.js';
import { seedTenantDefaultPatterns } from './patternController.js';

/**
 * Platform overview statistics
 */
export const getPlatformStats = async (req, res, next) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const inactiveTenants = await Tenant.countDocuments({ status: 'inactive' });
    const archivedTenants = await Tenant.countDocuments({ status: 'archived' });
    const totalTenantUsers = await User.countDocuments({ role: { $ne: 'platform_owner' } });
    const totalCustomers = await Customer.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Recent 5 tenants
    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent 10 audit logs
    const recentAuditLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        inactiveTenants,
        archivedTenants,
        totalTenantUsers,
        totalCustomers,
        totalOrders,
        recentTenants,
        recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all tenants with search, status filtering, and pagination
 */
export const getTenants = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { businessName: regex },
        { tenantCode: regex },
        { ownerName: regex },
        { email: regex },
        { mobileNumber: regex },
        { city: regex },
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'name_asc') {
      sortOptions = { businessName: 1 };
    } else if (sortBy === 'name_desc') {
      sortOptions = { businessName: -1 };
    }

    const total = await Tenant.countDocuments(query);
    const tenants = await Tenant.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Enrich tenants with counts
    const tenantIds = tenants.map((t) => t._id);

    const [userCounts, customerCounts, orderCounts] = await Promise.all([
      User.aggregate([
        { $match: { tenantId: { $in: tenantIds } } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
      Customer.aggregate([
        { $match: { tenantId: { $in: tenantIds } } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { tenantId: { $in: tenantIds } } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
    ]);

    const userCountMap = new Map(userCounts.map((u) => [String(u._id), u.count]));
    const customerCountMap = new Map(customerCounts.map((c) => [String(c._id), c.count]));
    const orderCountMap = new Map(orderCounts.map((o) => [String(o._id), o.count]));

    const enrichedTenants = tenants.map((t) => ({
      ...t,
      usersCount: userCountMap.get(String(t._id)) || 0,
      customersCount: customerCountMap.get(String(t._id)) || 0,
      ordersCount: orderCountMap.get(String(t._id)) || 0,
    }));

    return res.json({
      success: true,
      data: enrichedTenants,
      pagination: {
        total,
        totalRecords: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tenant details by ID
 */
export const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id).lean();

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    const [users, customerCount, orderCount, orderStatusBreakdown] = await Promise.all([
      User.find({ tenantId: tenant._id }).select('-passwordHash').lean(),
      Customer.countDocuments({ tenantId: tenant._id }),
      Order.countDocuments({ tenantId: tenant._id }),
      Order.aggregate([
        { $match: { tenantId: tenant._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        ...tenant,
        users,
        stats: {
          customerCount,
          orderCount,
          userCount: users.length,
          orderStatusBreakdown,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new tenant and onboard initial administrator account
 */
export const createTenant = async (req, res, next) => {
  try {
    const {
      businessName,
      ownerName,
      email,
      mobileNumber,
      address = '',
      city = '',
      state = '',
      pincode = '',
      adminPassword,
      notes = '',
    } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ success: false, message: 'Owner name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = String(mobileNumber).replace(/\D/g, '').trim();

    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    // Check if user account with this email already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user account with email "${cleanEmail}" already exists.`,
      });
    }

    // Generate unique tenant code
    const baseCode = businessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'TNT';
    let tenantCode = `${baseCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    let codeExists = await Tenant.findOne({ tenantCode });
    while (codeExists) {
      tenantCode = `${baseCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      codeExists = await Tenant.findOne({ tenantCode });
    }

    // 1. Create Tenant Record
    const tenant = new Tenant({
      businessName: businessName.trim(),
      tenantCode,
      ownerName: ownerName.trim(),
      email: cleanEmail,
      mobileNumber: cleanMobile,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      status: 'active',
      notes: notes.trim(),
    });

    await tenant.save();

    // 2. Create Initial Administrator Account for Tenant
    const initialPassword = adminPassword && adminPassword.length >= 6 ? adminPassword : 'Tailor@2026!';
    const passwordHash = await User.hashPassword(initialPassword);

    const adminUser = new User({
      name: ownerName.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'admin',
      tenantId: tenant._id,
      shopName: businessName.trim(),
      isActive: true,
    });

    await adminUser.save();

    // 3. Seed starter patterns for this tenant
    await seedTenantDefaultPatterns(tenant._id);

    // 4. Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_created',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: {
          tenantCode: tenant.tenantCode,
          ownerName: tenant.ownerName,
          email: tenant.email,
          mobileNumber: tenant.mobileNumber,
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_created audit:', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Tenant "${tenant.businessName}" created successfully with code ${tenant.tenantCode}.`,
      data: {
        tenant,
        adminUser: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          initialPassword,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tenant information
 */
export const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      businessName,
      ownerName,
      email,
      mobileNumber,
      address,
      city,
      state,
      pincode,
      notes,
    } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (businessName !== undefined) tenant.businessName = businessName.trim();
    if (ownerName !== undefined) tenant.ownerName = ownerName.trim();
    if (email !== undefined) tenant.email = email.toLowerCase().trim();
    if (mobileNumber !== undefined) {
      const cleanMobile = String(mobileNumber).replace(/\D/g, '').trim();
      if (cleanMobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
      }
      tenant.mobileNumber = cleanMobile;
    }
    if (address !== undefined) tenant.address = address.trim();
    if (city !== undefined) tenant.city = city.trim();
    if (state !== undefined) tenant.state = state.trim();
    if (pincode !== undefined) tenant.pincode = pincode.trim();
    if (notes !== undefined) tenant.notes = notes.trim();

    await tenant.save();

    // If business name changed, sync user shopNames for this tenant
    if (businessName !== undefined) {
      await User.updateMany({ tenantId: tenant._id }, { $set: { shopName: tenant.businessName } });
    }

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_updated',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: { updatedFields: Object.keys(req.body) },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_updated audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: 'Tenant details updated successfully',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate tenant
 */
export const activateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    tenant.status = 'active';
    tenant.deactivatedAt = null;
    tenant.deactivatedBy = null;
    await tenant.save();

    // Re-enable tenant users
    await User.updateMany({ tenantId: tenant._id }, { $set: { isActive: true } });

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_reactivated',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: { activatedAt: new Date() },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_reactivated audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: `Tenant "${tenant.businessName}" has been reactivated successfully.`,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate tenant (Immediate suspension of all tenant business access)
 */
export const deactivateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    tenant.status = 'inactive';
    tenant.deactivatedAt = new Date();
    tenant.deactivatedBy = req.user._id;
    await tenant.save();

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_deactivated',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: { deactivatedAt: tenant.deactivatedAt, reason: req.body.reason || 'Admin action' },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_deactivated audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: `Tenant "${tenant.businessName}" has been deactivated. Business API access suspended.`,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive Tenant (Safe controlled soft-deletion preserving historical business data)
 */
export const archiveTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Archived by platform administrator' } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    tenant.status = 'archived';
    tenant.archivedAt = new Date();
    tenant.archivedBy = req.user._id;
    tenant.archiveReason = String(reason || '').trim();
    await tenant.save();

    // Disable tenant users so they cannot authenticate
    await User.updateMany({ tenantId: tenant._id }, { $set: { isActive: false } });

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_archived',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: { archivedAt: tenant.archivedAt, reason: tenant.archiveReason },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_archived audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: `Tenant "${tenant.businessName}" has been safely archived. All customer and order records preserved.`,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore an Archived Tenant
 */
export const restoreTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    tenant.status = 'active';
    tenant.archivedAt = null;
    tenant.archivedBy = null;
    tenant.archiveReason = '';
    tenant.deactivatedAt = null;
    tenant.deactivatedBy = null;
    await tenant.save();

    // Re-enable tenant users
    await User.updateMany({ tenantId: tenant._id }, { $set: { isActive: true } });

    // Record Audit Log
    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'tenant_restored',
        targetTenant: tenant._id,
        targetTenantName: tenant.businessName,
        details: { restoredAt: new Date() },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record tenant_restored audit:', auditErr.message);
    }

    return res.json({
      success: true,
      message: `Tenant "${tenant.businessName}" has been restored to active status.`,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List audit activity logs
 */
export const getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (action) {
      query.action = action;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        totalRecords: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
