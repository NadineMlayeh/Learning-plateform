import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: form,
      });
      setMessage('Account created. You can now login.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <article className="card auth-card">
        <div className="auth-head">
          <h1>Create Account</h1>
          <p className="hint">Join InnovaLearn and start your journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid auth-form">
          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0116 0" />
              </svg>
            </span>
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={updateField}
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </span>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={updateField}
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
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          <label className="auth-field auth-select-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 4-8 4-8-4 8-4z" />
                <path d="M4 12l8 4 8-4" />
                <path d="M4 16l8 4 8-4" />
              </svg>
            </span>
            <select name="role" value={form.role} onChange={updateField}>
              <option value="STUDENT">Student</option>
              <option value="FORMATEUR">Formateur</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <button type="submit" className="auth-submit-btn">
            Create account
          </button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}

        <div className="auth-foot">
          <p className="hint">Formateur accounts must be approved by admin before login works.</p>
          <p className="hint">
            Already have an account?{' '}
            <Link to="/login" className="auth-inline-link">
              Login
            </Link>
          </p>
        </div>
      </article>
    </section>
  );
}
