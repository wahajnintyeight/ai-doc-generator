import { tool } from 'ai';
import { z } from 'zod';

function normalizeRelativePath(relativePath) {
  return String(relativePath || '').replace(/\\/g, '/').trim();
}

export function createDocumentTools({ activeDocument, readFile, writeFile, writtenFiles }) {
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
      execute: async ({ title, purpose }) => ({
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
      }),
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
        const normalizedPath = normalizeRelativePath(relativePath);
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