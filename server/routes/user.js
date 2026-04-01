const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const getUserById = (id) => global.db.users.find((u) => u.id === id);
const getScoreRecord = (userId) => global.db.scores.find((s) => s.userId === userId);
const getPublishedDraws = () => [...global.db.draws].filter((d) => d.published).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  charityId: user.charityId,
  donationPercentage: user.donationPercentage,
  winningsBalance: user.winningsBalance || 0,
  totalWinnings: user.totalWinnings || 0,
  subscription: user.subscription
});

const computeParticipationSummary = (user) => {
  const draws = getPublishedDraws();
  const scoreRecord = getScoreRecord(user.id);
  const scores = scoreRecord?.entries || [];
  const scoresByDate = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));
  const hasCompleteScoreCard = scoresByDate.length >= 5;
  const oldestRetainedScoreDate = hasCompleteScoreCard ? new Date(scoresByDate[0].date) : null;

  const drawsEntered = draws.filter((draw) =>
    hasCompleteScoreCard && oldestRetainedScoreDate <= new Date(draw.publishedAt)
  ).length;

  const upcomingDrawDate = (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  })();

  return {
    drawsEntered,
    hasCompleteScoreCard,
    completedDraws: draws.length,
    upcomingDrawDate
  };
};

const getEligibleProofDraws = (userId) => {
  const draws = getPublishedDraws();
  return draws.filter((draw) => (draw.winners || []).some((winner) => winner.userId === userId));
};

const getCurrentPaymentStatus = (userId) => {
  const proofs = global.db.proofs.filter((p) => p.userId === userId);
  if (!proofs.length) return 'No Claims';
  const latest = [...proofs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (latest.paymentStatus === 'Paid') return 'Paid';
  if (latest.verificationStatus === 'Rejected') return 'Rejected';
  return 'Pending';
};

router.get('/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const charity = global.db.charities.find((c) => c.id === user.charityId) || null;
  const scoreData = getScoreRecord(user.id);
  const scores = scoreData?.entries ? [...scoreData.entries].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
  const proofs = global.db.proofs
    .filter((p) => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const eligibleProofDraws = getEligibleProofDraws(user.id).map((draw) => ({
    id: draw.id,
    monthKey: draw.monthKey,
    publishedAt: draw.publishedAt,
    winnings: (draw.winners || []).filter((w) => w.userId === user.id)
  }));

  res.json({
    ...sanitizeUser(user),
    charityDetails: charity,
    scores,
    proofUploads: proofs,
    eligibleProofDraws,
    participationSummary: computeParticipationSummary(user),
    winningsPaymentStatus: getCurrentPaymentStatus(user.id),
    notifications: global.db.notifications.filter((n) => n.userId === user.id).slice(-5).reverse()
  });
});

router.put('/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.donationPercentage !== undefined) {
    const pct = parseInt(req.body.donationPercentage, 10);
    if (!Number.isInteger(pct) || pct < 10 || pct > 100) {
      return res.status(400).json({ message: 'Donation percentage must be between 10 and 100' });
    }
    user.donationPercentage = pct;
  }

  if (req.body.charityId !== undefined) {
    const charityId = parseInt(req.body.charityId, 10);
    const charity = global.db.charities.find((c) => c.id === charityId);
    if (!charity) {
      return res.status(404).json({ message: 'Selected charity does not exist' });
    }
    user.charityId = charity.id;
  }

  res.json({ message: 'Profile updated', user: sanitizeUser(user) });
});

