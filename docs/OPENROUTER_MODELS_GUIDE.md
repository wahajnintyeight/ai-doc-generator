# OpenRouter Models Integration Guide

## What's New

Your document generation app now supports dynamic model loading from OpenRouter, giving you access to the latest AI models without needing app updates.

## Features

### 1. Dynamic Model Loading
- Fetches the latest available models directly from OpenRouter API
- Always up-to-date with newest model releases
- Automatic sorting by provider popularity

### 2. Searchable Model Selection
- Search through hundreds of models instantly
- Filter by model name or ID
- See model descriptions in the dropdown

### 3. Custom Model Support
- Type any model ID manually
- Press Enter to use custom models
- Perfect for beta models or special access models

## How to Use

### Step 1: Open Settings
Click the Settings icon in the toolbar or agent pane

### Step 2: Select OpenRouter Provider
Choose "OpenRouter" from the provider options

### Step 3: Enter API Key
Add your OpenRouter API key (get one at https://openrouter.ai)

### Step 4: Select Model
- The app automatically fetches available models
- Use the search box to filter models
- Click a model to select it
- Or type a custom model ID and press Enter

### Step 5: Refresh Models (Optional)
Click the refresh icon next to "Model Selection" to reload the latest models

## Model Selection Tips

### Popular Models
The dropdown prioritizes popular providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Meta (Llama)
- Mistral AI

### Custom Models
If you have access to:
- Beta models
- Private models
- Newly released models not yet in the list

Simply type the full model ID (e.g., `openai/gpt-4-turbo-preview`) and press Enter.

### Model Information
Each model in the dropdown shows:
- Model name
- Brief description
- Provider

## Troubleshooting

### Models Not Loading
- Verify your API key is correct
- Check your internet connection
- Click the refresh button to retry
- Falls back to default model list if API fails

### Custom Model Not Working
- Ensure the model ID is correct (format: `provider/model-name`)
- Check OpenRouter documentation for exact model IDs
- Verify your API key has access to that model

### Error Messages
- "API key required to fetch models" - Add your API key first
- "Failed to load models" - Check API key and connection
- Network errors - Verify internet connectivity

## Benefits

1. **Always Current**: Access new models as soon as they're released
2. **No Updates Needed**: No app updates required for new models
3. **Flexibility**: Use any model you have access to
4. **Better Discovery**: Search and explore available models easily

## API Key Security

Your API key is:
- Stored locally only
- Never transmitted to our servers
- Used only for OpenRouter API calls
- Encrypted in local storage

## For Developers

### Files Modified
- `frontend/src/lib/openRouterClient.js` - API client
- `frontend/src/components/SearchableModelDropdown.jsx` - Dropdown component
- `frontend/src/components/SettingsModal.jsx` - Settings integration
- `frontend/src/App.jsx` - State management

### API Endpoint
```
GET https://openrouter.ai/api/v1/models
Authorization: Bearer {apiKey}
```

### Model Object Structure
```javascript
{
  id: "provider/model-name",
  name: "Display Name",
  description: "Model description",
  context_length: 8192,
  pricing: { ... }
}
```
