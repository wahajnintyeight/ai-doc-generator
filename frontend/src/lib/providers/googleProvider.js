import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { BaseProvider } from './baseProvider.js';

export class GoogleProvider extends BaseProvider {
  get providerKey() {
    return 'gemini';
  }

  createModel() {
    const google = createGoogleGenerativeAI({ apiKey: this.apiKey });
    return google(this.getResolvedModelId());
  }
}