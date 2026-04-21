const OpenAI = require('openai');
const fetch = require('node-fetch');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null }) {
  const userContent = [];

  // Attach images if provided
  for (const url of fileUrls) {
    try {
      let imageUrl = url;

      if (!url.startsWith('data:')) {
        const fetchRes = await fetch(url);
        const buffer = await fetchRes.buffer();
        const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) continue;
        imageUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      }

      userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
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

  const systemPrompt = responseJsonSchema
    ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
    : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: responseJsonSchema ? 0.2 : 0.5,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  const rawText = response.choices[0]?.message?.content || '';

  if (responseJsonSchema) {
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse OpenAI JSON response:', rawText);
      throw new Error('AI returned invalid JSON');
    }
  }

  return rawText;
}

module.exports = { invokeLLM };
