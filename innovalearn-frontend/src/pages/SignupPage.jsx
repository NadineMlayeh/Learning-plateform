import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
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
      setMessage(t('signup.successMessage'));
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <article className="card auth-card">
        <div className="auth-head">
          <h1>{t('signup.title')}</h1>
          <p className="hint">{t('signup.subtitle')}</p>
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
              placeholder={t('signup.namePlaceholder')}
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
              placeholder={t('signup.emailPlaceholder')}
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                <path d="M10 18h4" />
              </svg>
            </span>
            <input
              name="phoneNumber"
              type="tel"
              placeholder={t('signup.phonePlaceholder')}
              value={form.phoneNumber}
              onChange={updateField}
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="6" width="16" height="14" rx="2" />
                <path d="M8 4v4M16 4v4M4 10h16" />
              </svg>
            </span>
            <input
              name="dateOfBirth"
              type="date"
              placeholder={t('signup.dobPlaceholder')}
              value={form.dateOfBirth}
              onChange={updateField}
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 4-8 4-8-4 8-4z" />
                <path d="M4 12l8 4 8-4" />
                <path d="M4 16l8 4 8-4" />
              </svg>
            </span>
            <select name="role" value={form.role} onChange={updateField}>
              <option value="STUDENT">{t('signup.roleStudent')}</option>
              <option value="FORMATEUR">{t('signup.roleFormateur')}</option>
              <option value="ADMIN">{t('signup.roleAdmin')}</option>
            </select>
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
              placeholder={t('signup.passwordPlaceholder')}
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn">
            {t('signup.submitButton')}
          </button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}

        <div className="auth-foot">
          <p className="hint">{t('signup.formateurNotice')}</p>
          <p className="hint">
            {t('signup.hasAccount')}{' '}
            <Link to="/login" className="auth-inline-link">
              {t('signup.loginLink')}
            </Link>
          </p>
        </div>
      </article>
    </section>
  );
}
