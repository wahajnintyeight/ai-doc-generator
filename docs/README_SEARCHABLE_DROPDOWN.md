# Searchable Model Dropdown Component

## Overview
A custom searchable dropdown component for model selection that supports:
- Live search/filtering of models
- Custom model input (user can type their own model ID)
- Dynamic model loading from OpenRouter API
- Fallback to static model lists

## Components

### SearchableModelDropdown
Located in `frontend/src/components/SearchableModelDropdown.jsx`

**Props:**
- `value` - Currently selected model ID
- `onChange` - Callback when model is selected/changed
- `models` - Array of model objects or strings
- `isLoading` - Shows loading spinner
- `error` - Error message to display
- `placeholder` - Input placeholder text
- `allowCustom` - Allow typing custom model IDs (default: true)
- `onRefresh` - Optional refresh callback

**Features:**
- Click to open dropdown with searchable list
- Type to filter models in real-time
- Type custom model ID and press Enter
- Click outside to close
- Keyboard navigation support

## OpenRouter Integration

### openRouterClient.js
Located in `frontend/src/lib/openRouterClient.js`

**Functions:**
- `fetchOpenRouterModels(apiKey)` - Fetches latest models from OpenRouter API
- `sortModelsByPopularity(models)` - Sorts models by provider popularity

**API Endpoint:**
```
GET https://openrouter.ai/api/v1/models
Authorization: Bearer {apiKey}
```

**Response Format:**
```javascript
{
  data: [
    {
      id: "openai/gpt-4",
      name: "GPT-4",
      description: "Most capable GPT-4 model",
      context_length: 8192,
      pricing: { ... }
    },
    ...
  ]
}
```

## Usage in SettingsModal

The SettingsModal now:
1. Detects when OpenRouter provider is selected
2. Automatically fetches models when modal opens (if API key is present)
3. Shows SearchableModelDropdown for OpenRouter
4. Shows standard dropdown for other providers
5. Includes refresh button to reload models

## User Flow

1. User selects "OpenRouter" as provider
2. User enters API key
3. Modal automatically fetches available models
4. User can:
   - Search through fetched models
   - Select from the list
   - Type a custom model ID
   - Refresh the model list

## Fallback Behavior

If OpenRouter API fails or no API key is provided:
- Falls back to static model list from `modelCatalog.js`
- User can still type custom model IDs
- Error message is displayed in dropdown

## Styling

Uses Tailwind CSS with the app's design system:
- Dark theme with cyan accents
- Smooth animations via Framer Motion
- Consistent with existing UI components
