const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

// Helper to find a user
const findUser = (email) => global.db.users.find(u => u.email === email);
// Generate token
const generateToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
const buildSubscription = (plan = 'monthly') => ({
  status: 'inactive',
  plan,
  renewsAt: null,
  canceledAt: null
});

// Register Route
router.post('/register', async (req, res) => {
  const { email, password, charityId, donationPercentage, plan } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
  if (findUser(email)) return res.status(400).json({ message: 'User already exists' });
  if (plan && !['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ message: 'plan must be monthly or yearly' });
  }

  const donationPct = parseInt(donationPercentage, 10);
  const safeDonationPct = Number.isInteger(donationPct) && donationPct >= 10 && donationPct <= 100 ? donationPct : 10;
  const selectedCharityId = charityId ? parseInt(charityId, 10) : null;
  if (selectedCharityId !== null && !global.db.charities.find((c) => c.id === selectedCharityId)) {
    return res.status(404).json({ message: 'Selected charity does not exist' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    email,
    password: hashedPassword,
    role: 'user',
    charityId: selectedCharityId,
    donationPercentage: safeDonationPct,
    winningsBalance: 0,
    totalWinnings: 0,
    subscription: buildSubscription(plan),
    createdAt: new Date().toISOString()
  };
  global.db.users.push(newUser);
  global.db.notifications.push({
    id: Date.now() + 5,
    type: 'signup',
    userId: newUser.id,
    message: 'Your account was created successfully.',
    createdAt: new Date().toISOString()
  });
  global.db.emailOutbox.push({
    id: Date.now() + 6,
    userId: newUser.id,
    type: 'welcome_email',
    subject: 'Welcome to Digital Heroes',
    body: 'Your account is ready. Activate a subscription to enter draws.',
    createdAt: new Date().toISOString()
  });
  res.status(201).json({
    message: 'Registered successfully',
    token: generateToken({ id: newUser.id, role: newUser.role }),
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      subscription: newUser.subscription
    }
  });
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = findUser(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  // For mock hardcoded admin
  let isMatch = false;
  if (user.password === password) {
    isMatch = true;
  } else {
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (err) {
      isMatch = false;
    }
  }

  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  res.json({
    token: generateToken({ id: user.id, role: user.role }),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription
    }
  });
});

module.exports = router;
