import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser, setToken } from '../auth';

function roleHomePath(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'FORMATEUR') return '/formateur';
  if (role === 'STUDENT') return '/student';
  return '/';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(data.access_token);
      const currentUser = getCurrentUser();
      const roleHome = roleHomePath(currentUser?.role);
      const redirectTo = location.state?.from?.pathname || roleHome;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <article className="card auth-card">
        <div className="auth-head">
          <h1>Welcome Back</h1>
          <p className="hint">Log in to access your learning dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid auth-form">
          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </span>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
            </span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn">
            Login
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="auth-foot">
          <p className="hint">
            If you are a formateur and not approved yet, backend login is expected to fail.
          </p>
          <p className="hint">
            New here?{' '}
            <Link to="/signup" className="auth-inline-link">
              Create account
            </Link>
          </p>
        </div>
      </article>
    </section>
  );
}
