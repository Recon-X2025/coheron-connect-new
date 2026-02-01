import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { requireAIAddon } from '../../../shared/middleware/aiAddon.js';
import { getLLMClient } from '../../../shared/ai/llmClient.js';
import AIQuery from '../../../models/AIQuery.js';

const router = express.Router();

router.post("/chat", requireAIAddon("copilot_chat"), asyncHandler(async (req: any, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const systemPrompt = "You are an ERP copilot assistant for CoheronERP. Help users with sales, inventory, accounting, HR, and project management tasks. Be concise and actionable.";
  const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: message }];
  const start = Date.now();
  const result = await client.chat(messages);
  await AIQuery.create({ tenant_id: req.user.tenant_id, user_id: req.user._id || req.user.id, query_text: message, query_type: "natural_language", context: context || {}, response_text: result.content, model_used: req.aiConfig.model_name, tokens_used: result.tokens_used, response_time_ms: Date.now() - start });
  res.json({ success: true, data: { response: result.content, tokens_used: result.tokens_used } });
}));

router.post("/sales/qualify-lead", requireAIAddon("sales_qualification"), asyncHandler(async (req: any, res) => {
  const { lead_id, lead_data } = req.body;
  if (!lead_id) return res.status(400).json({ error: "lead_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const prompt = "Analyze this lead and provide: 1) A qualification score (1-100), 2) Key strengths, 3) Key concerns, 4) Recommended next actions. Lead data: " + JSON.stringify(lead_data || {});
  const result = await client.chat([{ role: "system", content: "You are a B2B sales qualification expert. Respond in JSON format with fields: score, strengths, concerns, next_actions." }, { role: "user", content: prompt }], { json_mode: true });
  res.json({ success: true, data: { lead_id, analysis: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/sales/deal-risk", requireAIAddon("deal_risk_detection"), asyncHandler(async (req: any, res) => {
  const { deal_id, deal_data, activity_history } = req.body;
  if (!deal_id) return res.status(400).json({ error: "deal_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const prompt = "Assess risks for this deal. Deal: " + JSON.stringify(deal_data || {}) + " Activities: " + JSON.stringify(activity_history || []);
  const result = await client.chat([{ role: "system", content: "You are a deal risk analyst. Respond in JSON: { risk_level: high/medium/low, risk_score: 0-100, risks: [{category, description, mitigation}], overall_assessment }" }, { role: "user", content: prompt }], { json_mode: true });
  res.json({ success: true, data: { deal_id, analysis: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/sales/predict-score", requireAIAddon("predictive_scoring"), asyncHandler(async (req: any, res) => {
  const { lead_id, lead_data, historical_leads } = req.body;
  if (!lead_id) return res.status(400).json({ error: "lead_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const prompt = "Score this lead 0-100 based on conversion likelihood. Lead: " + JSON.stringify(lead_data || {}) + " Historical: " + JSON.stringify((historical_leads || []).slice(0, 10));
  const result = await client.chat([{ role: "system", content: "You are a predictive scoring model. Respond in JSON: { score: number, confidence: number, factors: [{name, impact, description}] }" }, { role: "user", content: prompt }], { json_mode: true });
  res.json({ success: true, data: { lead_id, prediction: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/accounting/parse-invoice", requireAIAddon("document_parsing"), asyncHandler(async (req: any, res) => {
  const { text_content } = req.body;
  if (!text_content) return res.status(400).json({ error: "text_content is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Extract invoice data. Respond in JSON: { vendor_name, invoice_number, invoice_date, due_date, currency, subtotal, tax_amount, total_amount, line_items: [{description, quantity, unit_price, amount}] }" }, { role: "user", content: "Parse this invoice text: " + text_content }], { json_mode: true });
  res.json({ success: true, data: { parsed: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/accounting/bookkeeping-suggest", requireAIAddon("bookkeeping_agent"), asyncHandler(async (req: any, res) => {
  const { transaction_description, amount } = req.body;
  if (!transaction_description) return res.status(400).json({ error: "transaction_description is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "You are a bookkeeping expert. Suggest account mappings. Respond in JSON: { debit_account: {code, name}, credit_account: {code, name}, category, confidence, explanation }" }, { role: "user", content: "Transaction: " + transaction_description + " Amount: " + amount }], { json_mode: true });
  res.json({ success: true, data: { suggestion: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/accounting/cashflow-forecast", requireAIAddon("cashflow_forecast"), asyncHandler(async (req: any, res) => {
  const { recent_transactions, forecast_days } = req.body;
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "You are a financial analyst. Forecast cash flow. Respond in JSON: { forecast: [{period, projected_inflow, projected_outflow, net_cashflow, cumulative}], summary, risks, recommendations }" }, { role: "user", content: "Based on recent 90 days of transactions: " + JSON.stringify((recent_transactions || []).slice(0, 100)) + " Forecast next " + (forecast_days || 90) + " days." }], { json_mode: true });
  res.json({ success: true, data: { forecast: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/hr/parse-cv", requireAIAddon("cv_parsing"), asyncHandler(async (req: any, res) => {
  const { cv_text } = req.body;
  if (!cv_text) return res.status(400).json({ error: "cv_text is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Extract CV data. Respond in JSON: { name, email, phone, location, summary, skills: [], experience: [{company, title, start_date, end_date, description}], education: [{institution, degree, field, year}], certifications: [] }" }, { role: "user", content: "Parse this CV: " + cv_text }], { json_mode: true });
  res.json({ success: true, data: { parsed: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/hr/match-candidates", requireAIAddon("cv_parsing"), asyncHandler(async (req: any, res) => {
  const { job_description, candidates } = req.body;
  if (!job_description || !candidates) return res.status(400).json({ error: "job_description and candidates are required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Rank candidates for job fit. Respond in JSON: { rankings: [{candidate_id, score, strengths, gaps, recommendation}] }" }, { role: "user", content: "Job: " + job_description + " Candidates: " + JSON.stringify(candidates) }], { json_mode: true });
  res.json({ success: true, data: { rankings: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/projects/status-report", requireAIAddon("status_reports"), asyncHandler(async (req: any, res) => {
  const { project_id, project_data } = req.body;
  if (!project_id) return res.status(400).json({ error: "project_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Generate a project status report. Respond in JSON: { executive_summary, progress_pct, milestones_status: [{name, status, notes}], risks: [], blockers: [], next_steps: [], budget_status }" }, { role: "user", content: "Project data: " + JSON.stringify(project_data || {}) }], { json_mode: true });
  res.json({ success: true, data: { project_id, report: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/projects/risk-assessment", requireAIAddon("status_reports"), asyncHandler(async (req: any, res) => {
  const { project_id, project_data } = req.body;
  if (!project_id) return res.status(400).json({ error: "project_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Assess project risks. Respond in JSON: { overall_risk: high/medium/low, risk_score: 0-100, timeline_risk, budget_risk, resource_risk, risks: [{category, description, probability, impact, mitigation}] }" }, { role: "user", content: "Analyze: " + JSON.stringify(project_data || {}) }], { json_mode: true });
  res.json({ success: true, data: { project_id, assessment: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/marketing/generate-content", requireAIAddon("marketing_agents"), asyncHandler(async (req: any, res) => {
  const { type, topic, tone, audience } = req.body;
  if (!type || !topic) return res.status(400).json({ error: "type and topic are required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "You are a marketing content expert. Generate " + type + " content. Respond in JSON: { subject, body, cta, hashtags, character_count }" }, { role: "user", content: "Topic: " + topic + " Tone: " + (tone || "professional") + " Audience: " + (audience || "general") }], { json_mode: true });
  res.json({ success: true, data: { content: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/marketing/lookalike", requireAIAddon("lookalike_lists"), asyncHandler(async (req: any, res) => {
  const { source_partners, all_partners } = req.body;
  if (!source_partners) return res.status(400).json({ error: "source_partners required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Analyze common traits and find lookalike profiles. Respond in JSON: { common_traits: [], lookalike_ids: [], scoring_criteria, confidence }" }, { role: "user", content: "Source: " + JSON.stringify(source_partners) + " Pool: " + JSON.stringify((all_partners || []).slice(0, 50)) }], { json_mode: true });
  res.json({ success: true, data: { analysis: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

router.post("/marketing/negative-score", requireAIAddon("negative_scoring"), asyncHandler(async (req: any, res) => {
  const { lead_id, lead_data, engagement_history } = req.body;
  if (!lead_id) return res.status(400).json({ error: "lead_id is required" });
  const client = await getLLMClient(String(req.user.tenant_id));
  const result = await client.chat([{ role: "system", content: "Analyze disengagement signals. Respond in JSON: { negative_score: 0-100, signals: [{type, description, weight}], recommendation, churn_risk }" }, { role: "user", content: "Lead: " + JSON.stringify(lead_data || {}) + " History: " + JSON.stringify(engagement_history || []) }], { json_mode: true });
  res.json({ success: true, data: { lead_id, analysis: JSON.parse(result.content), tokens_used: result.tokens_used } });
}));

export default router;
