export const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'gemini', label: 'Google Gemini' },
];

export const modelsByProvider = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
};

export function getModelsForProvider(provider) {
  return modelsByProvider[provider] || modelsByProvider.openai;
}

export function getDefaultModelForProvider(provider) {
  const models = getModelsForProvider(provider);
  return models[0];
}
