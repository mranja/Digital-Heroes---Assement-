import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';

const Register = () => {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    charityId: '',
    donationPercentage: 10,
    plan: 'monthly',
    autoSubscribe: true
  });

  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get('/charities');
        if (alive) {
          setCharities(res.data || []);
          if (res.data?.length) {
            setForm((prev) => ({ ...prev, charityId: String(res.data[0].id) }));
          }
        }
      } catch {
        if (alive) setCharities([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const registerRes = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        charityId: Number(form.charityId),
        donationPercentage: Number(form.donationPercentage),
        plan: form.plan
      });

      localStorage.setItem('token', registerRes.data.token);
      localStorage.setItem('role', registerRes.data.user.role);
      localStorage.setItem('userId', String(registerRes.data.user.id));

      if (form.autoSubscribe) {
        await api.post('/payment/create-checkout-session', { plan: form.plan }, {
          headers: { Authorization: `Bearer ${registerRes.data.token}` }
        });
      }

      notify.success('Account created successfully.');
      navigate('/dashboard');
    } catch (err) {
      notify.error(err.response?.data?.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-layout">
      <section className="auth-card animate-rise">
        <div className="auth-head">
          <h1>Create Account</h1>
          <p>Set up your profile, charity preference, and subscription plan.</p>
        </div>

        <form onSubmit={submit} className="form-grid">
          <label>
            <span>Email</span>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              className="input-field"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </label>

          <label>
            <span>Select Charity</span>
            <select
              className="input-field"
              value={form.charityId}
              onChange={(e) => setForm((prev) => ({ ...prev, charityId: e.target.value }))}
              required
            >
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Donation Percentage</span>
            <input
              className="input-field"
              type="number"
              min="10"
              max="100"
              value={form.donationPercentage}
              onChange={(e) => setForm((prev) => ({ ...prev, donationPercentage: e.target.value }))}
              required
            />
          </label>

          <label>
            <span>Plan</span>
            <select
              className="input-field"
              value={form.plan}
              onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={form.autoSubscribe}
              onChange={(e) => setForm((prev) => ({ ...prev, autoSubscribe: e.target.checked }))}
            />
            Activate subscription immediately
          </label>

          <button className="btn-primary btn-submit" type="submit" disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="panel-muted auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
};

export default Register;
