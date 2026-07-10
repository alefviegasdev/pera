import type { AICallOptions } from "./types";

const geminiBaseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

export async function fetchGemini(geminiKey: string, options: AICallOptions, retries = 3): Promise<string> {
  const url = `${geminiBaseUrl}/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;

  const parts: Record<string, unknown>[] = [{ text: options.prompt }];
  if (options.image) {
    parts.push({ inline_data: { mime_type: options.image.mimeType, data: options.image.base64 } });
  }

  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    if (res.ok) {
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }

    if ((res.status === 503 || res.status === 429) && i < retries - 1) {
      const delay = res.status === 429 ? 30000 : 2000 * (i + 1);
      console.log(`[GEMINI] Rate limit (${res.status}), aguardando ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${res.status} ${JSON.stringify(err)}`);
  }

  throw new Error("Gemini API error: retries exhausted");
}
