import { Lead } from '../models/Lead.js';

export interface BANTScores {
  budget_score: number;
  authority_score: number;
  need_score: number;
  timeline_score: number;
  total_score: number;
}

export function calculateBANTScores(lead: any): BANTScores {
  const scores: BANTScores = {
    budget_score: 0,
    authority_score: 0,
    need_score: 0,
    timeline_score: 0,
    total_score: 0,
  };

  const bant = lead.bant || {};

  // BUDGET (0-25)
  if (bant.budget) {
    const b = bant.budget;
    if (b.has_budget) scores.budget_score += 10;
    if (b.approved) scores.budget_score += 5;
    if (b.amount > 0) scores.budget_score += 5;
    if (b.timeframe === 'immediate') scores.budget_score += 5;
    else if (b.timeframe === 'this_quarter') scores.budget_score += 3;
    else if (b.timeframe === 'this_year') scores.budget_score += 1;
  }

  // AUTHORITY (0-25)
  if (bant.authority) {
    const a = bant.authority;
    if (a.is_decision_maker) scores.authority_score += 15;
    else if (a.role_in_decision === 'champion') scores.authority_score += 10;
    else if (a.role_in_decision === 'influencer') scores.authority_score += 5;
    if (a.decision_makers && a.decision_makers.length > 0) {
      scores.authority_score += Math.min(a.decision_makers.length * 2, 6);
    }
    if (a.approval_process) scores.authority_score += 4;
  }

  // NEED (0-25)
  if (bant.need) {
    const n = bant.need;
    if (n.identified) scores.need_score += 5;
    if (n.pain_points && n.pain_points.length > 0) {
      scores.need_score += Math.min(n.pain_points.length * 2, 6);
    }
    if (n.business_impact) scores.need_score += 4;
    if (n.requirements && n.requirements.length > 0) {
      scores.need_score += Math.min(n.requirements.length, 5);
    }
    if (n.success_criteria && n.success_criteria.length > 0) {
      scores.need_score += 5;
    }
  }

  // TIMELINE (0-25)
  if (bant.timeline) {
    const t = bant.timeline;
    switch (t.urgency) {
      case 'immediate': scores.timeline_score += 15; break;
      case 'this_month': scores.timeline_score += 12; break;
      case 'this_quarter': scores.timeline_score += 8; break;
      case 'this_half': scores.timeline_score += 5; break;
      case 'this_year': scores.timeline_score += 2; break;
    }
    if (t.expected_decision_date) scores.timeline_score += 4;
    if (t.compelling_event) scores.timeline_score += 4;
    if (t.next_meeting) scores.timeline_score += 2;
  }

  scores.budget_score = Math.min(scores.budget_score, 25);
  scores.authority_score = Math.min(scores.authority_score, 25);
  scores.need_score = Math.min(scores.need_score, 25);
  scores.timeline_score = Math.min(scores.timeline_score, 25);
  scores.total_score = scores.budget_score + scores.authority_score + scores.need_score + scores.timeline_score;

  return scores;
}

export function getQualificationStatus(score: number): string {
  if (score >= 75) return 'sql';
  if (score >= 50) return 'mql';
  return 'unqualified';
}

export async function updateLeadBANTScores(leadId: string): Promise<any> {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('Lead not found');

  const scores = calculateBANTScores(lead);
  const status = getQualificationStatus(scores.total_score);

  const updateData: any = {
    'bant.scores': scores,
    'bant.qualification_status': status,
    'bant.qualified': scores.total_score >= 75,
  };

  if (scores.total_score >= 75 && !(lead as any).bant?.qualified_at) {
    updateData['bant.qualified_at'] = new Date();
  }

  return Lead.findByIdAndUpdate(leadId, { $set: updateData }, { new: true });
}
