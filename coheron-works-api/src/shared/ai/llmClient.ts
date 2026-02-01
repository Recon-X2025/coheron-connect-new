import AIAddonConfig, { IAIAddonConfig } from '../../models/AIAddonConfig.js';

interface ChatMessage { role: string; content: string; }
interface ChatOptions { temperature?: number; max_tokens?: number; json_mode?: boolean; }
interface ChatResponse { content: string; tokens_used: number; }

export class LLMClient {
  private config: IAIAddonConfig;
  constructor(config: IAIAddonConfig) { this.config = config; }

  checkQuota(): boolean { return this.config.tokens_used_this_month < this.config.monthly_token_limit; }

  private async trackUsage(tokens: number): Promise<void> {
    await AIAddonConfig.updateOne({ _id: this.config._id }, { $inc: { tokens_used_this_month: tokens } });
    this.config.tokens_used_this_month += tokens;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    if (!this.checkQuota()) throw new Error("Monthly token quota exceeded");
    const maxTokens = Math.min(options?.max_tokens || this.config.max_tokens_per_request, this.config.max_tokens_per_request);
    switch (this.config.provider) {
      case "openai": return this.chatOpenAI(messages, maxTokens, options);
      case "anthropic": return this.chatAnthropic(messages, maxTokens, options);
      case "ollama": return this.chatOllama(messages, maxTokens, options);
      case "azure_openai": return this.chatAzure(messages, maxTokens, options);
      default: throw new Error("Unsupported provider: " + this.config.provider);
    }
  }

  private async chatOpenAI(messages: ChatMessage[], maxTokens: number, options?: ChatOptions): Promise<ChatResponse> {
    const body: any = { model: this.config.model_name, messages, max_tokens: maxTokens };
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.json_mode) body.response_format = { type: "json_object" };
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + this.config.api_key }, body: JSON.stringify(body),
    });
    if (!resp.ok) { const err = await resp.text(); throw new Error("OpenAI API error " + resp.status + ": " + err); }
    const data: any = await resp.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    await this.trackUsage(tokensUsed);
    return { content: data.choices?.[0]?.message?.content || "", tokens_used: tokensUsed };
  }

  private async chatAnthropic(messages: ChatMessage[], maxTokens: number, options?: ChatOptions): Promise<ChatResponse> {
    const systemMsg = messages.find(m => m.role === "system");
    const nonSystem = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content }));
    const body: any = { model: this.config.model_name, max_tokens: maxTokens, messages: nonSystem };
    if (systemMsg) body.system = systemMsg.content;
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": this.config.api_key, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body),
    });
    if (!resp.ok) { const err = await resp.text(); throw new Error("Anthropic API error " + resp.status + ": " + err); }
    const data: any = await resp.json();
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    await this.trackUsage(tokensUsed);
    return { content: data.content?.map((c: any) => c.text).join("") || "", tokens_used: tokensUsed };
  }

  private async chatOllama(messages: ChatMessage[], _maxTokens: number, _options?: ChatOptions): Promise<ChatResponse> {
    const baseUrl = this.config.base_url || "http://localhost:11434";
    const resp = await fetch(baseUrl + "/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.config.model_name, messages, stream: false }),
    });
    if (!resp.ok) { const err = await resp.text(); throw new Error("Ollama API error " + resp.status + ": " + err); }
    const data: any = await resp.json();
    const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);
    await this.trackUsage(tokensUsed);
    return { content: data.message?.content || "", tokens_used: tokensUsed };
  }

  private async chatAzure(messages: ChatMessage[], maxTokens: number, options?: ChatOptions): Promise<ChatResponse> {
    const url = this.config.base_url + "/openai/deployments/" + this.config.model_name + "/chat/completions?api-version=2024-02-01";
    const body: any = { messages, max_tokens: maxTokens };
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.json_mode) body.response_format = { type: "json_object" };
    const resp = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", "api-key": this.config.api_key }, body: JSON.stringify(body),
    });
    if (!resp.ok) { const err = await resp.text(); throw new Error("Azure OpenAI API error " + resp.status + ": " + err); }
    const data: any = await resp.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    await this.trackUsage(tokensUsed);
    return { content: data.choices?.[0]?.message?.content || "", tokens_used: tokensUsed };
  }

  async embed(text: string): Promise<number[]> {
    if (this.config.provider !== "openai" && this.config.provider !== "azure_openai")
      throw new Error("Embeddings only supported with OpenAI/Azure");
    const isAzure = this.config.provider === "azure_openai";
    const url = isAzure ? this.config.base_url + "/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01" : "https://api.openai.com/v1/embeddings";
    const hdrs: Record<string,string> = { "Content-Type": "application/json" };
    if (isAzure) hdrs["api-key"] = this.config.api_key; else hdrs["Authorization"] = "Bearer " + this.config.api_key;
    const resp = await fetch(url, { method: "POST", headers: hdrs, body: JSON.stringify({ model: "text-embedding-ada-002", input: text }) });
    if (!resp.ok) throw new Error("Embeddings error " + resp.status);
    const data: any = await resp.json();
    await this.trackUsage(data.usage?.total_tokens || 0);
    return data.data?.[0]?.embedding || [];
  }
}

const cc=new Map();
export async function getLLMClient(tid:string){
  const x:any=cc.get(tid);if(x&&Date.now()-x.t<60000)return x.client;
  const cfg=await AIAddonConfig.findOne({tenant_id:tid});
  if(!cfg)throw new Error("AI not configured");
  const cl=new LLMClient(cfg);cc.set(tid,{client:cl,t:Date.now()});return cl;
}
