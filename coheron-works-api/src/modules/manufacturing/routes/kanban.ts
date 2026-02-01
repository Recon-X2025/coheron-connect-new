import express from 'express';
import { KanbanBoard } from '../models/KanbanBoard.js';
import { KanbanCard } from '../models/KanbanCard.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ==================== Boards ====================

router.get('/boards', asyncHandler(async (req: any, res) => {
  const { is_active, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    KanbanBoard.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    KanbanBoard.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

router.post('/boards', asyncHandler(async (req: any, res) => {
  const board = await KanbanBoard.create({ ...req.body, tenant_id: req.user.tenant_id, created_by: req.user._id });
  res.status(201).json(board);
}));

router.get('/boards/:id', asyncHandler(async (req: any, res) => {
  const board = await KanbanBoard.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).lean();
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const cards = await KanbanCard.find({ tenant_id: req.user.tenant_id, board_id: board._id, status: 'active' })
    .populate('product_id', 'name sku').lean();

  res.json({ ...board, cards });
}));

router.put('/boards/:id', asyncHandler(async (req: any, res) => {
  const board = await KanbanBoard.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true }
  );
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
}));

router.delete('/boards/:id', asyncHandler(async (req: any, res) => {
  const board = await KanbanBoard.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!board) return res.status(404).json({ error: 'Board not found' });
  await KanbanCard.deleteMany({ board_id: board._id });
  res.json({ message: 'Board deleted' });
}));

// ==================== Cards ====================

router.get('/cards', asyncHandler(async (req: any, res) => {
  const { board_id, status, priority, signal_type, page = 1, limit = 50 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (board_id) filter.board_id = board_id;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (signal_type) filter.signal_type = signal_type;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    KanbanCard.find(filter).populate('product_id', 'name sku').sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    KanbanCard.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

router.post('/cards', asyncHandler(async (req: any, res) => {
  const card = await KanbanCard.create({ ...req.body, tenant_id: req.user.tenant_id, triggered_by: req.user._id });
  res.status(201).json(card);
}));

router.get('/cards/:id', asyncHandler(async (req: any, res) => {
  const card = await KanbanCard.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('product_id', 'name sku').lean();
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
}));

router.put('/cards/:id', asyncHandler(async (req: any, res) => {
  const card = await KanbanCard.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true }
  );
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
}));

router.delete('/cards/:id', asyncHandler(async (req: any, res) => {
  const card = await KanbanCard.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json({ message: 'Card deleted' });
}));

// PUT /cards/:id/move
router.put('/cards/:id/move', asyncHandler(async (req: any, res) => {
  const { column_name } = req.body;
  if (!column_name) return res.status(400).json({ error: 'column_name is required' });

  const card = await KanbanCard.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const board = await KanbanBoard.findById(card.board_id).lean();
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const col = board.columns.find(c => c.name === column_name);
  if (!col) return res.status(400).json({ error: 'Column not found on board' });

  // Check WIP limit
  if (col.wip_limit > 0) {
    const count = await KanbanCard.countDocuments({ board_id: card.board_id, column_name, status: 'active' });
    if (count >= col.wip_limit) return res.status(400).json({ error: `WIP limit reached for column ${column_name}` });
  }

  card.column_name = column_name;
  await card.save();
  res.json(card);
}));

// GET /boards/:id/metrics
router.get('/boards/:id/metrics', asyncHandler(async (req: any, res) => {
  const board = await KanbanBoard.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).lean();
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const activeCards = await KanbanCard.find({ board_id: board._id, status: 'active' }).lean();
  const completedCards = await KanbanCard.find({ board_id: board._id, status: 'completed' }).lean();

  const wipByColumn: Record<string, number> = {};
  for (const col of board.columns) wipByColumn[col.name] = 0;
  for (const card of activeCards) wipByColumn[card.column_name] = (wipByColumn[card.column_name] || 0) + 1;

  const cycleTimes = completedCards.filter(c => c.cycle_time_hours > 0).map(c => c.cycle_time_hours);
  const avgCycleTime = cycleTimes.length > 0 ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 100) / 100 : 0;

  res.json({
    board_name: board.name,
    total_active: activeCards.length,
    total_completed: completedCards.length,
    wip_by_column: wipByColumn,
    avg_cycle_time_hours: avgCycleTime,
    throughput_last_7_days: completedCards.filter(c => c.completed_at && new Date(c.completed_at) > new Date(Date.now() - 7 * 86400000)).length,
  });
}));

export default router;
