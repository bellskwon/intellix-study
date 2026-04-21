const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null }) {
  const userContent = [];

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
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: contentType, data: base64 },
        });
      }
    } catch (err) {
      console.warn('Could not process file for LLM:', err.message);
    }
  }

  let fullPrompt = prompt;
  if (responseJsonSchema) {
    fullPrompt += '\n\nRespond ONLY with valid JSON that matches this schema:\n' +
      JSON.stringify(responseJsonSchema, null, 2) +
      '\nDo not include any explanation or markdown — just the raw JSON object.';
  }

  userContent.push({ type: 'text', text: fullPrompt });

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    temperature: responseJsonSchema ? 0.2 : 0.5,
    system: responseJsonSchema
      ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
      : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.',
    messages: [{ role: 'user', content: userContent }],
  });

  const rawText = message.content[0]?.text || '';

  if (responseJsonSchema) {
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Claude JSON response:', rawText);
      throw new Error('AI returned invalid JSON');
    }
  }

  return rawText;
}

module.exports = { invokeLLM };
