import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, UserRound } from 'lucide-react';
import api from '../lib/api';
import notify from '../lib/notify';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loginAs = (type) => {
    if (type === 'admin') {
      setEmail('ranjan.m1325@gmail.com');
      setPassword('Admin@digitalheroes');
      return;
    }
    setEmail('test@user.com');
    setPassword('password');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      localStorage.setItem('userId', String(res.data.user.id));
      notify.success('Login successful.');

      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-layout">
      <section className="auth-card animate-rise">
        <div className="auth-head">
          <h1>Welcome Back</h1>
          <p>Sign in to your Digital Heroes command center.</p>
        </div>

        <div className="auth-presets">
          <button type="button" className="btn-outline" onClick={() => loginAs('admin')}>
            <ShieldCheck size={14} /> Use Admin Demo
          </button>
          <button type="button" className="btn-outline" onClick={() => loginAs('user')}>
            <UserRound size={14} /> Use User Demo
          </button>
        </div>

        <form onSubmit={handleLogin} className="form-grid">
          <label>
            <span>Email</span>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          <button type="submit" className="btn-primary btn-submit" disabled={loading}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="panel-muted auth-footer-text">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
};

export default Login;
