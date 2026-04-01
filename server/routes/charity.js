const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all charities
router.get('/', (req, res) => {
    const { q, category, featured } = req.query;
    let result = [...global.db.charities];

    if (q) {
      const query = String(q).toLowerCase();
      result = result.filter((charity) =>
        charity.name.toLowerCase().includes(query) ||
        charity.description.toLowerCase().includes(query)
      );
    }

    if (category) {
      result = result.filter((charity) => charity.category?.toLowerCase() === String(category).toLowerCase());
    }

    if (featured !== undefined) {
      const isFeatured = String(featured).toLowerCase() === 'true';
      result = result.filter((charity) => Boolean(charity.featured) === isFeatured);
    }

    return res.json(result);
});

// Search charities
router.get('/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    const results = global.db.charities.filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
    );
    res.json(results);
});

router.get('/featured/list', (req, res) => {
  res.json(global.db.charities.filter((charity) => charity.featured));
});

// Get a specific charity profile & events
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const charity = global.db.charities.find(c => c.id === id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    
    res.json({
      ...charity,
      events: charity.upcomingEvents || [{ id: 1, title: 'Annual Golf Gala', date: '2026-10-10' }],
      impactStats: {
        supporters: Math.floor((charity.totalDonations || 0) / 15) + 12,
        campaigns: charity.featured ? 4 : 2
      }
    });
});

// Add new charity
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { name, description, category, country, featured, imageUrl, upcomingEvents } = req.body;
    if (!name || !description) {
      return res.status(400).json({ message: 'name and description are required' });
    }

    const newCharity = {
      id: Date.now(),
      name,
      description,
      category: category || 'General',
      country: country || 'United States',
      featured: Boolean(featured),
      imageUrl: imageUrl || '',
      upcomingEvents: Array.isArray(upcomingEvents) ? upcomingEvents : [],
      totalDonations: 0
    };
    global.db.charities.push(newCharity);
    res.status(201).json(newCharity);
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const charity = global.db.charities.find((c) => c.id === id);
  if (!charity) return res.status(404).json({ message: 'Charity not found' });

  const allowedFields = ['name', 'description', 'category', 'country', 'featured', 'imageUrl', 'upcomingEvents'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      charity[field] = req.body[field];
    }
  });

  res.json({ message: 'Charity updated', charity });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = global.db.charities.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ message: 'Charity not found' });

  global.db.charities.splice(index, 1);
  res.json({ message: 'Charity deleted' });
});

module.exports = router;
