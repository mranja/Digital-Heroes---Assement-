import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, PlayCircle, ShieldCheck, Trash2, UserRoundCog, Wallet } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';

const getErrorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [charities, setCharities] = useState([]);
  const [draws, setDraws] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [winners, setWinners] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserScores, setSelectedUserScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newCharity, setNewCharity] = useState({
    name: '',
    description: '',
    category: 'General',
    country: 'United States',
    featured: false,
    imageUrl: ''
  });

  const [editingCharityId, setEditingCharityId] = useState(null);
  const [charityEditForm, setCharityEditForm] = useState({
    name: '',
    description: '',
    category: 'General',
    country: 'United States',
    featured: false,
    imageUrl: ''
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [userEditForm, setUserEditForm] = useState({
    charityId: '',
    donationPercentage: 10,
    winningsBalance: 0,
    totalWinnings: 0,
    subscriptionStatus: 'inactive',
    plan: 'monthly'
  });

  const loadData = async () => {
    const [summaryRes, usersRes, charitiesRes, drawsRes, proofsRes, winnersRes] = await Promise.all([
      api.get('/user/admin/summary'),
      api.get('/user'),
      api.get('/charities'),
      api.get('/draws'),
      api.get('/user/admin/proofs'),
      api.get('/draws/winners')
    ]);

    setSummary(summaryRes.data);
    setUsers(usersRes.data || []);
    setCharities(charitiesRes.data || []);
    setDraws(drawsRes.data || []);
    setProofs(proofsRes.data || []);
    setWinners(winnersRes.data || []);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await loadData();
      } catch (err) {
        if (alive) notify.error(getErrorMessage(err, 'Unable to load admin data.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserScores([]);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await api.get(`/scores/admin/${selectedUserId}`);
        if (alive) setSelectedUserScores(res.data.scores || []);
      } catch {
        if (alive) setSelectedUserScores([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedUserId]);

  const pendingProofs = useMemo(() => proofs.filter((proof) => proof.verificationStatus === 'Pending'), [proofs]);

  const refreshData = async () => {
    setLoading(true);
    try {
      await loadData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to refresh admin data.'));
    } finally {
      setLoading(false);
    }
  };

  const simulateDraw = async (mode) => {
    try {
      const res = await api.post('/draws/simulate', { mode });
      setSimulation(res.data);
      notify.success(`Simulation completed in ${mode} mode.`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to simulate draw.'));
    }
  };

  const publishDraw = async () => {
    try {
      await api.post('/draws/publish');
      setSimulation(null);
      notify.success('Monthly draw published successfully.');
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to publish draw.'));
    }
  };

  const createCharity = async (e) => {
    e.preventDefault();

    try {
      await api.post('/charities', newCharity);
      setNewCharity({
        name: '',
        description: '',
        category: 'General',
        country: 'United States',
        featured: false,
        imageUrl: ''
      });
      notify.success('Charity added.');
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to add charity.'));
    }
  };

  const startEditCharity = (charity) => {
    setEditingCharityId(charity.id);
    setCharityEditForm({
      name: charity.name || '',
      description: charity.description || '',
      category: charity.category || 'General',
      country: charity.country || 'United States',
      featured: Boolean(charity.featured),
      imageUrl: charity.imageUrl || ''
    });
  };

  const saveCharityEdit = async () => {
    if (!editingCharityId) return;

    try {
      await api.put(`/charities/${editingCharityId}`, charityEditForm);
      setEditingCharityId(null);
      notify.success('Charity content updated.');
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update charity.'));
    }
  };

  const deleteCharity = async (id) => {
    try {
      await api.delete(`/charities/${id}`);
      notify.success('Charity removed.');
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to remove charity.'));
    }
  };

  const updateUserSubscription = async (user) => {
    const nextStatus = user.subscription?.status === 'active' ? 'canceled' : 'active';
    try {
      await api.put(`/user/${user.id}`, {
        subscription: {
          ...user.subscription,
          status: nextStatus
        }
      });
      notify.success(`User subscription updated to ${nextStatus}.`);
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update subscription.'));
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setUserEditForm({
      charityId: user.charityId || '',
      donationPercentage: user.donationPercentage || 10,
      winningsBalance: user.winningsBalance || 0,
      totalWinnings: user.totalWinnings || 0,
      subscriptionStatus: user.subscription?.status || 'inactive',
      plan: user.subscription?.plan || 'monthly'
    });
  };

  const saveUserEdit = async () => {
    if (!editingUserId) return;

    try {
      await api.put(`/user/${editingUserId}`, {
        charityId: userEditForm.charityId === '' ? null : Number(userEditForm.charityId),
        donationPercentage: Number(userEditForm.donationPercentage),
        winningsBalance: Number(userEditForm.winningsBalance),
        totalWinnings: Number(userEditForm.totalWinnings),
        subscription: {
          status: userEditForm.subscriptionStatus,
          plan: userEditForm.plan
        }
      });
      setEditingUserId(null);
      notify.success('User profile updated.');
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update user profile.'));
    }
  };

  const reviewProof = async (proofId, action) => {
    try {
      await api.post(`/user/admin/proofs/${proofId}/review`, { action });
      notify.success(`Proof action completed: ${action}.`);
      await refreshData();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to review proof.'));
    }
  };

  const updateScore = async (entryId, score, date) => {
    try {
      await api.put(`/scores/admin/${selectedUserId}/${entryId}`, { score, date });
      notify.success('Score updated by admin.');
      const res = await api.get(`/scores/admin/${selectedUserId}`);
      setSelectedUserScores(res.data.scores || []);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Unable to update score.'));
    }
  };

  if (loading && !summary) {
    return <div className="container section-block">Loading admin dashboard...</div>;
  }

  return (
    <div className="container section-block">
      <div className="section-header stack-mobile">
        <div>
          <h1>Admin Command Center</h1>
          <p>Run draws, monitor payouts, verify winners, and manage platform content.</p>
        </div>
      </div>

      <section className="stats-grid">
        <article className="stat-box">
          <p>Users</p>
          <h3>{summary?.totalUsers || 0}</h3>
        </article>
        <article className="stat-box">
          <p>Active Subs</p>
          <h3>{summary?.activeSubscriptions || 0}</h3>
        </article>
        <article className="stat-box">
          <p>Prize Pool</p>
          <h3>${(summary?.totalPrizePool || 0).toFixed(2)}</h3>
        </article>
        <article className="stat-box">
          <p>Charity Raised</p>
          <h3>${(summary?.totalCharityContributions || 0).toFixed(2)}</h3>
        </article>
      </section>

      <section className="stats-grid mt-space">
        <article className="stat-box">
          <p>Total Winners</p>
          <h3>{summary?.drawStats?.totalWinners || 0}</h3>
        </article>
        <article className="stat-box">
          <p>5-Match Winners</p>
          <h3>{summary?.drawStats?.totalTier5Winners || 0}</h3>
        </article>
        <article className="stat-box">
          <p>4-Match Winners</p>
          <h3>{summary?.drawStats?.totalTier4Winners || 0}</h3>
        </article>
        <article className="stat-box">
          <p>3-Match Winners</p>
          <h3>{summary?.drawStats?.totalTier3Winners || 0}</h3>
        </article>
      </section>

      <section className="admin-grid mt-space">
        <article className="panel animate-rise">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Draw Engine</p>
              <h3>Simulation and Publish</h3>
            </div>
            <PlayCircle size={18} />
          </div>

          <div className="inline-actions">
            <button className="btn-primary" onClick={() => simulateDraw('random')}>Random Simulation</button>
            <button className="btn-outline" onClick={() => simulateDraw('algorithm')}>Algorithm Simulation</button>
          </div>

          {simulation ? (
            <div className="simulation-box">
              <p className="panel-muted">Drawn Numbers: {simulation.drawnNumbers.join(', ')}</p>
              <p className="panel-muted">Eligible subscribers: {simulation.eligibility?.withCompleteScores || 0}</p>
              <p className="panel-muted">5-match winners: {simulation.matches['5-number'].length}</p>
              <p className="panel-muted">4-match winners: {simulation.matches['4-number'].length}</p>
              <p className="panel-muted">3-match winners: {simulation.matches['3-number'].length}</p>
              <p className="panel-muted">Projected rollover: ${simulation.payoutPreview.rolloverToNext.toFixed(2)}</p>

              <button className="btn-primary" onClick={publishDraw}>
                <CheckCircle2 size={15} /> Publish Official Draw
              </button>
            </div>
          ) : null}
        </article>

        <article className="panel animate-rise delay-1">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Winner Review</p>
              <h3>Pending Proofs ({pendingProofs.length})</h3>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="mini-list">
            {pendingProofs.length === 0 ? (
              <p className="empty-note">No pending proof items.</p>
            ) : (
              pendingProofs.map((proof) => (
                <article key={proof.id} className="mini-item">
                  <div>
                    <p>{proof.userEmail}</p>
                    <small>Draw #{proof.drawId}</small>
                  </div>
                  <div className="inline-actions">
                    <button className="btn-outline" onClick={() => reviewProof(proof.id, 'approve')}>Approve</button>
                    <button className="btn-outline" onClick={() => reviewProof(proof.id, 'mark_paid')}>Mark Paid</button>
                    <button className="btn-outline" onClick={() => reviewProof(proof.id, 'reject')}>Reject</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="panel animate-rise delay-2">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Charities</p>
              <h3>Content and Media</h3>
            </div>
            <Wallet size={18} />
          </div>

          <form className="form-grid" onSubmit={createCharity}>
            <input
              className="input-field"
              placeholder="Charity name"
              value={newCharity.name}
              onChange={(e) => setNewCharity((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="input-field"
              placeholder="Description"
              value={newCharity.description}
              onChange={(e) => setNewCharity((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
            <input
              className="input-field"
              placeholder="Category"
              value={newCharity.category}
              onChange={(e) => setNewCharity((prev) => ({ ...prev, category: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Country"
              value={newCharity.country}
              onChange={(e) => setNewCharity((prev) => ({ ...prev, country: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Image URL"
              value={newCharity.imageUrl}
              onChange={(e) => setNewCharity((prev) => ({ ...prev, imageUrl: e.target.value }))}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={newCharity.featured}
                onChange={(e) => setNewCharity((prev) => ({ ...prev, featured: e.target.checked }))}
              />
              Featured charity
            </label>
            <button className="btn-primary" type="submit">Add Charity</button>
          </form>

          {editingCharityId ? (
            <div className="panel-edit-box">
              <h4>Edit Charity</h4>
              <div className="form-grid">
                <input className="input-field" value={charityEditForm.name} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
                <input className="input-field" value={charityEditForm.description} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" />
                <input className="input-field" value={charityEditForm.category} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" />
                <input className="input-field" value={charityEditForm.country} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Country" />
                <input className="input-field" value={charityEditForm.imageUrl} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL" />
                <label className="check-row">
                  <input type="checkbox" checked={charityEditForm.featured} onChange={(e) => setCharityEditForm((prev) => ({ ...prev, featured: e.target.checked }))} />
                  Featured
                </label>
                <div className="inline-actions">
                  <button className="btn-primary" type="button" onClick={saveCharityEdit}>Save</button>
                  <button className="btn-outline" type="button" onClick={() => setEditingCharityId(null)}>Cancel</button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mini-list">
            {charities.map((charity) => (
              <article key={charity.id} className="mini-item">
                <div>
                  <p>{charity.name}</p>
                  <small>${(charity.totalDonations || 0).toFixed(2)} raised</small>
                </div>
                <div className="inline-actions">
                  <button className="btn-outline" onClick={() => startEditCharity(charity)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn-outline" onClick={() => deleteCharity(charity.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel mt-space animate-rise delay-1">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Users</p>
            <h3>Profile + Subscription Controls</h3>
          </div>
          <UserRoundCog size={18} />
        </div>

        <label className="form-row">
          <span>Select user for score editing</span>
          <select className="input-field" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Select user</option>
            {users.filter((u) => u.role === 'user').map((user) => (
              <option key={user.id} value={user.id}>{user.email}</option>
            ))}
          </select>
        </label>

        {editingUserId ? (
          <div className="panel-edit-box">
            <h4>Edit User Profile</h4>
            <div className="form-grid">
              <select className="input-field" value={userEditForm.charityId} onChange={(e) => setUserEditForm((prev) => ({ ...prev, charityId: e.target.value }))}>
                <option value="">No Charity</option>
                {charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>{charity.name}</option>
                ))}
              </select>
              <input className="input-field" type="number" min="10" max="100" value={userEditForm.donationPercentage} onChange={(e) => setUserEditForm((prev) => ({ ...prev, donationPercentage: e.target.value }))} placeholder="Donation %" />
              <input className="input-field" type="number" min="0" value={userEditForm.winningsBalance} onChange={(e) => setUserEditForm((prev) => ({ ...prev, winningsBalance: e.target.value }))} placeholder="Winnings Balance" />
              <input className="input-field" type="number" min="0" value={userEditForm.totalWinnings} onChange={(e) => setUserEditForm((prev) => ({ ...prev, totalWinnings: e.target.value }))} placeholder="Total Winnings" />
              <select className="input-field" value={userEditForm.subscriptionStatus} onChange={(e) => setUserEditForm((prev) => ({ ...prev, subscriptionStatus: e.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="canceled">canceled</option>
                <option value="lapsed">lapsed</option>
              </select>
              <select className="input-field" value={userEditForm.plan} onChange={(e) => setUserEditForm((prev) => ({ ...prev, plan: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="inline-actions">
                <button className="btn-primary" type="button" onClick={saveUserEdit}>Save User</button>
                <button className="btn-outline" type="button" onClick={() => setEditingUserId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mini-list">
          {users.map((user) => (
            <article key={user.id} className="mini-item">
              <div>
                <p>{user.email}</p>
                <small>{user.role} | {user.subscription?.status || 'inactive'} | {(user.subscription?.plan || 'monthly')}</small>
              </div>
              <div className="inline-actions">
                <button className="btn-outline" onClick={() => startEditUser(user)}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn-outline" onClick={() => updateUserSubscription(user)}>Toggle Subscription</button>
              </div>
            </article>
          ))}
        </div>

        {selectedUserId ? (
          <div className="mini-list selected-scores-box">
            {selectedUserScores.length === 0 ? (
              <p className="empty-note">No scores for selected user.</p>
            ) : (
              selectedUserScores.map((entry) => (
                <article key={entry.id} className="mini-item">
                  <div>
                    <p>Score: {entry.score}</p>
                    <small>{new Date(entry.date).toLocaleDateString()}</small>
                  </div>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      const nextScore = window.prompt('New score (1-45):', String(entry.score));
                      const nextDate = window.prompt('New date (YYYY-MM-DD):', entry.date);
                      if (!nextScore || !nextDate) return;
                      updateScore(entry.id, Number(nextScore), nextDate);
                    }}
                  >
                    Edit Score
                  </button>
                </article>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="panel mt-space animate-rise delay-2">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Winners</p>
            <h3>All Winner Records</h3>
          </div>
        </div>

        <div className="mini-list">
          {winners.length === 0 ? (
            <p className="empty-note">No winner records yet.</p>
          ) : (
            winners.map((winner) => (
              <article className="mini-item" key={`${winner.drawId}-${winner.userId}-${winner.matchType}`}>
                <div>
                  <p>{winner.email} | {winner.matchType}</p>
                  <small>
                    Draw {winner.drawId} | {new Date(winner.drawDate).toLocaleDateString()} | ${winner.amount.toFixed(2)}
                  </small>
                </div>
                <span className="pill-highlight">{winner.paymentStatus || 'Pending'}</span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel mt-space animate-rise delay-2">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">History</p>
            <h3>Published Draws</h3>
          </div>
        </div>

        <div className="mini-list">
          {draws.length === 0 ? (
            <p className="empty-note">No draws published yet.</p>
          ) : (
            draws.map((draw) => (
              <article className="mini-item" key={draw.id}>
                <div>
                  <p>Draw {draw.id}</p>
                  <small>{new Date(draw.publishedAt).toLocaleDateString()} | {draw.mode}</small>
                </div>
                <span className="pill-highlight">Rollover ${draw.payout?.rolloverToNext?.toFixed(2) || '0.00'}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
