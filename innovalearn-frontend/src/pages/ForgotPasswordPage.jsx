import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const result = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSuccess(
        result?.message ||
          'If this email exists, a password reset link has been sent.',
      );
    } catch (err) {
      setError(err.message || 'Unable to process request right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <article className="card auth-card">
        <div className="auth-head">
          <h1>Forgot Password</h1>
          <p className="hint">
            Enter your email and we will send you a reset link.
          </p>
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
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {error && (
          <article className="auth-error-box" role="alert" aria-live="assertive">
            <p className="auth-error-title">[!] Request Failed</p>
            <p className="auth-error-body">{error}</p>
          </article>
        )}

        {success && <p className="auth-success-box">{success}</p>}

        <div className="auth-foot">
          <p className="hint">
            Back to{' '}
            <Link to="/login" className="auth-inline-link">
              Login
            </Link>
          </p>
        </div>
      </article>
    </section>
  );
}

