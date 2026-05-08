const Groq = require('groq-sdk');
const fetch = require('node-fetch');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_TEXT_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview';

async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null, maxTokens = null }) {
  const systemInstruction = responseJsonSchema
    ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
    : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.';

  let fullPrompt = prompt;
  if (responseJsonSchema) {
    fullPrompt += '\n\nRespond ONLY with valid JSON that matches this schema:\n' +
      JSON.stringify(responseJsonSchema, null, 2) +
      '\nDo not include any explanation or markdown — just the raw JSON object.';
  }

  // Build user message — include images when present
  const imageUrls = fileUrls.filter(u => u && (u.startsWith('data:image/') || /\.(jpe?g|png|gif|webp)$/i.test(u)));
  const hasImages = imageUrls.length > 0;

  const userContent = hasImages
    ? [
        { type: 'text', text: fullPrompt },
        ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } })),
      ]
    : fullPrompt;

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];

  // Groq on-demand TPM limit is 12,000 tokens (input + output combined).
  // Keep total well under that: vision 6k, JSON 6k, plain text 4k.
  const tokenLimit = maxTokens || (hasImages ? 6000 : responseJsonSchema ? 6000 : 4096);

  const completion = await groq.chat.completions.create({
    model: hasImages ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
    messages,
    temperature: responseJsonSchema ? 0.2 : 0.5,
    max_tokens: tokenLimit,
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
