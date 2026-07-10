export interface AIImageInput {
  mimeType: string;
  base64: string;
}

/**
 * Describes a structured-output tool for providers that support tool use
 * (currently Claude). Gemini ignores this and keeps returning JSON as text.
 * `resultKey` is the property of the tool's input object whose value is
 * re-serialized to text, so callers always get back the same JSON shape
 * regardless of which provider answered.
 */
export interface AIToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  resultKey: string;
}

export interface AICallOptions {
  prompt: string;
  image?: AIImageInput;
  tool?: AIToolDefinition;
}
