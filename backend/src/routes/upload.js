const express = require('express');
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Use memory storage — no disk writes, works on Vercel's ephemeral filesystem
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|mp4|mov|avi/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error('Only images, PDFs, and videos are allowed'));
  },
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Returns { file_url } as a base64 data URL — works without persistent storage
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const base64 = req.file.buffer.toString('base64');
  const file_url = `data:${req.file.mimetype};base64,${base64}`;
  res.json({ file_url });
});

module.exports = router;
