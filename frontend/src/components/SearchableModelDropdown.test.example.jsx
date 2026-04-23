/**
 * Example usage of SearchableModelDropdown component
 * This is not a real test file, just examples of how to use the component
 */

import { SearchableModelDropdown } from './SearchableModelDropdown';

// Example 1: Basic usage with string array
function Example1() {
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'];

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
    />
  );
}

// Example 2: With model objects (OpenRouter format)
function Example2() {
  const [selectedModel, setSelectedModel] = useState('');
  const models = [
    {
      id: 'openai/gpt-4',
      name: 'GPT-4',
      description: 'Most capable GPT-4 model'
    },
    {
      id: 'anthropic/claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Most capable Claude model'
    }
  ];

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
      placeholder="Select AI model..."
    />
  );
}

// Example 3: With loading state
function Example3() {
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchModels().then(data => {
      setModels(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
      isLoading={isLoading}
    />
  );
}

// Example 4: With error handling
function Example4() {
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [error, setError] = useState(null);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      setModels(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
      error={error}
      onRefresh={loadModels}
    />
  );
}

// Example 5: Disable custom input
function Example5() {
  const [selectedModel, setSelectedModel] = useState('');
  const models = ['model-1', 'model-2', 'model-3'];

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
      allowCustom={false} // User must select from list
    />
  );
}

// Example 6: Full OpenRouter integration
function Example6() {
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiKey = 'sk-or-...';

  const loadOpenRouterModels = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      const data = await response.json();
      setModels(data.data);
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      loadOpenRouterModels();
    }
  }, [apiKey]);

  return (
    <SearchableModelDropdown
      value={selectedModel}
      onChange={setSelectedModel}
      models={models}
      isLoading={isLoading}
      error={error}
      placeholder="Select or type OpenRouter model..."
      allowCustom={true}
    />
  );
}
