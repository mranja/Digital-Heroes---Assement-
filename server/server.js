const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ======================
// ✅ CORS FIX (IMPORTANT)
// ======================
app.use(cors({
  origin: [
    "http://localhost:5173", // local frontend
    "https://digital-heroes-neon.vercel.app" // your deployed frontend
  ],
  credentials: true
}));

// ======================
// ✅ MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const nowIso = new Date().toISOString();

const nextDate = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

// ======================
// ✅ MOCK DATABASE
// ======================
global.db = {
  users: [
    {
      id: 1,
      email: 'ranjan.m1325@gmail.com',
      password: 'Admin@digitalheroes',
      role: 'admin',
      charityId: null,
      donationPercentage: 10,
      winningsBalance: 0,
      totalWinnings: 0,
      subscription: {
        status: 'active',
        plan: 'yearly',
        renewsAt: nextDate(365),
        canceledAt: null
      }
    },
    {
      id: 2,
      email: 'test@user.com',
      password: 'password',
      role: 'user',
      charityId: 1,
      donationPercentage: 15,
      winningsBalance: 42,
      totalWinnings: 42,
      subscription: {
        status: 'active',
        plan: 'monthly',
        renewsAt: nextDate(30),
        canceledAt: null
      }
    }
  ],

  scores: [
    {
      id: 1,
      userId: 2,
      entries: [
        { id: 1001, score: 36, date: '2026-03-10' },
        { id: 1002, score: 42, date: '2026-03-14' },
        { id: 1003, score: 38, date: '2026-03-18' },
        { id: 1004, score: 40, date: '2026-03-21' },
        { id: 1005, score: 45, date: '2026-03-25' }
      ]
    }
  ],

  charities: [
    {
      id: 1,
      name: 'Golfers Against Cancer',
      description:
        'Funding targeted cancer research through community-backed golf programs.',
      category: 'Health',
      country: 'United States',
      featured: true,
      imageUrl: '/images/charity-health.svg',
      upcomingEvents: [
        { id: 91, title: 'Community Golf Day', date: '2026-07-12' }
      ],
      totalDonations: 450
    },
    {
      id: 2,
      name: 'Fairway Youth Futures',
      description:
        'Opening access to junior golf and mentorship for underserved teens.',
      category: 'Youth',
      country: 'United States',
      featured: false,
      imageUrl: '/images/charity-youth.svg',
      upcomingEvents: [
        { id: 92, title: 'Junior Mentorship Camp', date: '2026-06-21' }
      ],
      totalDonations: 120
    }
  ],

  draws: [],
  proofs: [],
  jackpotRollover: 0,
  lastDrawSimulation: null,

  notifications: [
    {
      id: 1,
      type: 'welcome',
      userId: 2,
      message: 'Welcome to Digital Heroes. Your account is active.',
      createdAt: nowIso
    }
  ],

  emailOutbox: [],
  corporateAccounts: [],
  campaigns: []
};

// ======================
// ✅ ROUTES
// ======================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const scoreRoutes = require('./routes/scores');
const drawRoutes = require('./routes/draws');
const charityRoutes = require('./routes/charity');
const paymentRoutes = require('./routes/payment');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/payment', paymentRoutes);

// ======================
// ✅ HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Digital Heroes API is running 🚀'
  });
});

// ======================
// ✅ ROOT ROUTE (Render needs this)
// ======================
app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

// ======================
// ✅ ERROR HANDLING
// ======================
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// ======================
// ✅ START SERVER
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