router.post('/me/proof', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { drawId, imageUrl, note } = req.body;
  const parsedDrawId = parseInt(drawId, 10);
  if (!Number.isInteger(parsedDrawId)) {
    return res.status(400).json({ message: 'drawId is required' });
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ message: 'imageUrl is required' });
  }

  const draw = global.db.draws.find((d) => d.id === parsedDrawId);
  if (!draw) return res.status(404).json({ message: 'Draw not found' });

  const eligible = (draw.winners || []).some((winner) => winner.userId === user.id);
  if (!eligible) {
    return res.status(403).json({ message: 'Only winners can upload verification proof for this draw' });
  }

  const alreadySubmitted = global.db.proofs.find((p) => p.userId === user.id && p.drawId === parsedDrawId && p.verificationStatus !== 'Rejected');
  if (alreadySubmitted) {
    return res.status(400).json({ message: 'Proof already submitted for this draw' });
  }

  const proof = {
    id: Date.now(),
    userId: user.id,
    drawId: parsedDrawId,
    imageUrl,
    note: note || '',
    verificationStatus: 'Pending',
    paymentStatus: 'Pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null
  };

  global.db.proofs.push(proof);
  global.db.notifications.push({
    id: Date.now() + 1,
    type: 'proof_uploaded',
    userId: user.id,
    message: `Proof submitted for draw ${parsedDrawId}.`,
    createdAt: new Date().toISOString()
  });
  global.db.emailOutbox.push({
    id: Date.now() + 2,
    userId: user.id,
    type: 'proof_received',
    subject: 'Your winner proof is under review',
    body: `We have received your proof for draw ${parsedDrawId}.`,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Proof uploaded successfully, pending admin review.', proof });
});

router.get('/me/winnings', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const drawWins = global.db.draws.flatMap((draw) =>
    (draw.winners || [])
      .filter((winner) => winner.userId === user.id)
      .map((winner) => ({
        drawId: draw.id,
        drawDate: draw.publishedAt,
        matchType: winner.matchType,
        amount: winner.amount,
        paymentStatus: winner.paymentStatus || 'Pending'
      }))
  );

  res.json({
    balance: user.winningsBalance || 0,
    totalWinnings: user.totalWinnings || 0,
    currentPaymentStatus: getCurrentPaymentStatus(user.id),
    winningsHistory: drawWins
  });
});

router.get('/admin/summary', authMiddleware, adminMiddleware, (req, res) => {
  const users = global.db.users;
  const activeUsers = users.filter((u) => u.subscription?.status === 'active');
  const charities = global.db.charities;
  const draws = global.db.draws;
  const proofsPending = global.db.proofs.filter((p) => p.verificationStatus === 'Pending').length;
  const totalCharityContributions = charities.reduce((acc, charity) => acc + (charity.totalDonations || 0), 0);
  const totalPrizePaid = draws.reduce((acc, draw) => acc + (draw.totalPrizePaid || 0), 0);
  const totalPrizePool = draws.reduce((acc, draw) => acc + (draw.payout?.totalPool || 0), 0);
  const drawStats = draws.reduce((acc, draw) => {
    const tiers = draw?.payout?.tiers || {};
    acc.totalWinners += (draw.winners || []).length;
    acc.totalTier5Winners += tiers['5-number']?.winners || 0;
    acc.totalTier4Winners += tiers['4-number']?.winners || 0;
    acc.totalTier3Winners += tiers['3-number']?.winners || 0;
    return acc;
  }, {
    totalWinners: 0,
    totalTier5Winners: 0,
    totalTier4Winners: 0,
    totalTier3Winners: 0
  });
  const latestDraw = [...draws].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null;

  res.json({
    totalUsers: users.length,
    activeSubscriptions: activeUsers.length,
    prizePoolRollover: global.db.jackpotRollover || 0,
    proofsPending,
    totalCharityContributions,
    totalPrizePaid,
    totalPrizePool,
    drawCount: draws.length,
    averagePoolPerDraw: draws.length ? totalPrizePool / draws.length : 0,
    latestDrawDate: latestDraw?.publishedAt || null,
    drawStats
  });
});

