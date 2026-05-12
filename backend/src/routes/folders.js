const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/folders
router.get('/', requireAuth, async (req, res) => {
  const folders = await prisma.folder.findMany({
    where: { created_by: req.user.email },
    orderBy: { created_date: 'asc' },
  });
  res.json(folders);
});

// POST /api/folders
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'name is required' });
  const folder = await prisma.folder.create({
    data: { name: name.trim(), created_by: req.user.email },
  });
  res.status(201).json(folder);
});

// PUT /api/folders/:id
router.put('/:id', requireAuth, async (req, res) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder) return res.status(404).json({ message: 'Not found' });
  if (folder.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  const data = {};
  if ('name' in req.body) data.name = req.body.name.trim();
  if ('item_ids' in req.body) data.item_ids = JSON.stringify(req.body.item_ids);

  const updated = await prisma.folder.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// DELETE /api/folders/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder) return res.status(404).json({ message: 'Not found' });
  if (folder.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });
  await prisma.folder.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
