import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Gift,
  Gauge,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy
} from 'lucide-react';
import api from '../lib/api';
import SafeImage from '../components/SafeImage';

const LandingPage = () => {
  const [charities, setCharities] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get('/charities');
        if (alive) setCharities(res.data || []);
      } catch {
        if (alive) setCharities([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const visibleCharities = useMemo(() => {
    if (!query.trim()) return charities.slice(0, 6);
    const lowered = query.toLowerCase();
    return charities
      .filter((item) => item.name.toLowerCase().includes(lowered) || item.description.toLowerCase().includes(lowered))
      .slice(0, 6);
  }, [charities, query]);

  const featuredCharity = useMemo(
    () => charities.find((item) => item.featured) || charities[0] || null,
    [charities]
  );

  const trustPoints = [
    {
      title: 'Verified Draws',
      description: 'Transparent winner logs and draw history make every monthly reward process easy to trust.',
      icon: <ShieldCheck size={18} />
    },
    {
      title: 'Performance Focused',
      description: 'Capture score history and view trends so every round contributes to long-term improvement.',
      icon: <Gauge size={18} />
    },
    {
      title: 'Real Charity Impact',
      description: 'A part of every plan supports your selected charity, with clear donation tracking for members.',
      icon: <HeartHandshake size={18} />
    },
    {
      title: 'Member Rewards',
      description: 'Unlock extra seasonal challenges and bonus reward pools by maintaining active participation.',
      icon: <Gift size={18} />
    }
  ];

  const memberJourney = [
    {
      title: 'Week 1: Join + Pick Charity',
      details: 'Create your profile and select a cause aligned with your values.'
    },
    {
      title: 'Week 2: Log Score Rounds',
      details: 'Add your latest score cards to build your current performance profile.'
    },
    {
      title: 'Week 3: Improve with Insights',
      details: 'Compare consistency and focus on steady score gains before the draw cycle.'
    },
    {
      title: 'Week 4: Draw + Donation Update',
      details: 'See draw outcomes and the running contribution total to your selected charity.'
    }
  ];

  const faqs = [
    {
      question: 'Can users edit old score entries?',
      answer: 'Users can submit new rounds, and the platform keeps the latest five entries to maintain fairness.'
    },
    {
      question: 'How do charities receive funds?',
      answer: 'A percentage from active subscriptions is allocated and reported in platform donation summaries.'
    },
    {
      question: 'Is there a separate admin experience?',
      answer: 'Yes. Admin users access a dedicated dashboard for reviewing proofs, scores, and platform metrics.'
    }
  ];

  return (
    <div className="container landing">
      <section className="hero-panel">
        <div className="hero-content animate-rise">
          <h1 className="hero-title">
            Golf Charity Subscription Platform
            <span>Track scores. Enter draws. Support real causes.</span>
          </h1>
          <p className="hero-subtitle">
            Digital Heroes combines golf performance tracking, monthly prize draws, and charity contributions in one platform.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="btn-primary">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-outline">
              Sign In
            </Link>
            <Link to="/charities" className="btn-outline">
              Explore Charities
            </Link>
          </div>

          <div className="hero-metrics">
            <div>
              <p className="metric-number">5</p>
              <p className="metric-label">Latest score entries per member</p>
            </div>
            <div>
              <p className="metric-number">Monthly</p>
              <p className="metric-label">Prize draw cycle</p>
            </div>
            <div>
              <p className="metric-number">100%</p>
              <p className="metric-label">Traceable member donations</p>
            </div>
          </div>
        </div>
      </section>

      <section className="charity-section animate-rise delay-1">
        <div className="section-header">
          <h2>How It Works</h2>
        </div>
        <div className="feature-grid feature-grid-tight">
          <article className="feature-card">
            <h3>1. Subscribe</h3>
            <p>Choose monthly or yearly subscription and activate your account.</p>
          </article>
          <article className="feature-card">
            <h3>2. Enter Scores</h3>
            <p>Submit your latest Stableford scores. The platform always keeps only the latest 5 entries.</p>
          </article>
          <article className="feature-card">
            <h3>3. Draw + Charity Impact</h3>
            <p>Participate in monthly draws while a percentage of your subscription supports your selected charity.</p>
          </article>
        </div>
      </section>

      <section className="charity-section animate-rise delay-2" id="charities">
        <div className="section-header section-header-wrap section-header-with-actions">
          <div>
            <h2>Explore Charities</h2>
            <p>Search top causes now, then open full profile details in the charity directory.</p>
          </div>
          <div className="section-inline-controls">
            <label className="search-inline">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search charities"
              />
            </label>
            <Link to="/charities" className="btn-outline">View All</Link>
          </div>
        </div>

        <div className="charity-grid">
          {visibleCharities.length === 0 ? (
            <p className="empty-note">No charities matched your search.</p>
          ) : (
            visibleCharities.map((charity, index) => (
              <article
                key={charity.id}
                className="charity-card animate-rise"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <p className="charity-meta">
                  {charity.category || 'General'} | {charity.country || 'Global'}
                </p>
                <h3>{charity.name}</h3>
                <p>{charity.description}</p>
                <div className="charity-footer">
                  <span>${(charity.totalDonations || 0).toFixed(2)} raised</span>
                  {charity.featured ? <span className="pill-highlight">Featured</span> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {featuredCharity ? (
        <section className="charity-section animate-rise">
          <div className="section-header section-header-stack">
            <div>
              <h2>Spotlight Charity</h2>
              <p>Featured partner highlighted for this cycle.</p>
            </div>
            <span className="tag-pill">
              <Sparkles size={14} />
              Featured
            </span>
          </div>
          <article className="spotlight-card">
            <SafeImage
              src={featuredCharity.imageUrl}
              alt={featuredCharity.name}
              className="spotlight-image"
              fallbackClassName="spotlight-image-placeholder"
            />
            <div className="spotlight-content">
              <p className="charity-meta">
                {featuredCharity.category || 'General'} | {featuredCharity.country || 'Global'}
              </p>
              <h3>{featuredCharity.name}</h3>
              <p>{featuredCharity.description}</p>
              <div className="inline-actions">
                <span className="pill-highlight">${(featuredCharity.totalDonations || 0).toFixed(2)} raised</span>
                <Link to={`/charities/${featuredCharity.id}`} className="btn-outline">
                  View Full Profile
                </Link>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="charity-section animate-rise delay-3">
        <div className="section-header section-header-stack">
          <div>
            <h2>Why Members Stay</h2>
            <p>Built for golfers who care about both progress and purpose.</p>
          </div>
        </div>

        <div className="story-grid">
          {trustPoints.map((item) => (
            <article key={item.title} className="feature-card story-card">
              <div className="story-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="charity-section animate-rise">
        <div className="section-header section-header-stack">
          <div>
            <h2>Member Journey Snapshot</h2>
            <p>A quick view of what a typical month looks like in the platform.</p>
          </div>
          <span className="tag-pill">
            <Trophy size={14} />
            Active member flow
          </span>
        </div>

        <div className="journey-grid">
          {memberJourney.map((stage) => (
            <article className="journey-card" key={stage.title}>
              <h3>{stage.title}</h3>
              <p>{stage.details}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="charity-section animate-rise">
        <div className="section-header section-header-stack">
          <div>
            <h2>Quick FAQs</h2>
            <p>Common things new members ask before getting started.</p>
          </div>
        </div>
        <div className="faq-grid">
          {faqs.map((item) => (
            <article key={item.question} className="faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
