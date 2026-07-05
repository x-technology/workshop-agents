import Anthropic from '@anthropic-ai/sdk';
import { BaseLlm } from '@google/adk';
import type { LlmRequest } from '@google/adk';
import type { LlmResponse } from '@google/adk';
import type { Content, Part } from '@google/genai';

export class ClaudeLlm extends BaseLlm {
  static readonly supportedModels = [/^claude-.*/];
  private client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async *generateContentAsync(
    llmRequest: LlmRequest,
    stream = false,
    abortSignal?: AbortSignal
  ): AsyncGenerator<LlmResponse, void> {
    const messages = convertToAnthropicMessages(llmRequest.contents);
    const systemInstructions = extractSystemInstructions(llmRequest);
    const tools = convertToolsToAnthropic(llmRequest.config?.tools);

    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 4096,
        system: systemInstructions,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      },
      { signal: abortSignal }
    );

    yield convertAnthropicResponseToLlmResponse(response);
  }

  async connect(): Promise<never> {
    throw new Error('Live connection is not supported for Claude');
  }
}

function convertToAnthropicMessages(
  contents: Content[]
): Anthropic.Messages.MessageParam[] {
  return contents.map((content) => ({
    role: content.role === 'model' ? 'assistant' : 'user',
    content: (content.parts ?? []).map(convertPartToAnthropicContent).flat(),
  }));
}

function convertPartToAnthropicContent(
  part: Part
): Anthropic.Messages.ContentBlockParam | Anthropic.Messages.ContentBlockParam[] {
  if ('text' in part && part.text !== undefined) {
    return { type: 'text', text: part.text };
  }
  if ('inlineData' in part && part.inlineData !== undefined) {
    const { mimeType, data } = part.inlineData;
    const mediaType = mimeType as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: data ?? '',
      },
    };
  }
  if ('functionCall' in part && part.functionCall !== undefined) {
    const { name, args } = part.functionCall;
    return {
      type: 'tool_use',
      id: name ?? '',
      name: name ?? '',
      input: args || {},
    };
  }
  if ('functionResponse' in part && part.functionResponse !== undefined) {
    const { name, response } = part.functionResponse;
    return {
      type: 'tool_result',
      tool_use_id: name ?? '',
      content: JSON.stringify(response),
    };
  }
  throw new Error(`Unsupported part type: ${JSON.stringify(part)}`);
}

function extractSystemInstructions(llmRequest: LlmRequest): string {
  if (!llmRequest.config?.systemInstruction) {
    return '';
  }
  const instr = llmRequest.config.systemInstruction;
  if (typeof instr === 'string') {
    return instr;
  }
  if ('parts' in instr && Array.isArray(instr.parts)) {
    return instr.parts
      .filter((p) => 'text' in p && typeof p.text === 'string')
      .map((p) => (p as any).text)
      .join('\n');
  }
  return '';
}

const JSON_SCHEMA_KEYS = new Set([
  'type','description','properties','required','items','enum',
  'anyOf','oneOf','allOf','not','title','default','minimum','maximum',
  'minLength','maxLength','pattern','minItems','maxItems','$ref',
]);

function normalizeSchema(s: any): Record<string, any> {
  if (!s || typeof s !== 'object') return { type: 'object', properties: {} };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(s)) {
    if (!JSON_SCHEMA_KEYS.has(k)) continue;
    if (k === 'type' && typeof v === 'string') {
      out[k] = v.toLowerCase();
    } else if (k === 'properties' && v && typeof v === 'object') {
      out[k] = Object.fromEntries(
        Object.entries(v).map(([name, schema]) => [name, normalizeSchema(schema)])
      );
    } else if (k === 'items' && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = normalizeSchema(v);
    } else if (Array.isArray(v) && (k === 'anyOf' || k === 'oneOf' || k === 'allOf')) {
      out[k] = v.map(normalizeSchema);
    } else {
      out[k] = v;
    }
  }
  if (!out.type) out.type = 'object';
  return out;
}

function convertToolsToAnthropic(
  toolsInput: any
): Anthropic.Messages.Tool[] {
  if (!toolsInput) return [];

  const tools = Array.isArray(toolsInput) ? toolsInput : [];
  const functionDecls: any[] = [];
  for (const tool of tools) {
    if (Array.isArray(tool.functionDeclarations)) {
      functionDecls.push(...tool.functionDeclarations);
    } else if (tool.name) {
      functionDecls.push(tool);
    }
  }
  return functionDecls.map((fn) => ({
    name: fn.name,
    description: fn.description || '',
    input_schema: normalizeSchema(fn.parameters) as Anthropic.Messages.Tool['input_schema'],
  }));
}

function mapFinishReason(stopReason: string | null | undefined): import('@google/genai').FinishReason | undefined {
  if (!stopReason) return undefined;
  const map: Record<string, string> = {
    end_turn: 'STOP',
    max_tokens: 'MAX_TOKENS',
    stop_sequence: 'STOP',
    tool_use: 'STOP',
  };
  return (map[stopReason] ?? 'OTHER') as import('@google/genai').FinishReason;
}

function convertAnthropicResponseToLlmResponse(
  response: Anthropic.Messages.Message
): LlmResponse {
  const content: Content = {
    role: 'model',
    parts: response.content
      .map((block) => {
        if (block.type === 'text') {
          return { text: block.text };
        }
        if (block.type === 'tool_use') {
          return {
            functionCall: {
              name: block.name,
              args: block.input as Record<string, any>,
            },
          };
        }
        return null;
      })
      .filter((p) => p !== null) as Part[],
  };

  return {
    content,
    finishReason: mapFinishReason(response.stop_reason),
  };
}
