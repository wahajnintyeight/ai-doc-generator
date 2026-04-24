export const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'gemini', label: 'Google Gemini' },
];

// Single source of truth for built-in provider models.
export const modelsByProvider = {
  openai: [
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  openrouter: [
    { id: 'tencent/hy3-preview:free', name: 'Tencent: Hy3 preview (free)', description: 'High-efficiency MoE model for agentic workflows', free: true },
    { id: 'xiaomi/mimo-v2.5-pro', name: 'Xiaomi: MiMo-V2.5-Pro', description: 'Flagship model for complex software engineering' },
    { id: 'xiaomi/mimo-v2.5', name: 'Xiaomi: MiMo-V2.5', description: 'Native omnimodal model with multimodal perception' },
    { id: 'openai/gpt-5.4-image-2', name: 'OpenAI: GPT-5.4 Image 2', description: 'Multimodal with image generation capabilities' },
    { id: 'inclusionai/ling-2.6-flash:free', name: 'inclusionAI: Ling-2.6-flash (free)', description: 'Fast responses with high token efficiency', free: true },
    { id: 'inclusionai/ling-2.6-1t:free', name: 'inclusionAI: Ling-2.6-1T (free)', description: 'Instant instruct model for fast, efficient agent workflows', free: true },
    { id: '~anthropic/claude-opus-latest', name: 'Anthropic: Claude Opus Latest', description: 'Latest model in Claude Opus family' },
    { id: 'openrouter/pareto-code', name: 'Pareto Code Router', description: 'Auto-selects strong coding model' },
    { id: 'baidu/qianfan-ocr-fast:free', name: 'Baidu: Qianfan-OCR-Fast (free)', description: 'Specialized OCR multimodal model', free: true },
    { id: 'moonshotai/kimi-k2.6', name: 'MoonshotAI: Kimi K2.6', description: 'Long-horizon coding and UI/UX generation' },
    { id: 'anthropic/claude-opus-4.7', name: 'Anthropic: Claude Opus 4.7', description: 'Built for long-running asynchronous agents' },
    { id: 'anthropic/claude-opus-4.6-fast', name: 'Anthropic: Claude Opus 4.6 (Fast)', description: 'Fast-mode variant with higher output speed' },
    { id: 'z-ai/glm-5.1', name: 'Z.ai: GLM 5.1', description: 'Major leap in coding capability' },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google: Gemma 4 26B A4B (free)', description: 'MoE model with 3.8B active parameters', free: true },
    { id: 'google/gemma-4-26b-a4b-it', name: 'Google: Gemma 4 26B A4B', description: 'MoE model with 3.8B active parameters' },
    { id: 'google/gemma-4-31b-it:free', name: 'Google: Gemma 4 31B (free)', description: 'Dense multimodal model with 256K context', free: true },
    { id: 'google/gemma-4-31b-it', name: 'Google: Gemma 4 31B', description: 'Dense multimodal model with 256K context' },
    { id: 'qwen/qwen3.6-plus', name: 'Qwen: Qwen3.6 Plus', description: 'Hybrid architecture with linear attention' },
    { id: 'z-ai/glm-4.5-air:free', name: 'Z.ai: GLM-4.5-Air (free)', description: 'Lightweight MoE model with thinking and non-thinking modes', free: true },
    { id: 'z-ai/glm-5v-turbo', name: 'Z.ai: GLM 5V Turbo', description: 'Native multimodal agent foundation model' },
    { id: 'minimax/minimax-m2.5:free', name: 'MiniMax: MiniMax M2.5 (free)', description: 'SOTA model for real-world productivity', free: true },
    { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LiquidAI: LFM2.5-1.2B-Thinking (free)', description: 'Lightweight reasoning-focused model', free: true },
    { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'LiquidAI: LFM2.5-1.2B-Instruct (free)', description: 'Optimized for edge devices', free: true },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA: Nemotron Nano 12B 2 VL (free)', description: 'Multimodal vision-language model', free: true },
    { id: 'openai/gpt-4.1-mini', name: 'OpenAI GPT-4.1 Mini' },
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
  ],
  gemini: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
};

export function normalizeModelOptions(modelOptions = []) {
  return modelOptions
    .map((model) => {
      if (typeof model === 'string') {
        return { id: model, name: model };
      }

      if (!model?.id) {
        return null;
      }

      return {
        id: model.id,
        name: model.name || model.id,
        description: model.description || '',
      };
    })
    .filter(Boolean);
}

export function getModelsForProvider(provider) {
  return modelsByProvider[provider] || modelsByProvider.openai;
}

export function getDefaultModelForProvider(provider) {
  const models = getModelsForProvider(provider);
  return models[0]?.id || 'gpt-4.1';
}
