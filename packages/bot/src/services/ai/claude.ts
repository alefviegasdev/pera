import Anthropic from "@anthropic-ai/sdk";
import type { AICallOptions } from "./types";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

let cachedClient: Anthropic | null = null;
function getClient(apiKey: string): Anthropic {
  if (!cachedClient) {
    // maxRetries: 0 — retry/backoff is handled below, mirroring fetchGemini's behavior.
    cachedClient = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return cachedClient;
}

export async function fetchClaude(apiKey: string, options: AICallOptions, retries = 3): Promise<string> {
  const client = getClient(apiKey);

  const content: Record<string, unknown>[] = [{ type: "text", text: options.prompt }];
  if (options.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: options.image.mimeType,
        data: options.image.base64
      }
    });
  }

  const tools = options.tool
    ? [{
        name: options.tool.name,
        description: options.tool.description,
        input_schema: options.tool.inputSchema
      }]
    : undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: content as any }],
        ...(tools
          ? { tools: tools as any, tool_choice: { type: "tool", name: options.tool!.name } as any }
          : {})
      });

      if (options.tool) {
        const toolUse = response.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );
        if (!toolUse) throw new Error("Claude não retornou o tool_use esperado");
        const input = toolUse.input as Record<string, unknown>;
        return JSON.stringify(input[options.tool.resultKey] ?? null);
      }

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      return textBlock?.text?.trim() || "";
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      if (error instanceof Anthropic.APIError && !isLastAttempt) {
        if (error.status === 429) {
          console.log("[CLAUDE] Rate limit (429), aguardando 30000ms...");
          await new Promise(r => setTimeout(r, 30000));
          continue;
        }
        if (error.status === 529 || error.status === 500) {
          const delay = 2000 * (i + 1);
          console.log(`[CLAUDE] Erro de servidor (${error.status}), aguardando ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error("Claude API error: retries exhausted");
}
