const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const PLAN_MONTHLY_VALUE = {
  monthly: 10,
  yearly: 100 / 12
};

const DRAW_SPLIT = {
  '5-number': 0.4,
  '4-number': 0.35,
  '3-number': 0.25
};

const drawRandomNumbers = () => {
  const numbers = [];
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
};

const drawWeightedNumbers = () => {
  const frequency = new Map();
  for (let i = 1; i <= 45; i += 1) frequency.set(i, 1);

  global.db.scores.forEach((record) => {
    (record.entries || []).forEach((entry) => {
      const current = frequency.get(entry.score) || 1;
      frequency.set(entry.score, current + 4);
    });
  });

  // Blend "most frequent" and "least frequent" behavior so the weighted mode
  // does not only overfit to hot values.
  const values = [...frequency.values()];
  const minWeight = Math.min(...values);
  const maxWeight = Math.max(...values);
  const blendedWeight = new Map();
  frequency.forEach((weight, value) => {
    const leastBias = maxWeight - weight + minWeight;
    blendedWeight.set(value, Math.max(1, weight + Math.floor(leastBias * 0.5)));
  });

  const picked = [];
  while (picked.length < 5) {
    const pool = [];
    blendedWeight.forEach((weight, value) => {
      if (!picked.includes(value)) {
        for (let i = 0; i < weight; i += 1) pool.push(value);
      }
    });
    const selected = pool[Math.floor(Math.random() * pool.length)];
    picked.push(selected);
  }

  return picked.sort((a, b) => a - b);
};

const getEntryScores = (userId) => {
  const record = global.db.scores.find((s) => s.userId === userId);
  if (!record || !record.entries?.length) return [];
  const latestFive = [...record.entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  return latestFive.map((entry) => entry.score);
};

const findMatchBuckets = (drawnNumbers) => {
  const buckets = {
    '5-number': [],
    '4-number': [],
    '3-number': []
  };
  const eligibility = {
    activeSubscribers: 0,
    withCompleteScores: 0
  };

  global.db.users
    .filter((u) => u.role === 'user' && u.subscription?.status === 'active')
    .forEach((user) => {
      eligibility.activeSubscribers += 1;
      const latestScores = getEntryScores(user.id);
      if (latestScores.length < 5) return;

      eligibility.withCompleteScores += 1;
      const ticket = new Set(latestScores);
      if (!ticket.size) return;
      const matchCount = drawnNumbers.filter((n) => ticket.has(n)).length;

      if (matchCount === 5) buckets['5-number'].push(user.id);
      if (matchCount === 4) buckets['4-number'].push(user.id);
      if (matchCount === 3) buckets['3-number'].push(user.id);
    });

  return { buckets, eligibility };
};

const getActivePoolBase = () =>
  global.db.users
    .filter((user) => user.role === 'user' && user.subscription?.status === 'active')
    .reduce((acc, user) => {
      const plan = user.subscription?.plan || 'monthly';
      return acc + (PLAN_MONTHLY_VALUE[plan] || PLAN_MONTHLY_VALUE.monthly);
    }, 0);

const buildPayoutPreview = (matchBuckets, eligibility) => {
  const basePool = getActivePoolBase();
  const rolloverFromPrevious = global.db.jackpotRollover || 0;
  const totalPool = basePool + rolloverFromPrevious;

  const tier5Pool = totalPool * DRAW_SPLIT['5-number'];
  const tier4Pool = totalPool * DRAW_SPLIT['4-number'];
  const tier3Pool = totalPool * DRAW_SPLIT['3-number'];

  const winner5 = matchBuckets['5-number'].length;
  const winner4 = matchBuckets['4-number'].length;
  const winner3 = matchBuckets['3-number'].length;

  const tier5Each = winner5 > 0 ? tier5Pool / winner5 : 0;
  const tier4Each = winner4 > 0 ? tier4Pool / winner4 : 0;
  const tier3Each = winner3 > 0 ? tier3Pool / winner3 : 0;

  const rolloverToNext = winner5 === 0 ? tier5Pool : 0;
  const totalPrizePaid = (tier5Each * winner5) + (tier4Each * winner4) + (tier3Each * winner3);

  return {
    basePool,
    rolloverFromPrevious,
    totalPool,
    rolloverToNext,
    totalPrizePaid,
    eligibleSubscribers: eligibility.withCompleteScores,
    activeSubscribers: eligibility.activeSubscribers,
    tiers: {
      '5-number': { pool: tier5Pool, winners: winner5, amountEach: tier5Each },
      '4-number': { pool: tier4Pool, winners: winner4, amountEach: tier4Each },
      '3-number': { pool: tier3Pool, winners: winner3, amountEach: tier3Each }
    }
  };
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getUpcomingDrawDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
};

// Get current draws history
router.get('/', authMiddleware, (req, res) => {
    const draws = [...global.db.draws].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    res.json(draws);
});

router.get('/upcoming', authMiddleware, (req, res) => {
  res.json({
    monthKey: getCurrentMonthKey(),
    nextDrawDate: getUpcomingDrawDate()
  });
});

router.get('/winners', authMiddleware, adminMiddleware, (req, res) => {
  const result = global.db.draws.flatMap((draw) =>
    (draw.winners || []).map((winner) => ({
      drawId: draw.id,
      drawDate: draw.publishedAt,
      monthKey: draw.monthKey,
      ...winner
    }))
  );

  res.json(result.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate)));
});

