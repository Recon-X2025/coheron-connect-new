import express from 'express';
import mongoose from 'mongoose';
import BankFeed from '../../../models/BankFeed.js';
import BankFeedTransaction from '../../../models/BankFeedTransaction.js';
import AccountMove from '../../../models/AccountMove.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const feeds = await BankFeed.find({ tenant_id }).sort({ created_at: -1 });
  res.json(feeds);
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?._id;
  const feed = await BankFeed.create({ ...req.body, tenant_id, created_by: userId });
  res.status(201).json(feed);
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const feed = await BankFeed.findOneAndUpdate({ _id: req.params.id, tenant_id }, { $set: req.body }, { new: true });
  if (!feed) return res.status(404).json({ error: 'Bank feed not found' });
  res.json(feed);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const feed = await BankFeed.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (!feed) return res.status(404).json({ error: 'Bank feed not found' });
  await BankFeedTransaction.deleteMany({ bank_feed_id: feed._id });
  res.json({ message: 'Bank feed and associated transactions deleted' });
}));

router.post('/:id/sync', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const feed = await BankFeed.findOne({ _id: req.params.id, tenant_id });
  if (!feed) return res.status(404).json({ error: 'Bank feed not found' });
  feed.last_synced_at = new Date();
  await feed.save();
  res.json({ message: 'Sync triggered', last_synced_at: feed.last_synced_at });
}));

router.get('/:id/transactions', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { match_status, start_date, end_date } = req.query;
  const filter: any = { tenant_id, bank_feed_id: req.params.id };
  if (match_status) filter.match_status = match_status;
  if (start_date || end_date) {
    filter.date = {};
    if (start_date) filter.date.$gte = new Date(start_date as string);
    if (end_date) filter.date.$lte = new Date(end_date as string);
  }
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(BankFeedTransaction.find(filter).sort({ date: -1 }), pagination, filter, BankFeedTransaction);
  res.json(result);
}));

router.post('/transactions/:id/match', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?._id;
  const { journal_entry_id } = req.body;
  const txn = await BankFeedTransaction.findOne({ _id: req.params.id, tenant_id });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  txn.matched_journal_entry_id = new mongoose.Types.ObjectId(journal_entry_id);
  txn.match_status = 'manually_matched';
  txn.match_confidence = 100;
  txn.matched_at = new Date();
  txn.matched_by = userId;
  await txn.save();
  res.json(txn);
}));

router.post('/transactions/:id/exclude', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const txn = await BankFeedTransaction.findOne({ _id: req.params.id, tenant_id });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  txn.match_status = 'excluded';
  txn.matched_at = new Date();
  txn.matched_by = (req as any).user?._id;
  await txn.save();
  res.json(txn);
}));

router.post('/transactions/auto-match', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const unmatchedTxns = await BankFeedTransaction.find({ tenant_id, match_status: 'unmatched' }).lean();
  let matchedCount = 0;

  for (const txn of unmatchedTxns) {
    const dateRange = new Date(txn.date);
    const dateLow = new Date(dateRange); dateLow.setDate(dateLow.getDate() - 3);
    const dateHigh = new Date(dateRange); dateHigh.setDate(dateHigh.getDate() + 3);
    const candidates = await AccountMove.find({
      date: { $gte: dateLow, $lte: dateHigh },
      amount_total: Math.abs(txn.amount),
      state: 'posted',
    }).lean();

    if (candidates.length === 1) {
      let confidence = 80;
      const candidate = candidates[0] as any;
      if (candidate.date.toISOString().slice(0,10) === new Date(txn.date).toISOString().slice(0,10)) confidence = 95;
      if (txn.description && candidate.ref && txn.description.toLowerCase().includes(candidate.ref.toLowerCase())) confidence = 98;
      await BankFeedTransaction.updateOne({ _id: txn._id }, { $set: {
        matched_journal_entry_id: candidate._id, match_status: 'auto_matched',
        match_confidence: confidence, matched_at: new Date(),
      }});
      matchedCount++;
    }
  }
  res.json({ message: 'Auto-matching complete', total_unmatched: unmatchedTxns.length, matched: matchedCount, remaining_unmatched: unmatchedTxns.length - matchedCount });
}));

router.get('/transactions/unmatched', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    BankFeedTransaction.find({ tenant_id, match_status: 'unmatched' })
      .populate('bank_feed_id', 'bank_name account_name')
      .sort({ date: -1 }),
    pagination, { tenant_id, match_status: 'unmatched' }, BankFeedTransaction);
  res.json(result);
}));

export default router;
