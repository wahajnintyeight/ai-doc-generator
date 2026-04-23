import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getDefaultModelForProvider } from './modelCatalog';

const SYSTEM_PROMPT = [
  'You are professional document generation agent.',
  'Generate clear markdown documents with headings, sections, and concise actionable content.',
  'Prefer practical structure over verbosity.',
].join(' ');

function normalizeMessages(messages) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function documentContext(activeDocument) {
  if (!activeDocument) {
    return 'No active document loaded.';
  }

  return `Active document: ${activeDocument.name}\n${String(activeDocument.content || '').slice(0, 5000)}`;
}

function getProviderModel({ provider, apiKey, model }) {
  const selectedProvider = provider || 'openai';
  const selectedModel = model || getDefaultModelForProvider(selectedProvider);

  if (selectedProvider === 'openrouter') {
    const openrouter = createOpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      name: 'openrouter',
    });
    return openrouter(selectedModel);
  }

  if (selectedProvider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(selectedModel);
  }

  const openai = createOpenAI({ apiKey });
  return openai(selectedModel);
}

function buildTools(activeDocument) {
  return {
    get_active_document: tool({
      description: 'Get currently loaded document content and name for context-aware generation.',
      inputSchema: z.object({}),
      execute: async () => ({
        name: activeDocument?.name || 'untitled.md',
        content: String(activeDocument?.content || ''),
      }),
    }),
    create_document_outline: tool({
      description: 'Create a concise markdown document outline from a title and purpose.',
      inputSchema: z.object({
        title: z.string().min(3),
        purpose: z.string().min(3),
      }),
      execute: async ({ title, purpose }) => {
        return {
          markdown: [
            `# ${title}`,
            '',
            `## Purpose`,
            purpose,
            '',
            '## Scope',
            '- In scope',
            '- Out of scope',
            '',
            '## Key Requirements',
            '- Requirement 1',
            '- Requirement 2',
            '',
            '## Implementation Plan',
            '1. Step one',
            '2. Step two',
            '',
            '## Risks',
            '- Risk and mitigation',
          ].join('\n'),
        };
      },
    }),
  };
}

export async function generateDocumentResponse({
  provider,
  apiKey,
  model,
  messages,
  activeDocument,
}) {
  if (!apiKey) {
    throw new Error('Missing API key. Add BYOK key first.');
  }

  const conversation = normalizeMessages(messages);
  const resolvedModel = getProviderModel({ provider, apiKey, model });

  const { text } = await generateText({
    model: resolvedModel,
    system: `${SYSTEM_PROMPT}\n\n${documentContext(activeDocument)}`,
    messages: conversation,
    tools: buildTools(activeDocument),
    maxSteps: 4,
  });

  return String(text || '').trim();
}
