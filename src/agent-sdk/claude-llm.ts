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
    content: content.parts.map(convertPartToAnthropicContent).flat(),
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
        data,
      },
    };
  }
  if ('functionCall' in part && part.functionCall !== undefined) {
    const { name, args } = part.functionCall;
    return {
      type: 'tool_use',
      id: `tool_${Math.random().toString(36).slice(2, 11)}`,
      name,
      input: args || {},
    };
  }
  if ('functionResponse' in part && part.functionResponse !== undefined) {
    const { name, response } = part.functionResponse;
    return {
      type: 'tool_result',
      tool_use_id: name,
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

function convertToolsToAnthropic(
  toolsInput: any
): Anthropic.Messages.Tool[] {
  if (!toolsInput) return [];

  const tools = Array.isArray(toolsInput) ? toolsInput : [];
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || '',
    input_schema: tool.parameters || { type: 'object', properties: {} },
  }));
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
    finishReason:
      response.stop_reason === 'end_turn' ? 'STOP' : response.stop_reason,
  };
}
