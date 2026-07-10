import { fetchGemini } from "./gemini";
import { fetchClaude } from "./claude";
import type { AICallOptions } from "./types";

export type { AICallOptions, AIImageInput, AIToolDefinition } from "./types";
export { UNIFIED_TOOL, RECEIPT_TOOL } from "./schemas";

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

const geminiKey = process.env.GEMINI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

/**
 * Provider-agnostic entry point used by every bot handler. Always resolves
 * to a JSON string (whatever the prompt asked for), regardless of which
 * provider answered — handlers never see Gemini's or Claude's native shapes.
 */
export async function callAI(options: AICallOptions): Promise<string> {
  if (AI_PROVIDER === "anthropic") {
    if (!anthropicKey) throw new Error("AI_PROVIDER=anthropic requer ANTHROPIC_API_KEY configurada");
    return fetchClaude(anthropicKey, options);
  }
  if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");
  return fetchGemini(geminiKey, options);
}

export function parseAIJson<T = any>(text: string): T {
  const cleaned = (text || "").trim().replace(/```json|```/g, "").trim();
  if (!cleaned) {
    throw new Error("Resposta vazia da IA");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Falha ao interpretar JSON da IA: ${(err as Error).message}. Texto recebido: ${cleaned.slice(0, 200)}`);
  }
}
