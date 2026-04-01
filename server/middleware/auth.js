const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    return process.env.JWT_SECRET;
};

const markSubscriptionState = (user) => {
    const subscription = user?.subscription;
    if (!subscription) return;

    if (subscription.status === 'active' && subscription.renewsAt) {
        const renewDate = new Date(subscription.renewsAt);
        if (!Number.isNaN(renewDate.getTime()) && renewDate.getTime() < Date.now()) {
            subscription.status = 'lapsed';
            subscription.canceledAt = subscription.canceledAt || renewDate.toISOString();
            subscription.renewsAt = null;
        }
    }
};

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = global.db.users.find((u) => u.id === decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found for token' });
        }

        markSubscriptionState(user);
        req.user = { ...decoded, subscriptionStatus: user.subscription?.status || 'inactive' };
        req.currentUser = user;
        next();
    } catch (err) {
        if (err.message === 'JWT_SECRET is not configured') {
            return res.status(500).json({ message: err.message });
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

const activeSubscriptionOnly = (req, res, next) => {
    if (req.currentUser?.subscription?.status !== 'active') {
        return res.status(403).json({ message: 'Active subscription required' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware, activeSubscriptionOnly };