router.get('/admin/proofs', authMiddleware, adminMiddleware, (req, res) => {
  const result = global.db.proofs.map((proof) => {
    const user = getUserById(proof.userId);
    const draw = global.db.draws.find((d) => d.id === proof.drawId);
    return {
      ...proof,
      userEmail: user?.email || 'Unknown User',
      drawDate: draw?.publishedAt || null
    };
  });

  res.json(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/admin/proofs/:proofId/review', authMiddleware, adminMiddleware, (req, res) => {
  const proofId = parseInt(req.params.proofId, 10);
  const { action } = req.body;
  if (!['approve', 'reject', 'mark_paid'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve, reject, or mark_paid' });
  }

  const proof = global.db.proofs.find((p) => p.id === proofId);
  if (!proof) return res.status(404).json({ message: 'Proof not found' });

  if (action === 'approve') {
    proof.verificationStatus = 'Approved';
  }
  if (action === 'reject') {
    proof.verificationStatus = 'Rejected';
    proof.paymentStatus = 'Rejected';
  }
  if (action === 'mark_paid') {
    proof.verificationStatus = 'Approved';
    proof.paymentStatus = 'Paid';

    const draw = global.db.draws.find((d) => d.id === proof.drawId);
    if (draw) {
      const winnerEntry = (draw.winners || []).find((w) => w.userId === proof.userId);
      if (winnerEntry) winnerEntry.paymentStatus = 'Paid';
    }
  }

  proof.reviewedAt = new Date().toISOString();
  proof.reviewedBy = req.user.id;

  const user = getUserById(proof.userId);
  if (user) {
    global.db.notifications.push({
      id: Date.now() + 3,
      type: 'proof_reviewed',
      userId: user.id,
      message: `Your proof status was updated: ${proof.verificationStatus}/${proof.paymentStatus}.`,
      createdAt: new Date().toISOString()
    });
  }

  res.json({ message: 'Proof updated', proof });
});

router.get('/admin/winners', authMiddleware, adminMiddleware, (req, res) => {
  const winners = global.db.draws.flatMap((draw) =>
    (draw.winners || []).map((winner) => ({
      drawId: draw.id,
      drawDate: draw.publishedAt,
      monthKey: draw.monthKey,
      ...winner
    }))
  );

  res.json(winners.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate)));
});

router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  res.json(global.db.users.map(sanitizeUser));
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = getUserById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.role !== undefined) {
    if (!['user', 'admin'].includes(req.body.role)) {
      return res.status(400).json({ message: 'role must be user or admin' });
    }
    user.role = req.body.role;
  }

  if (req.body.donationPercentage !== undefined) {
    const pct = parseInt(req.body.donationPercentage, 10);
    if (!Number.isInteger(pct) || pct < 10 || pct > 100) {
      return res.status(400).json({ message: 'Donation percentage must be between 10 and 100' });
    }
    user.donationPercentage = pct;
  }

  if (req.body.winningsBalance !== undefined) {
    const balance = Number(req.body.winningsBalance);
    if (Number.isNaN(balance) || balance < 0) {
      return res.status(400).json({ message: 'winningsBalance must be a non-negative number' });
    }
    user.winningsBalance = balance;
  }

  if (req.body.totalWinnings !== undefined) {
    const total = Number(req.body.totalWinnings);
    if (Number.isNaN(total) || total < 0) {
      return res.status(400).json({ message: 'totalWinnings must be a non-negative number' });
    }
    user.totalWinnings = total;
  }

  if (req.body.charityId !== undefined) {
    if (req.body.charityId === null || req.body.charityId === '') {
      user.charityId = null;
    } else {
      const charityId = parseInt(req.body.charityId, 10);
      const charity = global.db.charities.find((c) => c.id === charityId);
      if (!Number.isInteger(charityId) || !charity) {
        return res.status(404).json({ message: 'Selected charity does not exist' });
      }
      user.charityId = charityId;
    }
  }

  if (req.body.subscription) {
    if (req.body.subscription.status && !['active', 'inactive', 'canceled', 'lapsed'].includes(req.body.subscription.status)) {
      return res.status(400).json({ message: 'Invalid subscription status' });
    }
    if (req.body.subscription.plan && !['monthly', 'yearly'].includes(req.body.subscription.plan)) {
      return res.status(400).json({ message: 'Subscription plan must be monthly or yearly' });
    }
    user.subscription = {
      ...user.subscription,
      ...req.body.subscription
    };
  }

  res.json({ message: 'Updated', user: sanitizeUser(user) });
});

module.exports = router;
