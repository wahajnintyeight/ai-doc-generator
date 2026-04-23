/**
 * OpenRouter API client for fetching available models
 */

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export async function fetchOpenRouterModels(apiKey) {
  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the response to extract model IDs and relevant info
    return data.data.map(model => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description || '',
      context_length: model.context_length || 0,
      pricing: model.pricing || {},
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

export function sortModelsByPopularity(models) {
  // Sort by name, prioritizing popular providers
  const providerOrder = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai'];
  
  return models.sort((a, b) => {
    const aProvider = a.id.split('/')[0];
    const bProvider = b.id.split('/')[0];
    
    const aIndex = providerOrder.indexOf(aProvider);
    const bIndex = providerOrder.indexOf(bProvider);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return a.id.localeCompare(b.id);
  });
}
