import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CreditCard, HandCoins, HeartHandshake, Pencil, Plus, Save, Send, Trophy } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';

const getErrorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [charities, setCharities] = useState([]);
  const [upcomingDraw, setUpcomingDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreForm, setScoreForm] = useState({ score: '', date: new Date().toISOString().split('T')[0] });
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [proofForm, setProofForm] = useState({ drawId: '', imageUrl: '', note: '' });

  const loadData = async () => {
    const [profileRes, charityRes, upcomingRes] = await Promise.all([
      api.get('/user/me'),
      api.get('/charities'),
      api.get('/draws/upcoming')
    ]);

    setProfile(profileRes.data);
    setCharities(charityRes.data || []);
    setUpcomingDraw(upcomingRes.data || null);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await loadData();
      } catch (err) {
        if (alive) notify.error(getErrorMessage(err, 'Unable to load dashboard data.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      await loadData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to refresh dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  const subscriptionStatus = profile?.subscription?.status || 'inactive';
  const isSubscribed = subscriptionStatus === 'active';
  const hasCompleteScoreCard = Boolean(profile?.participationSummary?.hasCompleteScoreCard);
  const currentPlan = profile?.subscription?.plan || 'monthly';

  const planLabel = useMemo(() => {
    if (!profile?.subscription?.plan) return 'No Plan';
    return profile.subscription.plan === 'yearly' ? 'Yearly' : 'Monthly';
  }, [profile]);

  const submitScore = async (e) => {
    e.preventDefault();

    try {
      const payload = { score: Number(scoreForm.score), date: scoreForm.date };
      if (editingScoreId) {
        await api.put(`/scores/${editingScoreId}`, payload);
        notify.success('Score updated.');
      } else {
        await api.post('/scores', payload);
        notify.success('Score added.');
      }

      setScoreForm({ score: '', date: new Date().toISOString().split('T')[0] });
      setEditingScoreId(null);
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to save score.'));
    }
  };

  const startEditScore = (entry) => {
    setEditingScoreId(entry.id);
    setScoreForm({ score: String(entry.score), date: entry.date });
  };

  const activateSubscription = async (plan) => {
    try {
      await api.post('/payment/create-checkout-session', { plan });
      notify.success(`Subscription activated (${plan}).`);
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to activate subscription.'));
    }
  };

  const renewSubscription = async () => {
    try {
      await api.post('/payment/renew-subscription');
      notify.success('Subscription renewed.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to renew subscription.'));
    }
  };

  const cancelSubscription = async () => {
    try {
      await api.post('/payment/cancel-subscription');
      notify.success('Subscription canceled.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to cancel subscription.'));
    }
  };

  const updateDonation = async (value) => {
    try {
      await api.put('/user/me', { donationPercentage: Number(value) });
      notify.success('Donation percentage updated.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update donation percentage.'));
    }
  };

  const updateCharity = async (charityId) => {
    try {
      await api.put('/user/me', { charityId: Number(charityId) });
      notify.success('Charity updated.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update charity.'));
    }
  };

  const submitSeparateDonation = async () => {
    try {
      await api.post('/payment/separate-donation', {
        amount: Number(donationAmount),
        charityId: profile?.charityDetails?.id
      });
      setDonationAmount('');
      notify.success('Separate donation submitted.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to submit donation.'));
    }
  };

  const submitProof = async (e) => {
    e.preventDefault();

    try {
      await api.post('/user/me/proof', {
        drawId: Number(proofForm.drawId),
        imageUrl: proofForm.imageUrl,
        note: proofForm.note
      });
      setProofForm({ drawId: '', imageUrl: '', note: '' });
      notify.success('Proof uploaded and pending review.');
      await refresh();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to upload proof.'));
    }
  };

  if (loading) {
    return <div className="container section-block">Loading dashboard...</div>;
  }

  if (!profile) {
    return <div className="container section-block">Unable to render dashboard.</div>;
  }

  return (
    <div className="container section-block">
      <div className="section-header stack-mobile">
        <div>
          <h1>Member Dashboard</h1>
          <p>Manage scores, draws, subscription status, and your social impact in one place.</p>
        </div>
      </div>

      <div className="stats-grid dashboard-stats-spacing">
        <article className="stat-box">
          <p>Draws Entered</p>
          <h3>{profile.participationSummary?.drawsEntered || 0}</h3>
        </article>
        <article className="stat-box">
          <p>Completed Draws</p>
          <h3>{profile.participationSummary?.completedDraws || 0}</h3>
        </article>
        <article className="stat-box">
          <p>Upcoming Draw</p>
          <h3>{upcomingDraw?.nextDrawDate ? new Date(upcomingDraw.nextDrawDate).toLocaleDateString() : '-'}</h3>
        </article>
        <article className="stat-box">
          <p>Payment Status</p>
          <h3>{profile.winningsPaymentStatus || 'No Claims'}</h3>
        </article>
      </div>

      <div className="dashboard-shell">
        <article className="panel animate-rise">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Subscription</p>
              <h3>Membership Status</h3>
            </div>
            <span className={`status-pill ${isSubscribed ? 'status-active' : 'status-inactive'}`}>
              {subscriptionStatus}
            </span>
          </div>

          <p className="panel-muted">Current plan: <strong>{planLabel}</strong></p>
          <p className="panel-muted">Renewal: {profile.subscription?.renewsAt ? new Date(profile.subscription.renewsAt).toLocaleDateString() : 'Not scheduled'}</p>

          <div className="inline-actions">
            <button
              className={isSubscribed && currentPlan === 'monthly' ? 'btn-primary' : 'btn-outline'}
              onClick={() => activateSubscription('monthly')}
            >
              <CreditCard size={15} /> Monthly
            </button>
            <button
              className={isSubscribed && currentPlan === 'yearly' ? 'btn-primary' : 'btn-outline'}
              onClick={() => activateSubscription('yearly')}
            >
              <Calendar size={15} /> Yearly
            </button>
            {subscriptionStatus === 'lapsed' || subscriptionStatus === 'canceled' ? (
              <button className="btn-outline" onClick={renewSubscription}>Renew</button>
            ) : null}
            {isSubscribed ? (
              <button className="btn-outline" onClick={cancelSubscription}>Cancel</button>
            ) : null}
          </div>
        </article>

        <article className="panel animate-rise delay-1">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Charity</p>
              <h3>Impact Preferences</h3>
            </div>
            <HeartHandshake size={18} />
          </div>

          <label className="form-row">
            <span>Select Charity</span>
            <select
              value={profile.charityDetails?.id || ''}
              onChange={(e) => updateCharity(e.target.value)}
              className="input-field"
            >
              <option value="" disabled>Choose charity</option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
          </label>

          <div className="inline-actions">
            {[10, 15, 25, 35].map((pct) => (
              <button
                key={pct}
                className={pct === profile.donationPercentage ? 'btn-primary' : 'btn-outline'}
                onClick={() => updateDonation(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="inline-actions">
            <input
              className="input-field"
              placeholder="Separate donation ($)"
              type="number"
              min="1"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
            />
            <button className="btn-primary" onClick={submitSeparateDonation}>
              <HandCoins size={15} /> Donate
            </button>
          </div>
        </article>

        <article className="panel animate-rise delay-2">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Winnings</p>
              <h3>Prize Wallet</h3>
            </div>
            <Trophy size={18} />
          </div>
          <p className="wallet-number">${(profile.winningsBalance || 0).toFixed(2)}</p>
          <p className="panel-muted">Lifetime winnings: ${(profile.totalWinnings || 0).toFixed(2)}</p>
        </article>
      </div>

      <section className="panel mt-space animate-rise delay-1">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Stableford</p>
            <h3>Latest 5 Scores</h3>
          </div>
        </div>

        {!hasCompleteScoreCard ? (
          <p className="empty-note dashboard-score-note">
            Enter all 5 latest scores to become fully eligible for monthly draw matching.
          </p>
        ) : null}

        <form className="score-form" onSubmit={submitScore}>
          <input
            className="input-field"
            type="number"
            min="1"
            max="45"
            value={scoreForm.score}
            onChange={(e) => setScoreForm((prev) => ({ ...prev, score: e.target.value }))}
            placeholder="Score (1-45)"
            required
            disabled={!isSubscribed}
          />
          <input
            className="input-field"
            type="date"
            value={scoreForm.date}
            onChange={(e) => setScoreForm((prev) => ({ ...prev, date: e.target.value }))}
            required
            disabled={!isSubscribed}
          />
          <button className="btn-primary" type="submit" disabled={!isSubscribed}>
            {editingScoreId ? <Save size={15} /> : <Plus size={15} />}
            {editingScoreId ? 'Update Score' : 'Add Score'}
          </button>
        </form>

        <div className="score-list">
          {(profile.scores || []).length === 0 ? (
            <p className="empty-note">No scores yet.</p>
          ) : (
            profile.scores.map((entry) => (
              <article key={entry.id} className="score-item">
                <div>
                  <p className="score-value">{entry.score}</p>
                  <p className="score-date">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
                <button className="btn-outline" onClick={() => startEditScore(entry)}>
                  <Pencil size={14} /> Edit
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel mt-space animate-rise delay-2">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Verification</p>
            <h3>Winner Proof Upload</h3>
          </div>
        </div>

        <form className="proof-form" onSubmit={submitProof}>
          <select
            className="input-field"
            value={proofForm.drawId}
            onChange={(e) => setProofForm((prev) => ({ ...prev, drawId: e.target.value }))}
            required
          >
            <option value="">Select winning draw</option>
            {(profile.eligibleProofDraws || []).map((draw) => (
              <option key={draw.id} value={draw.id}>
                Draw {draw.id} - {new Date(draw.publishedAt).toLocaleDateString()}
              </option>
            ))}
          </select>

          <input
            className="input-field"
            value={proofForm.imageUrl}
            onChange={(e) => setProofForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="Proof screenshot URL"
            required
          />

          <textarea
            className="input-field"
            value={proofForm.note}
            onChange={(e) => setProofForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Optional admin note"
          />

          <button type="submit" className="btn-primary" disabled={!profile.eligibleProofDraws?.length}>
            <Send size={15} /> Submit Proof
          </button>
        </form>

        {!profile.eligibleProofDraws?.length ? (
          <p className="empty-note">You can upload proof only for draws where you are a winner.</p>
        ) : null}
      </section>
    </div>
  );
};

export default Dashboard;
