const express = require('express');
const { invokeLLM } = require('../lib/claude');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/ai/invoke-llm ──────────────────────────────────────────────────
// Mirrors base44's integrations.Core.InvokeLLM
//
// Body: {
//   prompt: string
//   file_urls?: string[]          (image URLs to pass as vision input)
//   response_json_schema?: object (if present, forces JSON output)
// }
//
// Returns: parsed JSON object | plain string
router.post('/invoke-llm', requireAuth, async (req, res) => {
  const { prompt, file_urls, response_json_schema } = req.body || {};

  if (!prompt) {
    return res.status(400).json({
      message: 'prompt is required',
      debug: {
        body: req.body,
        rawBodyPreview: req._rawBody ? req._rawBody.slice(0, 300) : null,
        contentType: req.headers['content-type'],
        method: req.method,
      }
    });
  }

  try {
    const result = await invokeLLM({
      prompt,
      fileUrls: file_urls || [],
      responseJsonSchema: response_json_schema || null,
    });
    res.json(result);
  } catch (err) {
    console.error('[AI] invokeLLM error:', err?.status, err?.message, err?.error);
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || 'AI generation failed', detail: err?.error });
  }
});

module.exports = router;
