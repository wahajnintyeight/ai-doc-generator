import { getDefaultModelForProvider } from '../modelCatalog';

export class BaseProvider {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  get providerKey() {
    throw new Error('providerKey must be implemented by a provider subclass.');
  }

  getResolvedModelId() {
    return this.model || getDefaultModelForProvider(this.providerKey);
  }

  createModel() {
    throw new Error('createModel must be implemented by a provider subclass.');
  }
}