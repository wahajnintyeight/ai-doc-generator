import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getDefaultModelForProvider } from './modelCatalog';

const SYSTEM_PROMPT = [
  'You are professional document generation agent.',
  'Generate clear markdown documents with headings, sections, and concise actionable content.',
  'Prefer practical structure over verbosity.',
  'You must write generated content by calling the write_document_file tool.',
  'Always provide a safe relative path like docs/overview.md and put full markdown content in the tool input.',
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
    return openrouter.chat(selectedModel);
  }

  if (selectedProvider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(selectedModel);
  }

  const openai = createOpenAI({ apiKey });
  return openai(selectedModel);
}

function buildTools({ activeDocument, writeFile, writtenFiles }) {
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
    write_document_file: tool({
      description: 'Write a generated markdown file to disk using a relative path under the user-selected output folder.',
      inputSchema: z.object({
        relativePath: z
          .string()
          .min(1)
          .describe('Relative file path like docs/api-reference.md. Must not be absolute.'),
        content: z
          .string()
          .min(1)
          .describe('Complete markdown content to write into the file.'),
      }),
      execute: async ({ relativePath, content }) => {
        const normalizedPath = String(relativePath || '').replace(/\\\\/g, '/').trim();
        const trimmedContent = String(content || '').trim();
        const absolutePath = await writeFile({
          relativePath: normalizedPath,
          content: trimmedContent,
        });

        const record = {
          relativePath: normalizedPath,
          absolutePath,
          content: trimmedContent,
        };
        writtenFiles.push(record);

        return {
          ok: true,
          ...record,
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
  writeFile,
}) {
  if (!apiKey) {
    throw new Error('Missing API key. Add BYOK key first.');
  }
  if (!writeFile) {
    throw new Error('Missing file writer. Select an output folder before generation.');
  }

  const conversation = normalizeMessages(messages);
  const resolvedModel = getProviderModel({ provider, apiKey, model });
  const writtenFiles = [];

  const { text } = await generateText({
    model: resolvedModel,
    system: `${SYSTEM_PROMPT}\n\n${documentContext(activeDocument)}`,
    messages: conversation,
    tools: buildTools({
      activeDocument,
      writeFile,
      writtenFiles,
    }),
    toolChoice: {
      type: 'tool',
      toolName: 'write_document_file',
    },
    maxSteps: 4,
  });

  if (writtenFiles.length === 0) {
    throw new Error('No files were written. Try a more specific document request and run again.');
  }

  const summary = String(text || '').trim() || `Wrote ${writtenFiles.length} file(s).`;
  return {
    text: summary,
    writtenFiles,
  };
}
