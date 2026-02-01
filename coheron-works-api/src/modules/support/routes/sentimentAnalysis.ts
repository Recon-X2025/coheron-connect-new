import { Router, Request, Response } from 'express';
import { TicketSentiment } from '../models/TicketSentiment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = Router();

// Analyze sentiment for a ticket
router.post('/analyze/:ticketId', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { ticketId } = req.params;

  // Simulated sentiment analysis (in production, call AI service)
  const keywords = req.body.text || '';
  const negativeWords = ['angry', 'frustrated', 'terrible', 'worst', 'unacceptable', 'disappointed', 'broken', 'useless', 'hate', 'awful'];
  const positiveWords = ['thank', 'great', 'excellent', 'love', 'perfect', 'amazing', 'helpful', 'appreciate', 'wonderful', 'fantastic'];
  const lowerText = keywords.toLowerCase();
  const negCount = negativeWords.filter(w => lowerText.includes(w)).length;
  const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const score = Math.max(-1, Math.min(1, (posCount - negCount) / Math.max(1, posCount + negCount)));
  const sentiment = score > 0.3 ? 'positive' : score < -0.3 ? (score < -0.6 ? 'frustrated' : 'negative') : 'neutral';
  const risk = score < -0.6 ? 'critical' : score < -0.3 ? 'high' : score < 0 ? 'medium' : 'low';
  const csat = Math.max(1, Math.min(5, Math.round((score + 1) * 2.5)));
  const riskFactors: string[] = [];
  if (negCount > 2) riskFactors.push('Multiple negative expressions');
  if (lowerText.includes('cancel')) riskFactors.push('Cancellation intent');
  if (lowerText.includes('competitor')) riskFactors.push('Competitor mention');
  if (lowerText.includes('escalate') || lowerText.includes('manager')) riskFactors.push('Escalation request');

  const result = await TicketSentiment.findOneAndUpdate(
    { tenant_id, ticket_id: ticketId },
    { tenant_id, ticket_id: ticketId, messages_analyzed: (req.body.message_count || 1), overall_sentiment: sentiment, sentiment_score: score, escalation_risk: risk, predicted_csat: csat, risk_factors: riskFactors, analyzed_at: new Date() },
    { upsert: true, new: true }
  );
  res.json({ data: result });
}));

// At-risk tickets
router.get('/at-risk', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const tickets = await TicketSentiment.find({
    tenant_id,
    escalation_risk: { $in: ['high', 'critical'] },
  }).sort({ sentiment_score: 1 }).limit(50);
  res.json({ data: tickets });
}));

// Dashboard
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const [sentimentDist, riskDist, avgCsat, total] = await Promise.all([
    TicketSentiment.aggregate([{ $match: { tenant_id } }, { $group: { _id: '$overall_sentiment', count: { $sum: 1 } } }]),
    TicketSentiment.aggregate([{ $match: { tenant_id } }, { $group: { _id: '$escalation_risk', count: { $sum: 1 } } }]),
    TicketSentiment.aggregate([{ $match: { tenant_id } }, { $group: { _id: null, avg: { $avg: '$predicted_csat' } } }]),
    TicketSentiment.countDocuments({ tenant_id }),
  ]);
  res.json({
    data: {
      total_analyzed: total,
      sentiment_distribution: sentimentDist,
      risk_distribution: riskDist,
      avg_predicted_csat: avgCsat[0]?.avg || 0,
    },
  });
}));

// Trends
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 86400000);
  const trends = await TicketSentiment.aggregate([
    { $match: { tenant_id, analyzed_at: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$analyzed_at' } }, avg_score: { $avg: '$sentiment_score' }, avg_csat: { $avg: '$predicted_csat' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ data: trends });
}));

export default router;
