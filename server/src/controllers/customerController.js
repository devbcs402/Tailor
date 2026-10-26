import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';

// Normalize mobile number (remove spaces, dashes)
const normalizeMobile = (mobile) => {
  return String(mobile || '').replace(/[^0-9+]/g, '').trim();
};

export const getCustomers = async (req, res, next) => {
  try {
    const { search = '', sortBy = 'newest', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = { isActive: true };
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

    // Enrich customers with order count & next deadline
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      { $match: { customer: { $in: customerIds } } },
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
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

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

    const cleanMobile = String(mobileNumber).replace(/\D/g, '').trim();
    if (cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be exactly 10 digits',
      });
    }

    // Check if customer already exists with this mobile number
    const existing = await Customer.findOne({ mobileNumber: cleanMobile });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer "${existing.name}" already exists with mobile number ${cleanMobile}.`,
        existingCustomer: existing,
      });
    }

    const customer = new Customer({
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
    const { id } = req.params;
    const { name, mobileNumber, address, notes, isActive } = req.body;

    const customer = await Customer.findById(id);
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
      const cleanMobile = String(mobileNumber).replace(/\D/g, '').trim();
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number must be exactly 10 digits',
        });
      }
      // Check collision
      const duplicate = await Customer.findOne({
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
    const { id } = req.params;
    const { measurements } = req.body;

    if (!measurements) {
      return res.status(400).json({
        success: false,
        message: 'Measurements data is required',
      });
    }

    const customer = await Customer.findById(id);
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
    const { id } = req.params;
    const orders = await Order.find({ customer: id }).sort({ orderDate: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
