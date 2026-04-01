const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const PLAN_PRICE = {
  monthly: 10,
  yearly: 100
};

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ message: 'plan must be monthly or yearly' });
  }

  const price = PLAN_PRICE[plan];
  const user = global.db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.subscription = {
    status: 'active',
    plan,
    renewsAt: addDays(plan === 'yearly' ? 365 : 30),
    canceledAt: null
  };

  const donationPercentage = Math.max(10, parseInt(user.donationPercentage, 10) || 10);
  const charityCut = (price * donationPercentage) / 100;
  const charity = global.db.charities.find((c) => c.id === user.charityId);
  if (charity) charity.totalDonations += charityCut;

  const extraContribution = Number(req.body.extraContribution || 0);
  if (extraContribution > 0 && charity) {
    charity.totalDonations += extraContribution;
  }

  global.db.notifications.push({
    id: Date.now(),
    type: 'subscription_activated',
    userId: user.id,
    message: `Subscription activated (${plan}).`,
    createdAt: new Date().toISOString()
  });
  global.db.emailOutbox.push({
    id: Date.now() + 1,
    userId: user.id,
    type: 'subscription_receipt',
    subject: 'Subscription Activated',
    body: `Your ${plan} subscription is active.`,
    createdAt: new Date().toISOString()
  });

  res.json({
    url: '/dashboard',
    message: 'Mock payment successful, subscription active.',
    subscription: user.subscription
  });
});

router.post('/renew-subscription', authMiddleware, async (req, res) => {
  const user = global.db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const plan = user.subscription?.plan || 'monthly';
  user.subscription = {
    status: 'active',
    plan,
    renewsAt: addDays(plan === 'yearly' ? 365 : 30),
    canceledAt: null
  };

  res.json({ message: 'Subscription renewed', subscription: user.subscription });
});

router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  const user = global.db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.subscription?.status !== 'active') {
    return res.status(400).json({ message: 'No active subscription to cancel' });
  }

  user.subscription.status = 'canceled';
  user.subscription.canceledAt = new Date().toISOString();
  user.subscription.renewsAt = null;

  global.db.notifications.push({
    id: Date.now() + 1,
    type: 'subscription_canceled',
    userId: user.id,
    message: 'Subscription canceled successfully.',
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Subscription canceled', subscription: user.subscription });
});

router.post('/separate-donation', authMiddleware, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valid donation amount is required' });
  }

  const user = global.db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const charityId = parseInt(req.body.charityId || user.charityId, 10);
  const charity = global.db.charities.find((c) => c.id === charityId);
  if (!charity) return res.status(404).json({ message: 'Charity not found' });

  charity.totalDonations += amount;
  global.db.emailOutbox.push({
    id: Date.now() + 2,
    userId: user.id,
    type: 'donation_receipt',
    subject: 'Donation Receipt',
    body: `Thank you for donating ${amount.toFixed(2)} to ${charity.name}.`,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Donation submitted successfully', charity });
});

router.post('/verify-winner', authMiddleware, adminMiddleware, (req, res) => {
  const { userId, status, proofId } = req.body;
  if (!['Paid', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'status must be Paid or Rejected' });
  }

  const user = global.db.users.find((u) => u.id === parseInt(userId, 10));
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (proofId) {
    const proof = global.db.proofs.find((p) => p.id === parseInt(proofId, 10));
    if (proof) {
      proof.verificationStatus = status === 'Paid' ? 'Approved' : 'Rejected';
      proof.paymentStatus = status;
      proof.reviewedAt = new Date().toISOString();
      proof.reviewedBy = req.user.id;
    }
  }

  user.winningsPaymentStatus = status;
  res.json({ message: `Winner proof ${status}`, userId: user.id, status });
});

router.get('/email-outbox', authMiddleware, adminMiddleware, (req, res) => {
  res.json(global.db.emailOutbox.slice(-100).reverse());
});

module.exports = router;
