import mongoose from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { AuditLog } from '../models/AuditLog.js';

// Normalize mobile number (remove spaces, dashes)
const normalizeMobile = (mobile) => {
  return String(mobile || '').replace(/[^0-9+]/g, '').trim();
};

export const getCustomers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { search = '', sortBy = 'newest', page = 1, limit = 20, status = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Strictly enforce tenant isolation, excluding archived/soft-deleted customers by default
    const query = { tenantId, isActive: true, isArchived: { $ne: true } };
    if (status === 'archived' || req.query.archived === 'true') {
      delete query.isActive;
      query.isArchived = true;
    }
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { mobileNumber: regex }, { address: regex }];
    }

    let sortOptions = { updatedAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'name_asc') {
      sortOptions = { name: 1 };
    } else if (sortBy === 'name_desc') {
      sortOptions = { name: -1 };
    } else if (sortBy === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Enrich customers with order count & next deadline (scoped to this tenant)
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      { $match: { tenantId, customer: { $in: customerIds } } },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          latestOrderDate: { $max: '$orderDate' },
          nextDeadline: {
            $min: {
              $cond: [
                { $in: ['$status', ['pending', 'in_progress', 'ready']] },
                '$deadline',
                null,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    orderStats.forEach((stat) => {
      statsMap.set(String(stat._id), stat);
    });

    const enrichedCustomers = customers.map((c) => {
      const stat = statsMap.get(String(c._id)) || {};
      return {
        ...c,
        totalOrders: stat.totalOrders || 0,
        latestOrderDate: stat.latestOrderDate || null,
        nextDeadline: stat.nextDeadline || null,
      };
    });

    return res.json({
      success: true,
      data: enrichedCustomers,
      pagination: {
        total,
        totalRecords: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
      total,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const customer = await Customer.findOne({ _id: id, tenantId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, mobileNumber, address, notes, latestMeasurements } = req.body;

    if (!name || !name.trim() || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid customer name (at least 2 characters) is required',
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    const rawMobile = String(mobileNumber || '').trim();
    if (!/^\d{10}$/.test(rawMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be exactly 10 digits',
      });
    }
    const cleanMobile = rawMobile;

    // Check if customer already exists within THIS tenant
    const existing = await Customer.findOne({ tenantId, mobileNumber: cleanMobile });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer "${existing.name}" already exists with mobile number ${cleanMobile}.`,
        existingCustomer: existing,
      });
    }

    const customer = new Customer({
      tenantId,
      name: name.trim(),
      mobileNumber: cleanMobile,
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : '',
      latestMeasurements: latestMeasurements || {},
    });

    await customer.save();

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, mobileNumber, address, notes, isActive } = req.body;

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (name !== undefined) {
      if (!name.trim() || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Valid customer name (at least 2 characters) is required',
        });
      }
      customer.name = name.trim();
    }
    if (mobileNumber !== undefined) {
      const rawMobile = String(mobileNumber || '').trim();
      if (!/^\d{10}$/.test(rawMobile)) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number must be exactly 10 digits',
        });
      }
      const cleanMobile = rawMobile;
      // Check collision within this tenant only
      const duplicate = await Customer.findOne({
        tenantId,
        mobileNumber: cleanMobile,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'This mobile number is already in use by another customer',
        });
      }
      customer.mobileNumber = cleanMobile;
    }
    if (address !== undefined) customer.address = address.trim();
    if (notes !== undefined) customer.notes = notes.trim();
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    return res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerMeasurements = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { measurements } = req.body;

    if (!measurements) {
      return res.status(400).json({
        success: false,
        message: 'Measurements data is required',
      });
    }

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    customer.latestMeasurements = {
      ...customer.latestMeasurements?.toObject(),
      ...measurements,
      updatedAt: new Date(),
    };

    await customer.save();

    return res.json({
      success: true,
      message: 'Customer saved measurements updated',
      data: customer.latestMeasurements,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const orders = await Order.find({ customer: id, tenantId }).sort({ orderDate: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/customers/:id
 * Delete a customer permanently if no orders exist, or archive safely if linked to orders
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const shouldArchive = req.query.archive === 'true' || req.body?.archive === true;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID provided.',
      });
    }

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // Check if customer is linked to existing orders within this tenant
    const orderCount = await Order.countDocuments({ customer: id, tenantId });

    // If customer has orders, prevent permanent deletion and advise archival
    if (orderCount > 0 && !shouldArchive) {
      return res.status(400).json({
        success: false,
        code: 'CUSTOMER_HAS_ORDERS',
        message: `Cannot permanently delete customer "${customer.name}". This customer is linked to ${orderCount} existing order(s). You can archive this customer instead to preserve historical records.`,
        orderCount,
        canArchive: true,
      });
    }

    if (orderCount > 0 && shouldArchive) {
      // Safe Archival: Soft delete customer to preserve historical orders
      customer.isActive = false;
      customer.isArchived = true;
      customer.archivedAt = new Date();
      await customer.save();

      try {
        await AuditLog.create({
          actor: req.user._id,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'customer_archived',
          targetTenant: tenantId,
          targetTenantName: req.tenant?.businessName || '',
          details: {
            customerId: customer._id,
            customerName: customer.name,
            mobileNumber: customer.mobileNumber,
            orderCount,
          },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        });
      } catch (auditErr) {
        console.warn('[Audit Warning] Could not record customer_archived audit:', auditErr.message);
      }

      return res.json({
        success: true,
        action: 'archived',
        message: `Customer "${customer.name}" has ${orderCount} historical order(s) and has been safely archived.`,
        data: {
          id: customer._id,
          name: customer.name,
          isArchived: true,
          orderCount,
        },
      });
    }

    // orderCount === 0: Allow permanent deletion
    await Customer.deleteOne({ _id: id, tenantId });

    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'customer_deleted',
        targetTenant: tenantId,
        targetTenantName: req.tenant?.businessName || '',
        details: {
          customerId: customer._id,
          customerName: customer.name,
          mobileNumber: customer.mobileNumber,
          orderCount: 0,
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record customer_deleted audit:', auditErr.message);
    }

    return res.json({
      success: true,
      action: 'deleted',
      message: `Customer "${customer.name}" deleted successfully.`,
      data: {
        id: customer._id,
        name: customer.name,
        deleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/customers/:id/archive
 * Explicitly archive a customer
 */
export const archiveCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID provided.',
      });
    }

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const orderCount = await Order.countDocuments({ customer: id, tenantId });
    customer.isActive = false;
    customer.isArchived = true;
    customer.archivedAt = new Date();
    await customer.save();

    try {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'customer_archived',
        targetTenant: tenantId,
        targetTenantName: req.tenant?.businessName || '',
        details: {
          customerId: customer._id,
          customerName: customer.name,
          mobileNumber: customer.mobileNumber,
          orderCount,
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('[Audit Warning] Could not record customer_archived audit:', auditErr.message);
    }

    return res.json({
      success: true,
      action: 'archived',
      message: `Customer "${customer.name}" archived successfully.`,
      data: {
        id: customer._id,
        name: customer.name,
        isArchived: true,
        orderCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
