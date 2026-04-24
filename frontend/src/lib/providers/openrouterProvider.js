import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { BaseProvider } from './baseProvider.js';

export class OpenRouterProvider extends BaseProvider {
  get providerKey() {
    return 'openrouter';
  }

  createModel() {
    const openrouter = createOpenRouter({ apiKey: this.apiKey });
    return openrouter.chat(this.getResolvedModelId());
  }
}