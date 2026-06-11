const API_BASE = 'https://api.eprisjournal.com';

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
  const res = await fetch(`${API_BASE}/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      prompt: prompt + '\n\nReturn ONLY valid JSON, no markdown.',
    }),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Vision error');
  return JSON.parse(extractJSON(data.text)) as T;
}

export async function analyzeImageText(
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType, prompt }),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Vision error');
  return data.text as string;
}
