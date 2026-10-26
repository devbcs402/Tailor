import { Pattern } from '../models/Pattern.js';

// Default initial patterns to seed on first load
const DEFAULT_SHIRT_PATTERNS = [
  'Plain',
  'Chex',
  'Stripes',
  'Printed',
  'Kurta Collar',
  'Chinese Collar',
];

const DEFAULT_PANT_PATTERNS = [
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
 * Seed initial patterns if collection is empty
 */
const seedDefaultPatternsIfEmpty = async () => {
  try {
    const count = await Pattern.countDocuments();
    if (count === 0) {
      const initialDocs = [
        ...DEFAULT_SHIRT_PATTERNS.map((name) => ({ name, type: 'shirt', isActive: true })),
        ...DEFAULT_PANT_PATTERNS.map((name) => ({ name, type: 'pant', isActive: true })),
      ];
      await Pattern.insertMany(initialDocs);
      console.log('✓ [Pattern Seeder]: Initial shirt and pant patterns seeded successfully.');
    }
  } catch (err) {
    console.error('Failed to seed default patterns:', err);
  }
};

// Seed on startup check
seedDefaultPatternsIfEmpty();

/**
 * Get patterns (filtered by type: 'shirt' | 'pant' and optional search)
 */
export const getPatterns = async (req, res, next) => {
  try {
    const { type, search = '', all = false } = req.query;

    const query = {};
    if (!all) {
      query.isActive = true;
    }

    if (type && ['shirt', 'pant'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
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
 * Create a new pattern
 */
export const createPattern = async (req, res, next) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name is required',
      });
    }

    if (!type || !['shirt', 'pant'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Pattern type must be either "shirt" or "pant"',
      });
    }

    const trimmedName = name.trim();
    const patternType = type.toLowerCase();

    // Check for case-insensitive duplicate within the same type
    const duplicate = await Pattern.findOne({
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

    // Check if an inactive pattern with this name exists, reactivate it if so
    const inactivePattern = await Pattern.findOne({
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
 * Update an existing pattern name
 */
export const updatePattern = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name cannot be empty',
      });
    }

    const pattern = await Pattern.findById(id);
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found',
      });
    }

    const trimmedName = name.trim();

    // Check duplicate among other active patterns of the same type
    const duplicate = await Pattern.findOne({
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
 * Delete a pattern (Safe soft-deletion to protect historical orders)
 */
export const deletePattern = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pattern = await Pattern.findById(id);
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
