const Groq = require('groq-sdk');
const fetch = require('node-fetch');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: fullPrompt },
  ];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: responseJsonSchema ? 0.2 : 0.5,
    max_tokens: 4096,
  });

  const rawText = completion.choices?.[0]?.message?.content || '';

  if (responseJsonSchema) {
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Groq JSON response:', rawText);
      throw new Error('AI returned invalid JSON');
    }
  }

  return rawText;
}

module.exports = { invokeLLM };
