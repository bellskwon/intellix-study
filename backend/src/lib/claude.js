const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null }) {
  const systemPrompt = responseJsonSchema
    ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
    : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.';

  let fullPrompt = prompt;
  if (responseJsonSchema) {
    fullPrompt += '\n\nRespond ONLY with valid JSON that matches this schema:\n' +
      JSON.stringify(responseJsonSchema, null, 2) +
      '\nDo not include any explanation or markdown — just the raw JSON object.';
  }

  const parts = [];

  // Attach images if provided
  for (const url of fileUrls) {
    try {
      let base64, contentType;

      if (url.startsWith('data:')) {
        const commaIdx = url.indexOf(',');
        const header = url.slice(0, commaIdx);
        base64 = url.slice(commaIdx + 1);
        contentType = header.match(/data:([^;,]+)/)?.[1] || 'image/jpeg';
      } else {
        const fetchRes = await fetch(url);
        const buffer = await fetchRes.buffer();
        base64 = buffer.toString('base64');
        contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      }

      if (contentType.startsWith('image/')) {
        parts.push({ inlineData: { mimeType: contentType, data: base64 } });
      }
    } catch (err) {
      console.warn('Could not process file for LLM:', err.message);
    }
  }

  parts.push({ text: fullPrompt });

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: responseJsonSchema ? 0.2 : 0.5,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const rawText = result.response.text();

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
