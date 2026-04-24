import { createOpenAI } from '@ai-sdk/openai';
import { BaseProvider } from './baseProvider.js';

export class OpenAIProvider extends BaseProvider {
  get providerKey() {
    return 'openai';
  }

  createModel() {
    const openai = createOpenAI({ apiKey: this.apiKey });
    return openai(this.getResolvedModelId());
  }
}