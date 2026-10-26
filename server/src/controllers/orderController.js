import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { generateNextOrderNumber } from '../models/OrderCounter.js';

export const getOrders = async (req, res, next) => {
  try {
    const {
      search = '',
      status = '',
      from = '',
      to = '',
      sortBy = 'newest',
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // Search filter across orderNumber, customer name/mobile, and pattern fields
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: regex },
        { 'customerSnapshot.name': regex },
        { 'customerSnapshot.mobileNumber': regex },
        { 'shirt.pattern': regex },
        { 'shirt.patterns': regex },
        { 'shirt.customPattern': regex },
        { 'pant.pattern': regex },
        { 'pant.patterns': regex },
        { 'pant.customPattern': regex },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Date range filter (by deadline)
    if (from || to) {
      query.deadline = {};
      if (from) {
        query.deadline.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.deadline.$lte = toDate;
      }
    }

    // Sort order
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'deadline_nearest') {
      sortOptions = { deadline: 1 };
    } else if (sortBy === 'deadline_latest') {
      sortOptions = { deadline: -1 };
    } else if (sortBy === 'orderNumber_asc') {
      sortOptions = { orderNumber: 1 };
    } else if (sortBy === 'orderNumber_desc') {
      sortOptions = { orderNumber: -1 };
    } else if (sortBy === 'customer_asc') {
      sortOptions = { 'customerSnapshot.name': 1 };
    } else if (sortBy === 'customer_desc') {
      sortOptions = { 'customerSnapshot.name': -1 };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'name mobileNumber')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const {
      isNewCustomer,
      customerId,
      customerDetails,
      orderDate,
      deadline,
      deliveryTime,
      measurementUnit = 'inch',
      shirt = {},
      pant = {},
      specialInstructions = '',
      pricing = {},
      saveAsLatestMeasurements = false,
    } = req.body;

    if (!deadline) {
      return res.status(400).json({
        success: false,
        message: 'Delivery deadline is required',
      });
    }

    const parsedDeadline = new Date(deadline);
    const parsedOrderDate = orderDate ? new Date(orderDate) : new Date();

    // Prepare patterns for shirt
    const shirtPatternsList = Array.isArray(shirt.patterns)
      ? shirt.patterns.filter(Boolean)
      : (shirt.pattern ? [String(shirt.pattern).trim()] : []);
    const shirtPatternCombined = shirtPatternsList.length > 0
      ? shirtPatternsList.join(', ')
      : (shirt.pattern !== undefined ? String(shirt.pattern).trim() : '');

    // Prepare patterns for pant
    const pantPatternsList = Array.isArray(pant.patterns)
      ? pant.patterns.filter(Boolean)
      : (pant.pattern ? [String(pant.pattern).trim()] : []);
    const pantPatternCombined = pantPatternsList.length > 0
      ? pantPatternsList.join(', ')
      : (pant.pattern !== undefined ? String(pant.pattern).trim() : '');

    let targetCustomer;

    // Handle New vs Existing Customer
    if (isNewCustomer) {
      const { name, mobileNumber, address, notes } = customerDetails || {};
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Customer name is required',
        });
      }
      if (!mobileNumber || !mobileNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
      }

      const cleanMobile = String(mobileNumber).replace(/[^0-9+]/g, '').trim();

      // Check existing mobile number
      let existing = await Customer.findOne({ mobileNumber: cleanMobile });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Customer "${existing.name}" already exists with mobile number ${cleanMobile}. Please select as Existing Customer.`,
          existingCustomer: existing,
        });
      }

      // Create new customer
      targetCustomer = new Customer({
        name: name.trim(),
        mobileNumber: cleanMobile,
        address: address ? address.trim() : '',
        notes: notes ? notes.trim() : '',
        latestMeasurements: {
          unit: measurementUnit,
          shirt: shirt.measurements || {},
          shirtPatterns: shirtPatternsList,
          shirtPattern: shirtPatternCombined,
          shirtCustomPattern: shirt.customPattern || '',
          pant: pant.measurements || {},
          pantPatterns: pantPatternsList,
          pantPattern: pantPatternCombined,
          pantCustomPattern: pant.customPattern || '',
          updatedAt: new Date(),
        },
      });

      await targetCustomer.save();
    } else {
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Please select a customer',
        });
      }

      targetCustomer = await Customer.findById(customerId);
      if (!targetCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Selected customer not found',
        });
      }

      // If tailor explicitly asked to update latest measurements
      if (saveAsLatestMeasurements) {
        targetCustomer.latestMeasurements = {
          unit: measurementUnit,
          shirt: shirt.measurements || {},
          shirtPatterns: shirtPatternsList,
          shirtPattern: shirtPatternCombined,
          shirtCustomPattern: shirt.customPattern || '',
          pant: pant.measurements || {},
          pantPatterns: pantPatternsList,
          pantPattern: pantPatternCombined,
          pantCustomPattern: pant.customPattern || '',
          updatedAt: new Date(),
        };
        await targetCustomer.save();
      }
    }

    // Collision-safe atomic sequence order number
    let orderNumber = await generateNextOrderNumber();

    const shirtQty = Math.max(0, parseInt(shirt.quantity, 10) || 0);
    const pantQty = Math.max(0, parseInt(pant.quantity, 10) || 0);

    const newOrder = new Order({
      orderNumber,
      customer: targetCustomer._id,
      customerSnapshot: {
        name: targetCustomer.name,
        mobileNumber: targetCustomer.mobileNumber,
        address: targetCustomer.address || '',
      },
      orderDate: parsedOrderDate,
      deadline: parsedDeadline,
      deliveryTime: deliveryTime || '',
      status: 'in_progress', // Active default status, replacing 'pending'
      measurementUnit,
      shirt: {
        quantity: shirtQty,
        patterns: shirtPatternsList,
        pattern: shirtPatternCombined,
        customPattern: shirt.customPattern || '',
        measurements: shirt.measurements || {},
      },
      pant: {
        quantity: pantQty,
        patterns: pantPatternsList,
        pattern: pantPatternCombined,
        customPattern: pant.customPattern || '',
        measurements: pant.measurements || {},
      },
      specialInstructions: specialInstructions ? specialInstructions.trim() : '',
      pricing: {
        shirtPrice: 0,
        pantPrice: 0,
        total: 0,
        advancePaid: 0,
        balanceDue: 0,
      },
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: `Order #${orderNumber} created successfully`,
      data: newOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      deadline,
      deliveryTime,
      status,
      measurementUnit,
      shirt,
      pant,
      specialInstructions,
    } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (deadline) order.deadline = new Date(deadline);
    if (deliveryTime !== undefined) order.deliveryTime = deliveryTime;
    if (status && ['in_progress', 'ready', 'delivered', 'cancelled'].includes(status)) {
      order.status = status;
    }
    if (measurementUnit) order.measurementUnit = measurementUnit;

    if (shirt) {
      const existingShirt = order.shirt ? order.shirt.toObject() : {};
      const updatedPatterns = shirt.patterns !== undefined
        ? (Array.isArray(shirt.patterns) ? shirt.patterns.filter(Boolean) : [])
        : (existingShirt.patterns || []);
      const updatedCustom = shirt.customPattern !== undefined
        ? shirt.customPattern
        : (existingShirt.customPattern || '');
      const updatedPatternStr = shirt.pattern !== undefined
        ? String(shirt.pattern).trim()
        : (updatedPatterns.length > 0 ? updatedPatterns.join(', ') : (existingShirt.pattern || ''));

      order.shirt = {
        ...existingShirt,
        ...shirt,
        patterns: updatedPatterns,
        customPattern: updatedCustom,
        pattern: updatedPatternStr,
      };
    }

    if (pant) {
      const existingPant = order.pant ? order.pant.toObject() : {};
      const updatedPatterns = pant.patterns !== undefined
        ? (Array.isArray(pant.patterns) ? pant.patterns.filter(Boolean) : [])
        : (existingPant.patterns || []);
      const updatedCustom = pant.customPattern !== undefined
        ? pant.customPattern
        : (existingPant.customPattern || '');
      const updatedPatternStr = pant.pattern !== undefined
        ? String(pant.pattern).trim()
        : (updatedPatterns.length > 0 ? updatedPatterns.join(', ') : (existingPant.pattern || ''));

      order.pant = {
        ...existingPant,
        ...pant,
        patterns: updatedPatterns,
        customPattern: updatedCustom,
        pattern: updatedPatternStr,
      };
    }

    if (specialInstructions !== undefined) {
      order.specialInstructions = specialInstructions;
    }

    await order.save();

    return res.json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Allowed active statuses for tailors to select (Pending is removed from selection options)
    const allowedStatuses = ['in_progress', 'ready', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status. Please select In Progress, Ready, Delivered, or Cancelled.',
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
