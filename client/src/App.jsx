import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Trophy, ShieldCheck, HeartHandshake, LogOut, Sparkles } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CharityDirectory from './pages/CharityDirectory';
import CharityProfile from './pages/CharityProfile';
import ProtectedRoute from './components/ProtectedRoute';
import notify from './lib/notify';

function Navigation() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    notify.info('Logged out successfully.');
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <div className="container app-nav-inner">
        <Link to="/" className="app-brand">
          <div className="brand-icon">
            <Trophy size={18} />
          </div>
          <div>
            <p className="brand-title">Digital Heroes</p>
            <p className="brand-subtitle">Play. Win. Give.</p>
          </div>
        </Link>

        <div className="app-nav-links">
          {!token ? (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/charities" className="nav-link">Charities</Link>
              <Link to="/login" className="btn-outline">
                <Sparkles size={16} /> Sign In
              </Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          ) : (
            <>
              {userRole === 'admin' && (
                <Link to="/admin" className="nav-link nav-link-highlight">
                  <ShieldCheck size={16} /> Admin
                </Link>
              )}
              <Link to="/charities" className="nav-link">Charities</Link>
              {userRole === 'user' && (
                <Link to="/dashboard" className="nav-link nav-link-highlight">
                  <HeartHandshake size={16} /> Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="btn-outline">
                <LogOut size={16} /> Logout
              </button>
            </>
          )}
        </div>
      </div>
      <div className="nav-glow" />
      <div className="container nav-mobile-links">
        {!token ? (
          <>
            <Link to="/charities" className="nav-link">Charities</Link>
            <Link to="/login" className="nav-link">Login</Link>
          </>
        ) : (
          <>
            <Link to="/charities" className="nav-link">Charities</Link>
            {userRole === 'admin' && (
              <Link to="/admin" className="nav-link nav-inline">
                <ShieldCheck size={16} /> Admin
              </Link>
            )}
            {userRole === 'user' && (
              <Link to="/dashboard" className="nav-link nav-inline">
                <HeartHandshake size={16} /> Dashboard
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navigation />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/charities" element={<CharityDirectory />} />
          <Route path="/charities/:id" element={<CharityProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="user">
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
