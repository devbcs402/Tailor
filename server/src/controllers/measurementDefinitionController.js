import {
  MeasurementDefinition,
} from '../models/MeasurementDefinition.js';

/**
 * Generate a clean, stable machine-readable key from display name
 * Examples:
 * "Pocket Height" -> "pocket_height"
 * "Back Pleat Depth" -> "back_pleat_depth"
 */
export const slugifyFieldKey = (name = '') => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Re-sequence display orders for a tenant's category so positions are strictly sequential 1..N
 * If a movedDocId and targetOrder are provided, the moved item is spliced into that target position.
 */
export const resequenceDefinitions = async (tenantId, category, movedDocId = null, targetOrder = null) => {
  const allDocs = await MeasurementDefinition.find({
    tenantId,
    category,
    isDeleted: { $ne: true },
  }).sort({ displayOrder: 1, createdAt: 1, _id: 1 });

  if (allDocs.length === 0) return;

  const list = [...allDocs];
  if (movedDocId && targetOrder !== null) {
    const movedIndex = list.findIndex((d) => String(d._id) === String(movedDocId));
    if (movedIndex !== -1) {
      const [movedItem] = list.splice(movedIndex, 1);
      const insertIndex = Math.max(0, Math.min(list.length, targetOrder - 1));
      list.splice(insertIndex, 0, movedItem);
    }
  }

  const bulkOps = list.map((item, index) => ({
    updateOne: {
      filter: { _id: item._id, tenantId },
      update: { $set: { displayOrder: index + 1 } },
    },
  }));

  if (bulkOps.length > 0) {
    await MeasurementDefinition.bulkWrite(bulkOps);
  }
};

/**
 * GET /api/measurement-definitions
 * Retrieve measurement definitions for the authenticated tenant.
 * Query params: category ('shirt_measurement' | 'pant_measurement'), active ('true' | 'false')
 */
export const getMeasurementDefinitions = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { category, active, activeOnly, all } = req.query;

    const query = { tenantId, isDeleted: { $ne: true } };

    if (category) {
      const validCategories = ['shirt_measurement', 'pant_measurement'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be "shirt_measurement" or "pant_measurement".',
        });
      }
      query.category = category;
    }

    // Filter active unless all=true or active=false explicitly
    if (active === 'true' || activeOnly === 'true') {
      query.isActive = true;
    } else if (active === 'false' || activeOnly === 'false') {
      query.isActive = false;
    } else if (!all && (active !== undefined || activeOnly !== undefined)) {
      query.isActive = Boolean(active ?? activeOnly);
    }

    const definitions = await MeasurementDefinition.find(query)
      .sort({ category: 1, displayOrder: 1, createdAt: 1, _id: 1 })
      .lean();

    // Check if any items have duplicate or non-sequential display orders
    let hasDuplicateOrder = false;
    const seenOrders = new Set();
    for (const def of definitions) {
      const key = `${def.category}:${def.displayOrder}`;
      if (seenOrders.has(key)) {
        hasDuplicateOrder = true;
        break;
      }
      seenOrders.add(key);
    }

    if (hasDuplicateOrder) {
      if (category) {
        await resequenceDefinitions(tenantId, category);
      } else {
        await resequenceDefinitions(tenantId, 'shirt_measurement');
        await resequenceDefinitions(tenantId, 'pant_measurement');
      }
      const healedDefs = await MeasurementDefinition.find(query)
        .sort({ category: 1, displayOrder: 1, createdAt: 1, _id: 1 })
        .lean();
      return res.json({
        success: true,
        data: healedDefs,
      });
    }

    return res.json({
      success: true,
      data: definitions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/measurement-definitions
 * Create a new custom measurement definition for the tenant
 */
export const createMeasurementDefinition = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      displayName,
      gujaratiName = '',
      category,
      fieldType = 'number',
      unit = '',
      isRequired = true,
      isActive = true,
      displayOrder,
      fieldKey: customKey,
    } = req.body;

    // 1. Validate Category
    if (!category || !['shirt_measurement', 'pant_measurement'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Valid category ("shirt_measurement" or "pant_measurement") is required.',
      });
    }

    // 2. Validate Name
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Measurement display name is required.',
      });
    }

    // 3. Validate Field Type
    if (!['number', 'text'].includes(fieldType)) {
      return res.status(400).json({
        success: false,
        message: 'Field type must be "number" or "text".',
      });
    }

    // 4. Stable Machine-Readable Key Generation
    let finalKey = (customKey && customKey.trim()) ? slugifyFieldKey(customKey) : slugifyFieldKey(displayName);
    if (!finalKey) {
      finalKey = `field_${Date.now()}`;
    }

    // 5. Calculate Display Order if not provided
    let orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum) || orderNum <= 0) {
      const highestOrderDoc = await MeasurementDefinition.findOne({ tenantId, category })
        .sort({ displayOrder: -1 })
        .lean();
      orderNum = highestOrderDoc ? (highestOrderDoc.displayOrder || 0) + 1 : 1;
    }

    // 6. Prevent Duplicate Key within the Same Tenant & Category
    const duplicate = await MeasurementDefinition.findOne({
      tenantId,
      category,
      fieldKey: finalKey,
    });

    if (duplicate) {
      // If deleted duplicate exists, resurrect it with new properties
      if (duplicate.isDeleted) {
        duplicate.isDeleted = false;
        duplicate.isActive = isActive !== undefined ? Boolean(isActive) : true;
        duplicate.displayName = displayName.trim();
        duplicate.gujaratiName = gujaratiName ? gujaratiName.trim() : '';
        duplicate.fieldType = fieldType;
        duplicate.isRequired = isRequired !== undefined ? Boolean(isRequired) : true;
        duplicate.displayOrder = orderNum;
        await duplicate.save();

        // Resequence category so display order is strictly sequential
        await resequenceDefinitions(tenantId, category, duplicate._id, orderNum);
        const refreshedDuplicate = await MeasurementDefinition.findOne({ _id: duplicate._id, tenantId });

        return res.status(201).json({
          success: true,
          message: `Measurement "${refreshedDuplicate.displayName}" added successfully`,
          data: refreshedDuplicate,
        });
      }

      // If inactive duplicate exists, tenant can choose to reactivate
      if (!duplicate.isActive) {
        return res.status(409).json({
          success: false,
          isInactiveDuplicate: true,
          duplicateId: duplicate._id,
          message: `A deactivated measurement field with key "${finalKey}" (${duplicate.displayName}) already exists. You can reactivate it in Settings.`,
        });
      }
      return res.status(409).json({
        success: false,
        message: `A measurement with key "${finalKey}" (${duplicate.displayName}) already exists in this category. Please choose a different name.`,
      });
    }

    const newDef = new MeasurementDefinition({
      tenantId,
      category,
      fieldKey: finalKey,
      displayName: displayName.trim(),
      gujaratiName: gujaratiName ? gujaratiName.trim() : '',
      fieldType,
      unit: unit ? String(unit).trim() : '',
      isRequired: Boolean(isRequired),
      isActive: Boolean(isActive),
      displayOrder: orderNum,
      isSystemDefault: false,
    });

    await newDef.save();

    // Resequence category so display order is strictly sequential
    await resequenceDefinitions(tenantId, category, newDef._id, orderNum);
    const refreshedDef = await MeasurementDefinition.findOne({ _id: newDef._id, tenantId });

    return res.status(201).json({
      success: true,
      message: `Measurement "${refreshedDef.displayName}" added successfully`,
      data: refreshedDef,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A measurement with this key already exists in this category.',
      });
    }
    next(error);
  }
};

