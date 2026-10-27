import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { generateNextOrderNumber } from '../models/OrderCounter.js';

export const REQUIRED_SHIRT_FIELDS = ['length', 'chest', 'waist', 'shoulder', 'sleeveLength'];
export const REQUIRED_PANT_FIELDS = ['length', 'waist', 'hip', 'bottomOpening'];

export const validateGarmentMeasurements = (measurements = {}, requiredFields, garmentName) => {
  for (const field of requiredFields) {
    const val = measurements[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      return `Required ${garmentName} measurement "${field}" is missing.`;
    }
  }

  for (const [key, val] of Object.entries(measurements)) {
    if (key !== 'notes' && val !== undefined && val !== null && String(val).trim() !== '') {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        return `${garmentName.charAt(0).toUpperCase() + garmentName.slice(1)} measurement "${key}" must be a valid positive number.`;
      }
    }
  }

  return null;
};

export const getOrders = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
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

    const query = { tenantId };

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
    const totalPages = Math.ceil(total / limitNum) || 0;
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
        totalRecords: total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
      total,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, tenantId }).populate('customer');

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
      saveAsDefaultMeasurements = false,
      saveAsLatestMeasurements = false,
    } = req.body;

    const shouldSaveDefaults = Boolean(saveAsDefaultMeasurements || saveAsLatestMeasurements);

    if (!deadline || isNaN(new Date(deadline).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Valid delivery deadline is required',
      });
    }

    const parsedDeadline = new Date(deadline);
    const parsedOrderDate = orderDate ? new Date(orderDate) : new Date();

    const shirtQty = Math.max(0, parseInt(shirt.quantity, 10) || 0);
    const pantQty = Math.max(0, parseInt(pant.quantity, 10) || 0);

    if (shirtQty < 0 || pantQty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Garment quantities cannot be negative',
      });
    }

    if (shirtQty === 0 && pantQty === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least 1 shirt or 1 pant quantity',
      });
    }

    // Validate required measurements for garments with positive quantity
    if (shirtQty > 0) {
      const shirtErr = validateGarmentMeasurements(shirt.measurements, REQUIRED_SHIRT_FIELDS, 'shirt');
      if (shirtErr) {
        return res.status(400).json({
          success: false,
          message: shirtErr,
        });
      }
    }

    if (pantQty > 0) {
      const pantErr = validateGarmentMeasurements(pant.measurements, REQUIRED_PANT_FIELDS, 'pant');
      if (pantErr) {
        return res.status(400).json({
          success: false,
          message: pantErr,
        });
      }
    }

    // Prepare patterns for shirt (only if shirtQty > 0)
    const shirtPatternsList = shirtQty > 0
      ? (Array.isArray(shirt.patterns) ? shirt.patterns.filter(Boolean) : (shirt.pattern ? [String(shirt.pattern).trim()] : []))
      : [];
    const shirtPatternCombined = shirtPatternsList.length > 0
      ? shirtPatternsList.join(', ')
      : (shirt.pattern !== undefined ? String(shirt.pattern).trim() : '');

    // Prepare patterns for pant (only if pantQty > 0)
    const pantPatternsList = pantQty > 0
      ? (Array.isArray(pant.patterns) ? pant.patterns.filter(Boolean) : (pant.pattern ? [String(pant.pattern).trim()] : []))
      : [];
    const pantPatternCombined = pantPatternsList.length > 0
      ? pantPatternsList.join(', ')
      : (pant.pattern !== undefined ? String(pant.pattern).trim() : '');

    let targetCustomer;
    const tenantId = req.user.tenantId;

    // Handle New vs Existing Customer
    if (isNewCustomer) {
      const { name, mobileNumber, address, notes } = customerDetails || {};
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

      // Check existing mobile number within THIS tenant
      let existing = await Customer.findOne({ tenantId, mobileNumber: cleanMobile });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Customer "${existing.name}" already exists with mobile number ${cleanMobile}. Please select as Existing Customer.`,
          existingCustomer: existing,
        });
      }

      // Create new customer for this tenant
      targetCustomer = new Customer({
        tenantId,
        name: name.trim(),
        mobileNumber: cleanMobile,
        address: address ? address.trim() : '',
        notes: notes ? notes.trim() : '',
        latestMeasurements: {
          unit: measurementUnit,
          shirt: shirtQty > 0 ? (shirt.measurements || {}) : {},
          shirtPatterns: shirtPatternsList,
          shirtPattern: shirtPatternCombined,
          shirtCustomPattern: shirtQty > 0 ? (shirt.customPattern || '') : '',
          pant: pantQty > 0 ? (pant.measurements || {}) : {},
          pantPatterns: pantPatternsList,
          pantPattern: pantPatternCombined,
          pantCustomPattern: pantQty > 0 ? (pant.customPattern || '') : '',
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

      // Ensure customer belongs strictly to this tenant
      targetCustomer = await Customer.findOne({ _id: customerId, tenantId });
      if (!targetCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Selected customer not found or belongs to another business',
        });
      }

      // If tailor asked to update latest measurements
      // Safeguard: Do not overwrite garment measurements if quantity is 0!
      if (shouldSaveDefaults) {
        const existingLm = targetCustomer.latestMeasurements || {};
        targetCustomer.latestMeasurements = {
          unit: measurementUnit || existingLm.unit || 'inch',
          shirt: shirtQty > 0 ? (shirt.measurements || {}) : (existingLm.shirt || {}),
          shirtPatterns: shirtQty > 0 ? shirtPatternsList : (existingLm.shirtPatterns || []),
          shirtPattern: shirtQty > 0 ? shirtPatternCombined : (existingLm.shirtPattern || ''),
          shirtCustomPattern: shirtQty > 0 ? (shirt.customPattern || '') : (existingLm.shirtCustomPattern || ''),
          pant: pantQty > 0 ? (pant.measurements || {}) : (existingLm.pant || {}),
          pantPatterns: pantQty > 0 ? pantPatternsList : (existingLm.pantPatterns || []),
          pantPattern: pantQty > 0 ? pantPatternCombined : (existingLm.pantPattern || ''),
          pantCustomPattern: pantQty > 0 ? (pant.customPattern || '') : (existingLm.pantCustomPattern || ''),
          updatedAt: new Date(),
        };
        await targetCustomer.save();
      }
    }

    // Collision-safe atomic sequence order number scoped per tenant
    let orderNumber = await generateNextOrderNumber(tenantId);

    const newOrder = new Order({
      tenantId,
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
        patterns: shirtQty > 0 ? shirtPatternsList : [],
        pattern: shirtQty > 0 ? shirtPatternCombined : '',
        customPattern: shirtQty > 0 ? (shirt.customPattern || '') : '',
        measurements: shirtQty > 0 ? (shirt.measurements || {}) : {},
      },
      pant: {
        quantity: pantQty,
        patterns: pantQty > 0 ? pantPatternsList : [],
        pattern: pantQty > 0 ? pantPatternCombined : '',
        customPattern: pantQty > 0 ? (pant.customPattern || '') : '',
        measurements: pantQty > 0 ? (pant.measurements || {}) : {},
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
      customerId,
      customerDetails,
      orderDate,
      deadline,
      deliveryTime,
      status,
      measurementUnit,
      shirt,
      pant,
      specialInstructions,
      saveAsDefaultMeasurements = false,
      saveAsLatestMeasurements = false,
    } = req.body;

    const tenantId = req.user.tenantId;
    const order = await Order.findOne({ _id: id, tenantId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or belongs to another business',
      });
    }

    // 1. Handle Customer Update / Modification
    if (customerId && String(customerId) !== String(order.customer)) {
      const targetCustomer = await Customer.findOne({ _id: customerId, tenantId });
      if (!targetCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Selected customer not found or belongs to another business',
        });
      }
      order.customer = targetCustomer._id;
      order.customerSnapshot = {
        name: targetCustomer.name,
        mobileNumber: targetCustomer.mobileNumber,
        address: targetCustomer.address || '',
      };
    }

    if (customerDetails) {
      const currentCustomer = await Customer.findOne({ _id: order.customer, tenantId });
      if (currentCustomer) {
        let customerModified = false;
        if (customerDetails.name && customerDetails.name.trim() && customerDetails.name.trim() !== currentCustomer.name) {
          currentCustomer.name = customerDetails.name.trim();
          customerModified = true;
        }
        if (customerDetails.mobileNumber) {
          const cleanMobile = String(customerDetails.mobileNumber).replace(/\D/g, '').trim();
          if (cleanMobile.length === 10 && cleanMobile !== currentCustomer.mobileNumber) {
            // Verify mobile uniqueness within tenant
            const duplicateMobile = await Customer.findOne({
              tenantId,
              mobileNumber: cleanMobile,
              _id: { $ne: currentCustomer._id },
            });
            if (duplicateMobile) {
              return res.status(400).json({
                success: false,
                message: `Mobile number ${cleanMobile} is already used by customer "${duplicateMobile.name}".`,
              });
            }
            currentCustomer.mobileNumber = cleanMobile;
            customerModified = true;
          }
        }
        if (customerDetails.address !== undefined && customerDetails.address.trim() !== currentCustomer.address) {
          currentCustomer.address = customerDetails.address.trim();
          customerModified = true;
        }

        if (customerModified) {
          await currentCustomer.save();
        }

        order.customerSnapshot = {
          name: currentCustomer.name,
          mobileNumber: currentCustomer.mobileNumber,
          address: currentCustomer.address || '',
        };
      }
    }

    // 2. Order Dates
    if (orderDate && !isNaN(new Date(orderDate).getTime())) {
      order.orderDate = new Date(orderDate);
    }
    if (deadline) {
      if (isNaN(new Date(deadline).getTime())) {
        return res.status(400).json({ success: false, message: 'Valid deadline is required' });
      }
      order.deadline = new Date(deadline);
    }
    if (deliveryTime !== undefined) order.deliveryTime = deliveryTime;

    // 3. Status Update
    if (status) {
      if (status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Status cannot be updated to pending',
        });
      }
      if (['in_progress', 'ready', 'delivered', 'cancelled'].includes(status)) {
        order.status = status;
      }
    }
    if (measurementUnit) order.measurementUnit = measurementUnit;

    // 4. Shirt Garment & Measurement Snapshot Update
    if (shirt) {
      const existingShirt = order.shirt ? order.shirt.toObject() : {};
      const sQty = shirt.quantity !== undefined
        ? Math.max(0, parseInt(shirt.quantity, 10) || 0)
        : (existingShirt.quantity || 0);

      if (sQty === 0) {
        order.shirt = {
          ...existingShirt,
          quantity: 0,
          patterns: [],
          pattern: '',
          customPattern: '',
          measurements: {},
        };
      } else {
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
          quantity: sQty,
          patterns: updatedPatterns,
          customPattern: updatedCustom,
          pattern: updatedPatternStr,
          measurements: shirt.measurements !== undefined ? shirt.measurements : (existingShirt.measurements || {}),
        };
      }
    }

    // 5. Pant Garment & Measurement Snapshot Update
    if (pant) {
      const existingPant = order.pant ? order.pant.toObject() : {};
      const pQty = pant.quantity !== undefined
        ? Math.max(0, parseInt(pant.quantity, 10) || 0)
        : (existingPant.quantity || 0);

      if (pQty === 0) {
        order.pant = {
          ...existingPant,
          quantity: 0,
          patterns: [],
          pattern: '',
          customPattern: '',
          measurements: {},
        };
      } else {
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
          quantity: pQty,
          patterns: updatedPatterns,
          customPattern: updatedCustom,
          pattern: updatedPatternStr,
          measurements: pant.measurements !== undefined ? pant.measurements : (existingPant.measurements || {}),
        };
      }
    }

    if ((order.shirt?.quantity || 0) === 0 && (order.pant?.quantity || 0) === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least 1 shirt or 1 pant',
      });
    }

    if ((order.shirt?.quantity || 0) > 0) {
      const shirtErr = validateGarmentMeasurements(order.shirt.measurements, REQUIRED_SHIRT_FIELDS, 'shirt');
      if (shirtErr) {
        return res.status(400).json({
          success: false,
          message: shirtErr,
        });
      }
    }

    if ((order.pant?.quantity || 0) > 0) {
      const pantErr = validateGarmentMeasurements(order.pant.measurements, REQUIRED_PANT_FIELDS, 'pant');
      if (pantErr) {
        return res.status(400).json({
          success: false,
          message: pantErr,
        });
      }
    }

    if (specialInstructions !== undefined) {
      order.specialInstructions = specialInstructions ? specialInstructions.trim() : '';
    }

    // 6. Explicit Default Customer Measurements Update
    // Do NOT automatically overwrite customer measurements unless user explicitly checked option
    const shouldSaveAsCustomerDefaults = Boolean(saveAsDefaultMeasurements || saveAsLatestMeasurements);
    if (shouldSaveAsCustomerDefaults && order.customer) {
      const targetCustomer = await Customer.findOne({ _id: order.customer, tenantId });
      if (targetCustomer) {
        const existingLm = targetCustomer.latestMeasurements || {};
        targetCustomer.latestMeasurements = {
          unit: order.measurementUnit || existingLm.unit || 'inch',
          shirt: order.shirt?.quantity > 0 ? (order.shirt.measurements || {}) : (existingLm.shirt || {}),
          shirtPatterns: order.shirt?.quantity > 0 ? (order.shirt.patterns || []) : (existingLm.shirtPatterns || []),
          shirtPattern: order.shirt?.quantity > 0 ? (order.shirt.pattern || '') : (existingLm.shirtPattern || ''),
          shirtCustomPattern: order.shirt?.quantity > 0 ? (order.shirt.customPattern || '') : (existingLm.shirtCustomPattern || ''),
          pant: order.pant?.quantity > 0 ? (order.pant.measurements || {}) : (existingLm.pant || {}),
          pantPatterns: order.pant?.quantity > 0 ? (order.pant.patterns || []) : (existingLm.pantPatterns || []),
          pantPattern: order.pant?.quantity > 0 ? (order.pant.pattern || '') : (existingLm.pantPattern || ''),
          pantCustomPattern: order.pant?.quantity > 0 ? (order.pant.customPattern || '') : (existingLm.pantCustomPattern || ''),
          updatedAt: new Date(),
        };
        await targetCustomer.save();
      }
    }

    await order.save();
    await order.populate('customer');

    return res.json({
      success: true,
      message: `Order #${order.orderNumber} updated successfully`,
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

    const order = await Order.findOneAndUpdate(
      { _id: id, tenantId: req.user.tenantId },
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

/**
 * Delete an order safely by ID
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const order = await Order.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const orderNumber = order.orderNumber;
    await Order.deleteOne({ _id: id, tenantId: req.user.tenantId });

    return res.json({
      success: true,
      message: `Order #${orderNumber} deleted successfully`,
      data: { id, orderNumber },
    });
  } catch (error) {
    next(error);
  }
};
