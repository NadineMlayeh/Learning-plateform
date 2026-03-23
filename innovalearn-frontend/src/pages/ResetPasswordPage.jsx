import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get('token') || '').trim();
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      setTokenChecked(false);
      setTokenValid(false);
      setTokenError('');

      if (!token) {
        if (!cancelled) {
          setTokenChecked(true);
          setTokenError('This reset link is invalid or expired.');
        }
        return;
      }

      try {
        const result = await apiRequest('/auth/reset-password/validate', {
          method: 'POST',
          body: { token },
        });

        if (cancelled) return;

        if (result?.valid) {
          setTokenValid(true);
        } else {
          setTokenError(
            result?.message || 'This reset link is invalid or expired.',
          );
        }
      } catch (err) {
        if (cancelled) return;
        setTokenError(err.message || 'This reset link is invalid or expired.');
      } finally {
        if (!cancelled) setTokenChecked(true);
      }
    }

    validateToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          newPassword,
          confirmNewPassword,
        },
      });
      setSuccess(
        result?.message || 'Password reset successful. Redirecting to login...',
      );
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!tokenChecked) {
    return (
      <section className="auth-page">
        <article className="card auth-card">
          <div className="auth-head">
            <h1>Checking Reset Link</h1>
            <p className="hint">Please wait while we validate your link.</p>
          </div>
        </article>
      </section>
    );
  }

  if (!tokenValid) {
    return (
      <section className="auth-page">
        <article className="card auth-card">
          <div className="auth-head">
            <h1>Reset Link Expired</h1>
            <p className="hint">
              This password reset link is no longer valid.
            </p>
          </div>

          <article className="auth-error-box" role="alert" aria-live="assertive">
            <p className="auth-error-title">[!] Link Expired</p>
            <p className="auth-error-body">
              {tokenError || 'Please request a new password reset link.'}
            </p>
          </article>

          <div className="auth-foot">
            <p className="hint">
              Request a new link from{' '}
              <Link to="/forgot-password" className="auth-inline-link">
                Forgot Password
              </Link>
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <article className="card auth-card">
        <div className="auth-head">
          <h1>Reset Password</h1>
          <p className="hint">
            Enter your new password and confirm it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid auth-form">
          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
            </span>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        {error && (
          <article className="auth-error-box" role="alert" aria-live="assertive">
            <p className="auth-error-title">[!] Reset Failed</p>
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

