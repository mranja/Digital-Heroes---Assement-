import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';
import SafeImage from '../components/SafeImage';

const CharityDirectory = () => {
  const [allCharities, setAllCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get('/charities');
        if (alive) setAllCharities(res.data || []);
      } catch {
        if (alive) {
          const msg = 'Unable to load charities.';
          setError(msg);
          notify.error(msg);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const values = new Set(allCharities.map((item) => item.category || 'General'));
    return ['all', ...Array.from(values)];
  }, [allCharities]);

  const visibleCharities = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return allCharities.filter((charity) => {
      const matchesQuery = !lowered
        || charity.name.toLowerCase().includes(lowered)
        || charity.description.toLowerCase().includes(lowered);
      const matchesCategory = selectedCategory === 'all' || (charity.category || 'General') === selectedCategory;
      const matchesFeatured = !featuredOnly || charity.featured;
      return matchesQuery && matchesCategory && matchesFeatured;
    });
  }, [allCharities, featuredOnly, query, selectedCategory]);

  if (loading) {
    return <div className="container section-block">Loading charity directory...</div>;
  }

  return (
    <div className="container section-block">
      <section className="charity-directory-head">
        <div>
          <h1>Charity Directory</h1>
          <p>Discover causes, check their impact, and pick the one you want your membership to support.</p>
        </div>
        <Link to="/register" className="btn-primary">
          Join and Support <ArrowRight size={16} />
        </Link>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="charity-directory-filters">
        <label className="search-inline">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description"
          />
        </label>

        <select
          className="input-field"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>

        <label className="check-row">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => setFeaturedOnly(e.target.checked)}
          />
          Featured only
        </label>
      </section>

      <section className="charity-directory-grid">
        {visibleCharities.length === 0 ? (
          <p className="empty-note">No charities matched your filters.</p>
        ) : (
          visibleCharities.map((charity) => (
            <article key={charity.id} className="charity-directory-card">
              <SafeImage
                src={charity.imageUrl}
                alt={charity.name}
                className="charity-directory-image"
                fallbackClassName="charity-directory-image-placeholder"
              />

              <div className="charity-directory-body">
                <p className="charity-meta">
                  {charity.category || 'General'} | {charity.country || 'Global'}
                </p>
                <h3>{charity.name}</h3>
                <p>{charity.description}</p>

                <div className="charity-directory-footer">
                  <span>${(charity.totalDonations || 0).toFixed(2)} raised</span>
                  <div className="inline-actions">
                    {charity.featured ? <span className="pill-highlight">Featured</span> : null}
                    <Link to={`/charities/${charity.id}`} className="btn-outline">
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default CharityDirectory;
