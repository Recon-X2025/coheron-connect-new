import OpenAI from 'openai';
import logger from '../../shared/utils/logger.js';
import mongoose from 'mongoose';

interface LLMOptions {
  provider?: 'openai' | 'anthropic' | 'ollama';
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tenantId?: string;
  systemPrompt?: string;
}

interface LLMResponse {
  content: string;
  model: string;
  tokens_used: { prompt: number; completion: number; total: number };
  provider: string;
}

class LLMGateway {
  private async getProviderConfig(tenantId?: string): Promise<{ provider: string; apiKey: string; model: string; baseURL?: string }> {
    // Check tenant-specific config first
    if (tenantId) {
      try {
        const TenantConfig = mongoose.models.TenantConfig || mongoose.model('TenantConfig');
        const config = await TenantConfig.findOne({ tenant_id: tenantId }).lean() as any;
        if (config?.ai_config?.api_key) {
          return {
            provider: config.ai_config.provider || 'openai',
            apiKey: config.ai_config.api_key,
            model: config.ai_config.model || 'gpt-4o-mini',
            baseURL: config.ai_config.base_url,
          };
        }
      } catch { /* fall through to env vars */ }
    }

    const provider = process.env.LLM_PROVIDER || 'openai';
    if (provider === 'openai') {
      return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o-mini' };
    } else if (provider === 'anthropic') {
      return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY || '', model: 'claude-3-haiku-20240307' };
    } else {
      return { provider: 'ollama', apiKey: '', model: 'llama3', baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/v1' };
    }
  }

  async sendMessage(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const config = await this.getProviderConfig(options.tenantId);
    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error(`LLM provider ${config.provider} not configured. Set ${config.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} env var or configure in tenant settings.`);
    }

    const model = options.model || config.model;
    const maxTokens = options.maxTokens || 1024;

    if (config.provider === 'openai' || config.provider === 'ollama') {
      const client = new OpenAI({
        apiKey: config.apiKey || 'ollama',
        baseURL: config.baseURL,
      });
      const messages: any[] = [];
      if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.3,
      });

      return {
        content: response.choices[0]?.message?.content || '',
        model,
        tokens_used: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
        provider: config.provider,
      };
    }

    // Anthropic via fetch (their SDK is separate)
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: options.systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.3,
      }),
    });
    const data = await resp.json() as any;
    if (data.error) throw new Error(`Anthropic API error: ${data.error.message}`);

    return {
      content: data.content?.[0]?.text || '',
      model,
      tokens_used: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      provider: 'anthropic',
    };
  }

  async *streamMessage(prompt: string, options: LLMOptions = {}): AsyncGenerator<string> {
    const config = await this.getProviderConfig(options.tenantId);
    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error(`LLM provider ${config.provider} not configured.`);
    }
    const model = options.model || config.model;

    if (config.provider === 'openai' || config.provider === 'ollama') {
      const client = new OpenAI({ apiKey: config.apiKey || 'ollama', baseURL: config.baseURL });
      const messages: any[] = [];
      if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const stream = await client.chat.completions.create({
        model,
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.3,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    }
    // For Anthropic streaming, would need SSE parsing - skip for now, use non-streaming
  }
}

export const llmGateway = new LLMGateway();
