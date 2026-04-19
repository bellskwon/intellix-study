const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Core LLM invocation — mirrors base44's integrations.Core.InvokeLLM
 *
 * @param {string} prompt
 * @param {string[]} [fileUrls]  — image URLs to include as vision input
 * @param {object}  [responseJsonSchema] — if provided, forces JSON output
 * @returns {Promise<object|string>}
 */
async function invokeLLM({ prompt, fileUrls = [], responseJsonSchema = null }) {
  const userContent = [];

  // Attach images if provided
  for (const url of fileUrls) {
    try {
      let base64, contentType;

      if (url.startsWith('data:')) {
        // Data URL — extract base64 directly without a network fetch
        const commaIdx = url.indexOf(',');
        const header = url.slice(0, commaIdx); // e.g. "data:image/jpeg;base64"
        base64 = url.slice(commaIdx + 1);
        contentType = header.match(/data:([^;,]+)/)?.[1] || 'image/jpeg';
      } else {
        const fetchRes = await fetch(url);
        const buffer = await fetchRes.buffer();
        base64 = buffer.toString('base64');
        contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      }

      // Claude vision only supports image types — skip PDFs/video as base64
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

  // Build the text part of the prompt
  let fullPrompt = prompt;
  if (responseJsonSchema) {
    fullPrompt += '\n\nRespond ONLY with valid JSON that matches this schema:\n' +
      JSON.stringify(responseJsonSchema, null, 2) +
      '\nDo not include any explanation or markdown — just the raw JSON object.';
  }

  userContent.push({ type: 'text', text: fullPrompt });

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    // Lower temperature = more factual, less creative/hallucinated output.
    // 0.2 for structured JSON (quiz generation, grading), 0.5 for free-text.
    temperature: responseJsonSchema ? 0.2 : 0.5,
    system: responseJsonSchema
      ? 'You are a precise academic assistant for Intellix. Respond with valid JSON only — no markdown, no explanation. Never invent facts; only assert what you are certain is correct.'
      : 'You are a helpful academic assistant for Intellix, an online study platform for students. Be accurate and concise.',
    messages: [{ role: 'user', content: userContent }],
  });

  const rawText = message.content[0]?.text || '';

  if (responseJsonSchema) {
    try {
      // Strip markdown code fences if Claude wraps the JSON
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
