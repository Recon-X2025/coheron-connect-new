import express from 'express';
import mongoose from 'mongoose';
import FixedAsset from '../../../models/FixedAsset.js';
import AssetCategory from '../../../models/AssetCategory.js';
import AssetDepreciation from '../../../models/AssetDepreciation.js';
import AssetDisposal from '../../../models/AssetDisposal.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ========== ASSET CATEGORIES ==========

router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  const categories = await AssetCategory.find().sort({ name: 1 }).lean();
  res.json(categories);
}));

// ========== ASSETS ==========

// Get all assets
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { category_id, state, search } = req.query;
  const filter: any = {};

  if (category_id) filter.category_id = category_id;
  if (state) filter.state = state;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    FixedAsset.find(filter)
      .populate('category_id', 'name')
      .populate('partner_id', 'name')
      .populate('custodian_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, FixedAsset
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    id: a._id,
    category_name: a.category_id?.name || null,
    partner_name: a.partner_id?.name || null,
    custodian_name: a.custodian_id?.name || null,
    category_id: a.category_id?._id || a.category_id,
    partner_id: a.partner_id?._id || a.partner_id,
    custodian_id: a.custodian_id?._id || a.custodian_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get asset by ID with depreciation history
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id)
    .populate('category_id', 'name')
    .populate('partner_id', 'name')
    .populate('custodian_id', 'name')
    .lean();

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Get depreciation history
  const depreciation_history = await AssetDepreciation.find({ asset_id: req.params.id })
    .sort({ period_start: -1 })
    .lean();

  // Get disposal info if exists
  const disposal = await AssetDisposal.findOne({ asset_id: req.params.id }).lean();

  const result = {
    ...asset,
    id: (asset as any)._id,
    category_name: (asset.category_id as any)?.name || null,
    partner_name: (asset.partner_id as any)?.name || null,
    custodian_name: (asset.custodian_id as any)?.name || null,
    category_id: (asset.category_id as any)?._id || asset.category_id,
    partner_id: (asset.partner_id as any)?._id || asset.partner_id,
    custodian_id: (asset.custodian_id as any)?._id || asset.custodian_id,
    depreciation_history,
    disposal: disposal || null,
  };

  res.json(result);
}));

// Create asset
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    name,
    code,
    category_id,
    partner_id,
    purchase_date,
    purchase_value,
    salvage_value,
    useful_life_years,
    location,
    custodian_id,
    currency_id,
    notes,
  } = req.body;

  const asset = await FixedAsset.create({
    name,
    code: code || null,
    category_id,
    partner_id: partner_id || null,
    purchase_date,
    purchase_value,
    current_value: purchase_value,
    salvage_value: salvage_value || 0,
    useful_life_years,
    location: location || null,
    custodian_id: custodian_id || null,
    currency_id: currency_id || null,
    notes: notes || null,
    state: 'draft',
  });

  res.status(201).json(asset);
}));

// Run depreciation for asset
router.post('/:id/depreciate', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const assetId = req.params.id;
    const { period_start, period_end } = req.body;

    const asset = await FixedAsset.findById(assetId).session(session);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.state !== 'open') {
      return res.status(400).json({ error: 'Asset is not in open state' });
    }

    // Calculate depreciation (straight-line method)
    const depreciableValue = asset.current_value - asset.salvage_value;
    const monthlyDepreciation = depreciableValue / (asset.useful_life_years * 12);

    // Get last depreciation to calculate accumulated
    const lastDep = await AssetDepreciation.findOne({ asset_id: assetId })
      .sort({ period_end: -1 })
      .session(session);

    let accumulatedDepreciation = 0;
    let bookValue = asset.purchase_value;

    if (lastDep) {
      accumulatedDepreciation = lastDep.accumulated_depreciation || 0;
      bookValue = lastDep.book_value || asset.current_value;
    }

    const newAccumulated = accumulatedDepreciation + monthlyDepreciation;
    const newBookValue = Math.max(bookValue - monthlyDepreciation, asset.salvage_value);

    // Create depreciation record
    const [depreciation] = await AssetDepreciation.create([{
      asset_id: assetId,
      period_start,
      period_end,
      depreciation_amount: monthlyDepreciation,
      accumulated_depreciation: newAccumulated,
      book_value: newBookValue,
      state: 'draft',
    }], { session });

    // Update asset current value
    asset.current_value = newBookValue;
    await asset.save({ session });

    await session.commitTransaction();

    res.status(201).json(depreciation);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error running depreciation:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    session.endSession();
  }
});

// Dispose asset
router.post('/:id/dispose', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const assetId = req.params.id;
    const { disposal_date, disposal_type, disposal_value, notes } = req.body;

    const asset = await FixedAsset.findById(assetId).session(session);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.state !== 'open') {
      return res.status(400).json({ error: 'Asset is not in open state' });
    }

    // Calculate gain/loss
    const gainLoss = parseFloat(disposal_value || 0) - asset.current_value;

    // Create disposal record
    const [disposal] = await AssetDisposal.create([{
      asset_id: assetId,
      disposal_date,
      disposal_type,
      disposal_value: disposal_value || 0,
      gain_loss: gainLoss,
      notes: notes || null,
    }], { session });

    // Update asset state
    asset.state = 'removed';
    await asset.save({ session });

    await session.commitTransaction();

    res.status(201).json(disposal);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error disposing asset:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    session.endSession();
  }
});

export default router;
