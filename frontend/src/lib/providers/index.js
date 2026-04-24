import { GoogleProvider } from './googleProvider.js';
import { OpenAIProvider } from './openaiProvider.js';
import { OpenRouterProvider } from './openrouterProvider.js';

const PROVIDER_REGISTRY = {
  openai: OpenAIProvider,
  gemini: GoogleProvider,
  google: GoogleProvider,
  openrouter: OpenRouterProvider,
};

function normalizeProviderName(provider) {
  const normalized = String(provider || 'openai').trim().toLowerCase();

  return normalized === 'google' ? 'gemini' : normalized;
}

export function createProviderAdapter({ provider, apiKey, model }) {
  const normalizedProvider = normalizeProviderName(provider);
  const ProviderClass = PROVIDER_REGISTRY[normalizedProvider] || OpenAIProvider;

  return new ProviderClass({ apiKey, model });
}

export {
  BaseProvider,
} from './baseProvider.js';
export { GoogleProvider } from './googleProvider.js';
export { OpenAIProvider } from './openaiProvider.js';
export { OpenRouterProvider } from './openrouterProvider.js';