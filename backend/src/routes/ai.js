const express = require('express');
const { invokeLLM } = require('../lib/claude');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/invoke-llm', requireAuth, async (req, res) => {
  const { prompt, file_urls, response_json_schema } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ message: 'prompt is required' });
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