/**
 * PUT /api/measurement-definitions/:id
 * Update an existing measurement definition (keeps fieldKey immutable)
 */
export const updateMeasurementDefinition = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      displayName,
      gujaratiName,
      fieldType,
      unit,
      isRequired,
      isActive,
      displayOrder,
    } = req.body;

    const definition = await MeasurementDefinition.findOne({ _id: id, tenantId });
    if (!definition) {
      return res.status(404).json({
        success: false,
        message: 'Measurement definition not found or belongs to another business.',
      });
    }

    if (displayName !== undefined) {
      if (!displayName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Measurement display name cannot be empty.',
        });
      }
      definition.displayName = displayName.trim();
    }

    if (gujaratiName !== undefined) {
      definition.gujaratiName = gujaratiName.trim();
    }

    if (fieldType !== undefined) {
      if (!['number', 'text'].includes(fieldType)) {
        return res.status(400).json({
          success: false,
          message: 'Field type must be "number" or "text".',
        });
      }
      definition.fieldType = fieldType;
    }

    if (unit !== undefined) {
      definition.unit = unit ? String(unit).trim() : '';
    }

    if (isRequired !== undefined) {
      definition.isRequired = Boolean(isRequired);
    }

    if (isActive !== undefined) {
      definition.isActive = Boolean(isActive);
    }

    let targetOrder = null;
    if (displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder, 10);
      if (!isNaN(parsedOrder) && parsedOrder > 0) {
        definition.displayOrder = parsedOrder;
        targetOrder = parsedOrder;
      }
    }

    await definition.save();

    // Resequence category definitions so target position is applied and all items shift sequentially 1..N
    await resequenceDefinitions(tenantId, definition.category, definition._id, targetOrder);

    const refreshed = await MeasurementDefinition.findOne({ _id: id, tenantId });

    return res.json({
      success: true,
      message: `Measurement "${refreshed.displayName}" updated successfully`,
      data: refreshed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/measurement-definitions/:id/status
 * Toggle or set active status of a measurement definition
 */
export const toggleMeasurementDefinitionStatus = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { isActive } = req.body;

    const definition = await MeasurementDefinition.findOne({ _id: id, tenantId });
    if (!definition) {
      return res.status(404).json({
        success: false,
        message: 'Measurement definition not found or belongs to another business.',
      });
    }

    if (isActive !== undefined) {
      definition.isActive = Boolean(isActive);
    } else {
      definition.isActive = !definition.isActive;
    }

    await definition.save();

    return res.json({
      success: true,
      message: `Measurement "${definition.displayName}" is now ${definition.isActive ? 'active' : 'deactivated'}`,
      data: definition,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/measurement-definitions/reorder
 * Batch update display orders for a list of measurement definitions
 */
export const reorderMeasurementDefinitions = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array with { id, displayOrder } is required.',
      });
    }

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, tenantId },
        update: { $set: { displayOrder: parseInt(item.displayOrder, 10) || 0 } },
      },
    }));

    await MeasurementDefinition.bulkWrite(bulkOps);

    return res.json({
      success: true,
      message: 'Measurement field order updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/measurement-definitions/:id
 * Delete a measurement definition (soft delete within tenant to protect historical orders & customer records)
 */
export const deleteMeasurementDefinition = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const definition = await MeasurementDefinition.findOne({ _id: id, tenantId });
    if (!definition) {
      return res.status(404).json({
        success: false,
        message: 'Measurement definition not found or belongs to another business.',
      });
    }

    // Soft delete within authenticated tenant
    definition.isDeleted = true;
    definition.isActive = false;
    await definition.save();

    // Resequence remaining definitions so there are no gaps
    await resequenceDefinitions(tenantId, definition.category);

    return res.json({
      success: true,
      message: `Measurement "${definition.displayName}" deleted successfully`,
      data: definition,
    });
  } catch (error) {
    next(error);
  }
};
