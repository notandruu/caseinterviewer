import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const DEFAULT_JSON_MODEL = process.env.OPENAI_JSON_MODEL ?? "gpt-4o-2024-08-06";

export type JSONCallUsage = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

export type JSONCallResult<T> = {
  json: T | null;
  rawText: string;
  usage?: JSONCallUsage;
};

function extractText(resp: any): string {
  if (typeof resp?.output_text === "string") return resp.output_text;
  const out = resp?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c?.type === "output_text" && typeof c?.text === "string") return c.text;
          if (c?.type === "text" && typeof c?.text === "string") return c.text;
          if (typeof c === "string") return c;
        }
      }
    }
  }
  return "";
}

export async function callJSON<T>(
  system: string,
  userBlocks: string[],
  schema: Record<string, any>,
  model = DEFAULT_JSON_MODEL,
  temperature = 0.2,
  max_output_tokens = 256
): Promise<JSONCallResult<T>> {
  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content: userBlocks.map((t) => ({ type: "input_text", text: t })) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schema.title ?? "Schema",
        schema,
        strict: true,
      },
    },
    temperature,
    max_output_tokens,
  });

  const rawText = extractText(response);
  let parsed: T | null = null;
  try { parsed = rawText ? (JSON.parse(rawText) as T) : null; } catch { parsed = null; }
  const usage = response.usage as JSONCallUsage | undefined;

  return { json: parsed, rawText, usage };
}
