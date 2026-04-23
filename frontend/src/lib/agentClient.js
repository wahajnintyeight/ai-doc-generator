import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
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
  'Always provide safe relative paths like docs/overview.md when writing files.',
  'IMPORTANT: Call tools using the function calling interface, never output tool calls as text.',
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

function outputFolderContext(outputFolder) {
  if (!outputFolder || !String(outputFolder).trim()) {
    return '';
  }
  return `Output folder (all generated files will be written here): ${outputFolder}`;
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

function getToolCalls(result) {
  return (result.steps || []).flatMap((step) => step.toolCalls || []);
}

function hasToolCall(result, toolName) {
  return getToolCalls(result).some((toolCall) => toolCall.toolName === toolName);
}

function parseTextToolCalls(text) {
  // Parse tool calls that models output as text instead of proper function calls
  const toolCalls = [];
  
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

async function generateWithAdaptiveTooling({
  resolvedModel,
  activeDocument,
  outputFolder,
  conversation,
  readFile,
  writeFile,
  onToolCall,
  onToolResult,
}) {
  const writtenFiles = [];
  const tools = buildTools({
    activeDocument,
    outputFolder,
    readFile,
    writeFile,
    writtenFiles,
  });
  const folderCtx = outputFolderContext(outputFolder);
  const baseRequest = {
    model: resolvedModel,
    system: `${SYSTEM_PROMPT}\n\n${documentContext(activeDocument)}${folderCtx ? `\n\n${folderCtx}` : ''}`,
    messages: conversation,
    tools,
    maxSteps: 5,
  };

  const firstPass = await generateText(baseRequest);

  // Emit tool calls if callbacks provided
  if (onToolCall || onToolResult) {
    const toolCalls = getToolCalls(firstPass);
    toolCalls.forEach(tc => {
      onToolCall?.({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: tc.args,
      });
      onToolResult?.({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        result: tc.result,
      });
    });
    
    // Also check for text-based tool calls (for models that don't support proper function calling)
    const textToolCalls = parseTextToolCalls(firstPass.text || '');
    textToolCalls.forEach(tc => {
      onToolCall?.(tc);
      // Mark as completed immediately since we can't actually execute them
      setTimeout(() => {
        onToolResult?.({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          result: { note: 'Model attempted tool call but lacks proper function calling support' },
        });
      }, 1500);
    });
  }

  // If files were written or it's a conversational response, we're done
  if (writtenFiles.length > 0 || firstPass.finishReason === 'stop') {
    return { response: firstPass, writtenFiles };
  }

  // If the agent used read/outline tools but didn't write, give it another chance
  const usedReadOrOutline = hasToolCall(firstPass, 'read_document_file') || hasToolCall(firstPass, 'create_document_outline');
  if (usedReadOrOutline) {
    const retryRequest = {
      ...baseRequest,
      system: `${baseRequest.system}\n\nYou already gathered context. If the user requested document generation, complete it now by calling write_document_file with the final markdown output.`,
    };

    const secondPass = await generateText(retryRequest);
    
    // Emit second pass tool calls
    if (onToolCall || onToolResult) {
      const toolCalls = getToolCalls(secondPass);
      toolCalls.forEach(tc => {
        onToolCall?.({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
        });
        onToolResult?.({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          result: tc.result,
        });
      });
      
      // Also check for text-based tool calls
      const textToolCalls = parseTextToolCalls(secondPass.text || '');
      textToolCalls.forEach(tc => {
        onToolCall?.(tc);
        setTimeout(() => {
          onToolResult?.({
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            result: { note: 'Model attempted tool call but lacks proper function calling support' },
          });
        }, 1500);
      });
    }

    return { response: secondPass, writtenFiles };
  }

  // Otherwise, return the conversational response
  return { response: firstPass, writtenFiles };
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

  const conversation = normalizeMessages(messages);
  const resolvedModel = getProviderModel({ provider, apiKey, model });
  const { response, writtenFiles } = await generateWithAdaptiveTooling({
    resolvedModel,
    activeDocument,
    outputFolder,
    conversation,
    readFile,
    writeFile,
    onToolCall,
    onToolResult,
  });

  // Return the response text and any files that were written
  const responseText = String(response.text || '').trim();
  
  // Filter out raw tool call text that some models output incorrectly
  const cleanedText = responseText
    .replace(/TOOL_CALL>\[.*?\]>/g, '')
    .replace(/<TOOL_CALL>.*?<\/TOOL_CALL>/g, '')
    .replace(/\[TOOL_CALL\].*?\[\/TOOL_CALL\]/g, '')
    .trim();
  
  const summary = writtenFiles.length > 0 
    ? (cleanedText || `Wrote ${writtenFiles.length} file(s).`)
    : cleanedText;

  return {
    text: summary,
    writtenFiles,
  };
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

  const conversation = normalizeMessages(messages);
  const resolvedModel = getProviderModel({ provider, apiKey, model });
  const writtenFiles = [];
  const tools = buildTools({
    activeDocument,
    readFile,
    writeFile,
    writtenFiles,
  });

  const result = await streamText({
    model: resolvedModel,
    system: `${SYSTEM_PROMPT}\n\n${documentContext(activeDocument)}`,
    messages: conversation,
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
  const summary = writtenFiles.length > 0 
    ? (responseText || `Wrote ${writtenFiles.length} file(s).`)
    : responseText;

  onFinish?.({
    text: summary,
    writtenFiles,
  });

  return {
    text: summary,
    writtenFiles,
  };
}