// Admin configures and simulates a draw
router.post('/simulate', authMiddleware, adminMiddleware, (req, res) => {
    const { mode } = req.body; // 'random' or 'weighted'
    if (!['random', 'algorithm'].includes(mode)) {
      return res.status(400).json({ message: 'mode must be random or algorithm' });
    }

    const drawnNumbers = mode === 'random' ? drawRandomNumbers() : drawWeightedNumbers();
    const drawResult = findMatchBuckets(drawnNumbers);
    const payoutPreview = buildPayoutPreview(drawResult.buckets, drawResult.eligibility);

    const simulation = {
      id: Date.now(),
      monthKey: getCurrentMonthKey(),
      drawnNumbers,
      matches: drawResult.buckets,
      mode,
      payoutPreview,
      eligibility: drawResult.eligibility,
      isSimulation: true,
      createdAt: new Date().toISOString()
    };

    global.db.lastDrawSimulation = simulation;
    res.json(simulation);
});

// Admin publishes the simulation as official
router.post('/publish', authMiddleware, adminMiddleware, (req, res) => {
    const simulation = global.db.lastDrawSimulation;
    if (!simulation) {
      return res.status(400).json({ message: 'No simulation found. Run simulation first.' });
    }

    const monthKey = getCurrentMonthKey();
    const existingMonthlyDraw = global.db.draws.find((draw) => draw.monthKey === monthKey);
    if (existingMonthlyDraw) {
      return res.status(400).json({ message: 'Monthly draw already published for this month.' });
    }

    const { drawnNumbers, mode } = simulation;
    const drawResult = findMatchBuckets(drawnNumbers);
    const payout = buildPayoutPreview(drawResult.buckets, drawResult.eligibility);

    const winners = [];
    ['5-number', '4-number', '3-number'].forEach((matchType) => {
      const amount = payout.tiers[matchType].amountEach;
      drawResult.buckets[matchType].forEach((userId) => {
        const user = global.db.users.find((u) => u.id === userId);
        if (!user) return;
        user.winningsBalance = (user.winningsBalance || 0) + amount;
        user.totalWinnings = (user.totalWinnings || 0) + amount;
        winners.push({
          userId,
          email: user.email,
          matchType,
          amount,
          paymentStatus: 'Pending'
        });
        global.db.notifications.push({
          id: Date.now() + Math.floor(Math.random() * 5000),
          type: 'draw_winner',
          userId: user.id,
          message: `You won in the ${matchType} tier for draw ${monthKey}.`,
          createdAt: new Date().toISOString()
        });
        global.db.emailOutbox.push({
          id: Date.now() + Math.floor(Math.random() * 5000) + 1,
          userId: user.id,
          type: 'winner_alert',
          subject: 'Digital Heroes Draw Winner Alert',
          body: `Congrats! You won ${amount.toFixed(2)} in the ${matchType} tier.`,
          createdAt: new Date().toISOString()
        });
      });
    });

    const newDraw = {
      id: Date.now(),
      monthKey,
      publishedAt: new Date().toISOString(),
      drawnNumbers,
      mode,
      matches: drawResult.buckets,
      payout,
      eligibility: drawResult.eligibility,
      winners,
      published: true,
      totalPrizePaid: payout.totalPrizePaid
    };

    global.db.draws.push(newDraw);
    global.db.jackpotRollover = payout.rolloverToNext;
    global.db.lastDrawSimulation = null;

    res.json({ message: 'Draw published officially', draw: newDraw });
});

module.exports = router;
