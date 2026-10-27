import { Pattern } from '../models/Pattern.js';

// Default initial patterns to seed for newly created tenants
export const DEFAULT_SHIRT_PATTERNS = [
  'Plain',
  'Chex',
  'Stripes',
  'Printed',
  'Kurta Collar',
  'Chinese Collar',
];

export const DEFAULT_PANT_PATTERNS = [
  'Plain',
  'Formal',
  'Two Pocket',
  'Jeans Style',
  'Pencil Fit',
  'Pleated',
  'Cotton Trouser',
];

// Helper to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Seed initial patterns for a new tenant
 */
export const seedTenantDefaultPatterns = async (tenantId) => {
  try {
    const count = await Pattern.countDocuments({ tenantId });
    if (count === 0) {
      const initialDocs = [
        ...DEFAULT_SHIRT_PATTERNS.map((name) => ({ tenantId, name, type: 'shirt', isActive: true })),
        ...DEFAULT_PANT_PATTERNS.map((name) => ({ tenantId, name, type: 'pant', isActive: true })),
      ];
      await Pattern.insertMany(initialDocs);
      return initialDocs.length;
    }
    return 0;
  } catch (err) {
    console.error(`[Pattern Seeder] Failed to seed default patterns for tenant ${tenantId}:`, err);
    return 0;
  }
};

/**
 * Get patterns (filtered by type: 'shirt' | 'pant' and optional search, scoped to tenant)
 */
export const getPatterns = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { type, category, search = '', all = false } = req.query;

    const query = { tenantId };
    if (!all) {
      query.isActive = true;
    }

    let resolvedType = type;
    if (category) {
      if (category === 'shirt_pattern') resolvedType = 'shirt';
      else if (category === 'pant_pattern') resolvedType = 'pant';
      else resolvedType = category.replace('_pattern', '');
    }

    if (resolvedType && ['shirt', 'pant'].includes(resolvedType.toLowerCase())) {
      query.type = resolvedType.toLowerCase();
    }

    if (search.trim()) {
      query.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const patterns = await Pattern.find(query).sort({ name: 1 }).lean();

    return res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new pattern for the tenant
 */
export const createPattern = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    let { name, patternName, type, category } = req.body;

    const finalName = (patternName !== undefined ? patternName : name) || '';
    let resolvedType = type;
    if (category) {
      if (category === 'shirt_pattern') resolvedType = 'shirt';
      else if (category === 'pant_pattern') resolvedType = 'pant';
      else resolvedType = category.replace('_pattern', '');
    }

    if (!finalName || !finalName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name is required',
      });
    }

    if (!resolvedType || !['shirt', 'pant'].includes(resolvedType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Pattern type must be either "shirt" or "pant" (or category "shirt_pattern" or "pant_pattern")',
      });
    }

    const trimmedName = finalName.trim();
    const patternType = resolvedType.toLowerCase();

    // Check for case-insensitive duplicate within the same tenant & type
    const duplicate = await Pattern.findOne({
      tenantId,
      type: patternType,
      isActive: true,
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `A ${patternType} pattern with the name "${trimmedName}" already exists.`,
      });
    }

    // Check if an inactive pattern with this name exists in this tenant, reactivate it if so
    const inactivePattern = await Pattern.findOne({
      tenantId,
      type: patternType,
      isActive: false,
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (inactivePattern) {
      inactivePattern.name = trimmedName;
      inactivePattern.isActive = true;
      await inactivePattern.save();
      return res.status(201).json({
        success: true,
        message: `${patternType === 'shirt' ? 'Shirt' : 'Pant'} pattern added successfully`,
        data: inactivePattern,
      });
    }

    const newPattern = new Pattern({
      tenantId,
      name: trimmedName,
      type: patternType,
      isActive: true,
    });

    await newPattern.save();

    return res.status(201).json({
      success: true,
      message: `${patternType === 'shirt' ? 'Shirt' : 'Pant'} pattern added successfully`,
      data: newPattern,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing pattern name (scoped to tenant)
 */
export const updatePattern = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name cannot be empty',
      });
    }

    const pattern = await Pattern.findOne({ _id: id, tenantId });
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found',
      });
    }

    const trimmedName = name.trim();

    // Check duplicate among other active patterns of the same tenant & type
    const duplicate = await Pattern.findOne({
      tenantId,
      _id: { $ne: id },
      type: pattern.type,
      isActive: true,
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Another ${pattern.type} pattern already exists with the name "${trimmedName}".`,
      });
    }

    pattern.name = trimmedName;
    await pattern.save();

    return res.json({
      success: true,
      message: 'Pattern updated successfully',
      data: pattern,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a pattern (Safe soft-deletion within tenant to protect historical orders)
 */
export const deletePattern = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const pattern = await Pattern.findOne({ _id: id, tenantId });
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found',
      });
    }

    // Soft delete so historical orders referencing this pattern string remain intact
    pattern.isActive = false;
    await pattern.save();

    return res.json({
      success: true,
      message: `${pattern.type === 'shirt' ? 'Shirt' : 'Pant'} pattern "${pattern.name}" deleted successfully`,
      data: pattern,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle pattern active status
 */
export const togglePatternStatus = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { isActive } = req.body;

    const pattern = await Pattern.findOne({ _id: id, tenantId });
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found',
      });
    }

    if (isActive !== undefined) {
      pattern.isActive = Boolean(isActive);
    } else {
      pattern.isActive = !pattern.isActive;
    }

    await pattern.save();

    return res.json({
      success: true,
      message: `Pattern "${pattern.name}" status updated`,
      data: pattern,
    });
  } catch (error) {
    next(error);
  }
};

