const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null }) {
  const systemInstruction = responseJsonSchema
    ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
    : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.';

  let fullPrompt = prompt;
  if (responseJsonSchema) {
    fullPrompt += '\n\nRespond ONLY with valid JSON that matches this schema:\n' +
      JSON.stringify(responseJsonSchema, null, 2) +
      '\nDo not include any explanation or markdown — just the raw JSON object.';
  }

  const parts = [];

  for (const url of fileUrls) {
    try {
      let base64, mimeType;
      if (url.startsWith('data:')) {
        const commaIdx = url.indexOf(',');
        mimeType = url.slice(0, commaIdx).match(/data:([^;,]+)/)?.[1] || 'image/jpeg';
        base64 = url.slice(commaIdx + 1);
      } else {
        const r = await fetch(url);
        const buf = await r.buffer();
        base64 = buf.toString('base64');
        mimeType = r.headers.get('content-type') || 'image/jpeg';
      }
      if (mimeType.startsWith('image/')) {
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
    } catch (err) {
      console.warn('Could not process file for LLM:', err.message);
    }
  }

  parts.push({ text: fullPrompt });

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: responseJsonSchema ? 0.2 : 0.5,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Gemini] API error:', res.status, errText);
    throw Object.assign(new Error(`Gemini API error: ${errText}`), { status: res.status });
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (responseJsonSchema) {
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini JSON response:', rawText);
      throw new Error('AI returned invalid JSON');
    }
  }

  return rawText;
}

module.exports = { invokeLLM };
