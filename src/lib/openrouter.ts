const KEY = import.meta.env.VITE_OPENROUTER_KEY as string;
const API = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODEL = 'google/gemma-4-31b-it:free';
const HEADERS = {
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://eprisjournal.com',
  'X-Title': 'EPRIS Journal',
};

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return text;
}

export async function analyzeImage<T>(
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt + '\n\nReturn ONLY valid JSON, no markdown.' },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices[0].message.content as string;
  return JSON.parse(extractJSON(content)) as T;
}

export async function analyzeImageText(
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}
