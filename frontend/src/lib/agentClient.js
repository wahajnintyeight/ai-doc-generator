import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { getDefaultModelForProvider } from './modelCatalog';

const SYSTEM_PROMPT = [
  'You are a professional document generation assistant.',
  'When users request document generation, create clear markdown documents with headings, sections, and concise actionable content.',
  'Prefer practical structure over verbosity.',
  'You have access to tools for reading and writing documents.',
  'Use write_document_file when the user asks you to create, generate, or write a document.',
  'Use read_document_file when you need to check existing content before modifying.',
  'Use create_document_outline when the user wants a structured outline.',
  'For general questions, greetings, or conversations, respond naturally without using tools.',
  'If native tool calling is unavailable, respond with one JSON object and nothing else: {"type":"message","text":"..."} for normal replies or {"type":"tool_call","toolName":"...","args":{...}} when requesting a tool.',
  'Never return an empty response.',
  'Always provide safe relative paths like docs/overview.md when writing files.',
  'IMPORTANT: Call tools using the function calling interface, never output tool calls as text.',
].join(' ');

function normalizeMessages(messages) {
  return messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && String(message.content || '').trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function prepareConversation(messages) {
  return normalizeMessages(messages).slice(-4);
}

function extractStructuredPayload(text) {
  const trimmed = String(text || '').trim();

  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function parseStructuredMessage(text) {
  const payload = extractStructuredPayload(text);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  if (payload.type === 'message' && typeof payload.text === 'string') {
    return payload.text.trim();
  }

  return null;
}

function parseStructuredToolCalls(text) {
  const payload = extractStructuredPayload(text);
  const values = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const toolCalls = [];

  values.forEach((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    if (value.type !== 'tool_call' || typeof value.toolName !== 'string' || !value.toolName.trim()) {
      return;
    }

    toolCalls.push({
      toolCallId: `structured-${Date.now()}-${Math.random()}`,
      toolName: value.toolName.trim(),
      args: value.args && typeof value.args === 'object' ? value.args : {},
    });
  });

  return toolCalls;
}

function buildLocalResponseText({ responseText, writtenFiles }) {
  const cleanedText = String(responseText || '')
    .replace(/TOOL_CALL>\[.*?\]>/g, '')
    .replace(/<TOOL_CALL>.*?<\/TOOL_CALL>/g, '')
    .replace(/\[TOOL_CALL\].*?\[\/TOOL_CALL\]/g, '')
    .trim();

  const structuredMessage = parseStructuredMessage(cleanedText);
  if (structuredMessage) {
    return structuredMessage;
  }

  if (writtenFiles.length > 0) {
    return cleanedText || `Wrote ${writtenFiles.length} file(s).`;
  }

  const structuredToolCalls = parseStructuredToolCalls(cleanedText);
  if (structuredToolCalls.length > 0) {
    const toolNames = [...new Set(structuredToolCalls.map((toolCall) => toolCall.toolName))];
    return `Tool request: ${toolNames.join(', ')}.`;
  }

  return cleanedText || 'No text response returned.';
}

function documentContext(activeDocument) {
  if (!activeDocument) {
    return 'No active document loaded.';
  }

  return `Active document: ${activeDocument.name}\n${String(activeDocument.content || '').slice(0, 5000)}`;
}

function outputFolderContext(outputFolder) {
  if (!outputFolder || !String(outputFolder).trim()) {
    return '';
  }
  return `Output folder (all generated files will be written here): ${outputFolder}`;
}

function buildSystemPrompt(activeDocument, outputFolder) {
  const folderCtx = outputFolderContext(outputFolder);
  return `${SYSTEM_PROMPT}\n\n${documentContext(activeDocument)}${folderCtx ? `\n\n${folderCtx}` : ''}`;
}

function getProviderModel({ provider, apiKey, model }) {
  const selectedProvider = provider || 'openai';
  const selectedModel = model || getDefaultModelForProvider(selectedProvider);

  if (selectedProvider === 'openrouter') {
    const openrouter = createOpenRouter({ apiKey });
    return openrouter.chat(selectedModel);
  }

  if (selectedProvider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(selectedModel);
  }

  const openai = createOpenAI({ apiKey });
  return openai(selectedModel);
}

function buildTools({ activeDocument, outputFolder, writeFile, readFile, writtenFiles }) {
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
            '## Purpose',
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
    read_document_file: tool({
      description: 'Read a document file from the selected output folder before modifying it.',
      inputSchema: z.object({
        relativePath: z
          .string()
          .min(1)
          .describe('Relative file path like docs/api-reference.md. Must not be absolute.'),
      }),
      execute: async ({ relativePath }) => {
        if (!readFile) {
          throw new Error('File reading is unavailable.');
        }

        const content = await readFile({ relativePath });
        return {
          ok: true,
          relativePath,
          content: String(content || ''),
        };
      },
    }),
    write_document_file: tool({
      description: 'Write a generated markdown file to disk using a relative path. The file will be created inside the user-selected output folder. Always use a simple relative path (e.g. docs/api-reference.md) — never include the output folder path itself.',
      inputSchema: z.object({
        relativePath: z
          .string()
          .min(1)
          .describe('Relative file path like docs/api-reference.md. Must not be absolute and must not include the output folder path.'),
        content: z
          .string()
          .min(1)
          .describe('Complete markdown content to write into the file.'),
      }),
      execute: async ({ relativePath, content }) => {
        const normalizedPath = String(relativePath || '').replace(/\\/g, '/').trim();
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

function createToolEventEmitter(onToolCall, onToolResult) {
  return {
    emitToolCalls(result) {
      if (!onToolCall && !onToolResult) {
        return;
      }

      const toolCalls = getToolCalls(result);
      toolCalls.forEach((toolCall) => {
        onToolCall?.({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: toolCall.args,
        });
        onToolResult?.({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          result: toolCall.result,
        });
      });

      const textToolCalls = parseTextToolCalls(result.text || '');
      textToolCalls.forEach((toolCall) => {
        onToolCall?.(toolCall);
        setTimeout(() => {
          onToolResult?.({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            result: { note: 'Model attempted tool call but lacks proper function calling support' },
          });
        }, 1500);
      });
    },
  };
}

function createAgentClient({
  provider,
  apiKey,
  model,
  activeDocument,
  outputFolder,
  readFile,
  writeFile,
  onToolCall,
  onToolResult,
  onTextDelta,
  onFinish,
}) {
  const resolvedModel = getProviderModel({ provider, apiKey, model });
  const writtenFiles = [];
  const tools = buildTools({
    activeDocument,
    outputFolder,
    readFile,
    writeFile,
    writtenFiles,
  });
  const toolEvents = createToolEventEmitter(onToolCall, onToolResult);

  function createBaseRequest(messages) {
    return {
      model: resolvedModel,
      system: buildSystemPrompt(activeDocument, outputFolder),
      messages,
      tools,
      maxSteps: 5,
    };
  }

  async function generate(messages) {
    const firstPass = await generateText(createBaseRequest(messages));

    toolEvents.emitToolCalls(firstPass);

    const shouldRetry = !writtenFiles.length
      && firstPass.finishReason !== 'stop'
      && (hasToolCall(firstPass, 'read_document_file') || hasToolCall(firstPass, 'create_document_outline'));

    const response = shouldRetry
      ? await generateText({
        ...createBaseRequest(messages),
        system: `${buildSystemPrompt(activeDocument, outputFolder)}\n\nYou already gathered context. If the user requested document generation, complete it now by calling write_document_file with the final markdown output.`,
      })
      : firstPass;

    if (response !== firstPass) {
      toolEvents.emitToolCalls(response);
    }

    const responseText = String(response.text || '').trim();
    const cleanedText = buildLocalResponseText({ responseText, writtenFiles });

    return {
      text: cleanedText,
      writtenFiles,
    };
  }

  async function stream(messages) {
    const result = await streamText({
      model: resolvedModel,
      system: buildSystemPrompt(activeDocument, outputFolder),
      messages,
      tools,
      maxSteps: 5,
      onChunk: ({ chunk }) => {
        if (chunk.type === 'tool-call') {
          onToolCall?.({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          });
        } else if (chunk.type === 'tool-result') {
          onToolResult?.({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            result: chunk.result,
          });
        } else if (chunk.type === 'text-delta') {
          onTextDelta?.(chunk.textDelta);
        }
      },
    });

    let fullText = '';
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    const responseText = fullText.trim();
    const summary = buildLocalResponseText({ responseText, writtenFiles });

    onFinish?.({
      text: summary,
      writtenFiles,
    });

    return {
      text: summary,
      writtenFiles,
    };
  }

  return {
    generate,
    stream,
  };
}

function getToolCalls(result) {
  return (result.steps || []).flatMap((step) => step.toolCalls || []);
}

function hasToolCall(result, toolName) {
  return getToolCalls(result).some((toolCall) => toolCall.toolName === toolName);
}

function parseTextToolCalls(text) {
  // Parse tool calls that models output as text instead of proper function calls
  const toolCalls = [];

  const structuredToolCalls = parseStructuredToolCalls(text);
  if (structuredToolCalls.length > 0) {
    return structuredToolCalls;
  }
  
  // Match patterns like: CALL>[{"name": "tool_name", "arguments": {...}}]>
  const callPattern = /CALL>\s*\[?\s*\{[^}]*"name"\s*:\s*"([^"]+)"[^}]*"arguments"\s*:\s*(\{[^}]*\})[^\]]*\]?\s*>/gi;
  
  let match;
  while ((match = callPattern.exec(text)) !== null) {
    try {
      const toolName = match[1];
      const argsStr = match[2];
      const args = JSON.parse(argsStr);
      
      toolCalls.push({
        toolCallId: `text-${Date.now()}-${Math.random()}`,
        toolName,
        args,
      });
    } catch (e) {
      console.warn('Failed to parse text tool call:', match[0], e);
    }
  }
  
  return toolCalls;
}

export async function generateDocumentResponse({
  provider,
  apiKey,
  model,
  messages,
  activeDocument,
  outputFolder,
  readFile,
  writeFile,
  onToolCall,
  onToolResult,
}) {
  if (!apiKey) {
    throw new Error('Missing API key. Add BYOK key first.');
  }
  if (!outputFolder || !String(outputFolder).trim()) {
    throw new Error('Missing output folder. Select an output folder before generation.');
  }
  if (!writeFile) {
    throw new Error('Missing file writer. Select an output folder before generation.');
  }

  const conversation = prepareConversation(messages);
  const agentClient = createAgentClient({
    provider,
    apiKey,
    model,
    activeDocument,
    outputFolder,
    readFile,
    writeFile,
    onToolCall,
    onToolResult,
  });

  return agentClient.generate(conversation);
}

export async function streamDocumentResponse({
  provider,
  apiKey,
  model,
  messages,
  activeDocument,
  readFile,
  writeFile,
  onToolCall,
  onToolResult,
  onTextDelta,
  onFinish,
}) {
  if (!apiKey) {
    throw new Error('Missing API key. Add BYOK key first.');
  }
  if (!writeFile) {
    throw new Error('Missing file writer. Select an output folder before generation.');
  }

  const conversation = prepareConversation(messages);
  const agentClient = createAgentClient({
    provider,
    apiKey,
    model,
    activeDocument,
    readFile,
    writeFile,
    onToolCall,
    onToolResult,
    onTextDelta,
    onFinish,
  });

  return agentClient.stream(conversation);
}
