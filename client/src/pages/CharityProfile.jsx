import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, HeartHandshake } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';
import SafeImage from '../components/SafeImage';

const CharityProfile = () => {
  const { id } = useParams();
  const [charity, setCharity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get(`/charities/${id}`);
        if (alive) setCharity(res.data);
      } catch {
        if (alive) {
          const msg = 'Unable to load charity profile.';
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
  }, [id]);

  if (loading) {
    return <div className="container section-block">Loading charity profile...</div>;
  }

  if (!charity) {
    return (
      <div className="container section-block">
        <div className="error-banner">{error || 'Charity not found.'}</div>
        <Link to="/charities" className="btn-outline">
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="container section-block">
      <section className="charity-profile-head">
        <Link to="/charities" className="btn-outline">
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </section>

      <section className="charity-profile-panel">
        <div className="charity-profile-media">
          <SafeImage
            src={charity.imageUrl}
            alt={charity.name}
            className="charity-profile-image"
            fallbackClassName="charity-directory-image-placeholder"
          />
        </div>

        <div className="charity-profile-content">
          <p className="charity-meta">
            {charity.category || 'General'} | {charity.country || 'Global'}
          </p>
          <h1>{charity.name}</h1>
          <p>{charity.description}</p>

          <div className="charity-profile-stats">
            <article className="stat-box">
              <p>Total Raised</p>
              <h3>${(charity.totalDonations || 0).toFixed(2)}</h3>
            </article>
            <article className="stat-box">
              <p>Supporters</p>
              <h3>{charity.impactStats?.supporters || 0}</h3>
            </article>
            <article className="stat-box">
              <p>Campaigns</p>
              <h3>{charity.impactStats?.campaigns || 0}</h3>
            </article>
          </div>

          <div className="inline-actions">
            <Link to="/register" className="btn-primary">
              <HeartHandshake size={16} /> Support This Charity
            </Link>
          </div>
        </div>
      </section>

      <section className="panel mt-space">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Upcoming Events</p>
            <h3>Community Calendar</h3>
          </div>
          <CalendarDays size={18} />
        </div>

        <div className="mini-list">
          {(charity.events || []).length === 0 ? (
            <p className="empty-note">No upcoming events added for this charity.</p>
          ) : (
            charity.events.map((event) => (
              <article className="mini-item" key={event.id}>
                <div>
                  <p>{event.title}</p>
                  <small>{new Date(event.date).toLocaleDateString()}</small>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default CharityProfile;
