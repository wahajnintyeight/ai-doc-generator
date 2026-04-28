import { generateText, streamText } from 'ai';
import { createProviderAdapter } from './providers/index.js';
import { createDocumentTools } from './tools/documentTools.js';

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

function summarizeExecutedToolCalls(toolCalls = []) {
  if (!toolCalls.length) {
    return '';
  }

  const summaryParts = [];
  const seen = new Set();

  toolCalls.forEach((toolCall) => {
    const toolName = String(toolCall?.toolName || '').trim();
    if (!toolName) {
      return;
    }

    const relativePath = String(toolCall?.args?.relativePath || '').trim();
    const key = `${toolName}:${relativePath}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    summaryParts.push(relativePath ? `${toolName}(${relativePath})` : toolName);
  });

  if (!summaryParts.length) {
    return '';
  }

  return `Executed tool call${summaryParts.length > 1 ? 's' : ''}: ${summaryParts.join(', ')}.`;
}

function buildLocalResponseText({ responseText, writtenFiles, executedToolCalls = [] }) {
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
    return cleanedText || `No final text was returned, but I wrote ${writtenFiles.length} file(s) successfully.`;
  }

  const executedToolsSummary = summarizeExecutedToolCalls(executedToolCalls);
  if (executedToolsSummary) {
    return cleanedText || `No final text was returned. ${executedToolsSummary}`;
  }

  const structuredToolCalls = parseStructuredToolCalls(cleanedText);
  if (structuredToolCalls.length > 0) {
    const toolNames = [...new Set(structuredToolCalls.map((toolCall) => toolCall.toolName))];
    return `No final text was returned. Tool request: ${toolNames.join(', ')}.`;
  }

  return cleanedText || 'No final text was returned. The model likely emitted only tool activity or an incomplete response.';
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
  return createProviderAdapter({ provider, apiKey, model }).createModel();
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
  const tools = createDocumentTools({
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
    try {
      const firstPass = await generateText(createBaseRequest(messages));
      console.log('[firstpass]',firstPass)
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

      console.log("[RES]", response)

      if (response !== firstPass) {
        toolEvents.emitToolCalls(response);
      }

      const responseText = String(response.text || '').trim();
      const cleanedText = buildLocalResponseText({
        responseText,
        writtenFiles,
        executedToolCalls: getToolCalls(response),
      });

      return {
        text: cleanedText,
        writtenFiles,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  async function stream(messages) {
    try {
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
      const summary = buildLocalResponseText({
        responseText,
        writtenFiles,
        executedToolCalls: getToolCalls(result),
      });

      onFinish?.({
        text: summary,
        writtenFiles,
      });

      return {
        text: summary,
        writtenFiles,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
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
    } catch (error) {
      console.warn('Failed to parse text tool call:', match[0], error);
    }
  }

  return toolCalls;
}

function extractErrorMessage(error) {
  // Check if error has metadata.raw field (OpenRouter specific)
  if (error?.metadata?.raw) {
    return error.metadata.raw;
  }

  // Check if error.error has metadata.raw
  if (error?.error?.metadata?.raw) {
    return error.error.metadata.raw;
  }

  // Fallback to standard error message
  if (error?.message) {
    return error.message;
  }

  if (error?.error?.message) {
    return error.error.message;
  }

  // Last resort
  return String(error);
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
