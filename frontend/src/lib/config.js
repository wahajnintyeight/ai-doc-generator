import { LoadConfig, SaveConfig } from '../../wailsjs/go/main/App';

export class ConfigManager {
  constructor() {
    this.config = {
      theme: 'dark',
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o',
      lastUsed: new Date().toISOString()
    };
    this._initialized = false;
  }

  /**
   * Initializes the config manager by loading from the backend.
   * Uses Wails bindings (App.LoadConfig) which handles the USERDATA folder.
   */
  async init() {
    try {
      const saved = await LoadConfig();
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
      this._initialized = true;
      return this.config;
    } catch (err) {
      console.error('Failed to load config:', err);
      return this.config;
    }
  }

  get(key) {
    return this.config[key];
  }

  async set(key, value) {
    this.config[key] = value;
    this.config.lastUsed = new Date().toISOString();
    await this.save();
  }

  async update(newConfig) {
    this.config = { ...this.config, ...newConfig, lastUsed: new Date().toISOString() };
    await this.save();
  }

  async save() {
    try {
      await SaveConfig(JSON.stringify(this.config));
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }

  /**
   * Syncs the theme with the document element for immediate effect.
   */
  applyTheme() {
    const theme = this.get('theme') || 'dark';
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'dracula');
    root.classList.add(theme);
    
    // Also update data-theme for compatibility with some tailwind setups
    root.setAttribute('data-theme', theme);
  }
}

export const configManager = new ConfigManager();
