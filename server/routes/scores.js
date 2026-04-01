const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware, activeSubscriptionOnly } = require('../middleware/auth');

const getUser = (id) => global.db.users.find((u) => u.id === id);
const normalizeDate = (rawDate) => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
};

const latestFirst = (entries) => [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
const safeBody = (req) => (req.body && typeof req.body === 'object' ? req.body : null);

// Get scores for logged-in user
router.get('/', authMiddleware, (req, res) => {
    const userScores = global.db.scores.find(s => s.userId === req.user.id);
    if (!userScores) return res.json({ scores: [] });
    res.json({ scores: latestFirst(userScores.entries || []) });
});

// Add a score
router.post('/', authMiddleware, activeSubscriptionOnly, (req, res) => {
    const body = safeBody(req);
    if (!body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { score, date } = body;
    if (score === undefined || score === null || score === '') {
      return res.status(400).json({ message: 'score is required' });
    }

    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const numScore = parseInt(score, 10);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 45) {
      return res.status(400).json({ message: 'Stableford score must be between 1 and 45' });
    }

    const safeDate = date ? normalizeDate(date) : new Date().toISOString().split('T')[0];
    if (!safeDate) {
      return res.status(400).json({ message: 'Invalid score date' });
    }

    let userScores = global.db.scores.find((s) => s.userId === req.user.id);
    if (!userScores) {
      userScores = { id: Date.now(), userId: req.user.id, entries: [] };
      global.db.scores.push(userScores);
    }

    const entry = { id: Date.now(), score: numScore, date: safeDate };
    userScores.entries.push(entry);

    // Keep latest 5 entries by date, drop the oldest.
    userScores.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (userScores.entries.length > 5) {
      userScores.entries.splice(0, userScores.entries.length - 5);
    }

    res.json({ message: 'Score added', scores: latestFirst(userScores.entries) });
});

router.put('/:entryId', authMiddleware, (req, res) => {
  const entryId = parseInt(req.params.entryId, 10);
  const body = safeBody(req);
  if (!body) {
    return res.status(400).json({ message: 'Request body is required' });
  }

  const { score, date } = body;
  if (!Number.isInteger(entryId)) return res.status(400).json({ message: 'Invalid score entry id' });
  if (score === undefined && date === undefined) {
    return res.status(400).json({ message: 'At least one field (score or date) is required' });
  }

  const userScores = global.db.scores.find((s) => s.userId === req.user.id);
  if (!userScores) return res.status(404).json({ message: 'No score record found' });

  const entry = userScores.entries.find((item) => item.id === entryId);
  if (!entry) return res.status(404).json({ message: 'Score entry not found' });

  if (score !== undefined) {
    const numScore = parseInt(score, 10);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 45) {
      return res.status(400).json({ message: 'Stableford score must be between 1 and 45' });
    }
    entry.score = numScore;
  }

  if (date !== undefined) {
    const safeDate = normalizeDate(date);
    if (!safeDate) return res.status(400).json({ message: 'Invalid score date' });
    entry.date = safeDate;
  }

  res.json({ message: 'Score updated', scores: latestFirst(userScores.entries) });
});

router.get('/admin/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ message: 'Invalid user id' });

  const userScores = global.db.scores.find((s) => s.userId === userId);
  res.json({ scores: userScores ? latestFirst(userScores.entries || []) : [] });
});

router.put('/admin/:userId/:entryId', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const entryId = parseInt(req.params.entryId, 10);
  if (!Number.isInteger(userId) || !Number.isInteger(entryId)) {
    return res.status(400).json({ message: 'Invalid identifiers' });
  }

  const userScores = global.db.scores.find((s) => s.userId === userId);
  if (!userScores) return res.status(404).json({ message: 'No score record found for user' });

  const entry = userScores.entries.find((item) => item.id === entryId);
  if (!entry) return res.status(404).json({ message: 'Score entry not found' });

  const body = safeBody(req);
  if (!body) {
    return res.status(400).json({ message: 'Request body is required' });
  }
  if (body.score === undefined || body.date === undefined) {
    return res.status(400).json({ message: 'score and date are required' });
  }

  const numScore = parseInt(body.score, 10);
  const safeDate = normalizeDate(body.date);
  if (!Number.isInteger(numScore) || numScore < 1 || numScore > 45) {
    return res.status(400).json({ message: 'Stableford score must be between 1 and 45' });
  }
  if (!safeDate) return res.status(400).json({ message: 'Invalid score date' });

  entry.score = numScore;
  entry.date = safeDate;

  res.json({ message: 'Admin updated score', scores: latestFirst(userScores.entries) });
});

module.exports = router;
