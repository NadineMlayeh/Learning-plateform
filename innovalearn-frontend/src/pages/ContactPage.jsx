import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api';

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function ContactPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError(t('contact.emailRequired'));
      return;
    }
    if (!noteDescription.trim()) {
      setError(t('contact.noteRequired'));
      return;
    }
    if (rating < 1 || rating > 5) {
      setError(t('contact.ratingRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/contact', {
        method: 'POST',
        body: {
          email: email.trim(),
          noteDescription: noteDescription.trim(),
          rating,
        },
      });
      setSuccess(t('contact.successMessage'));
      setNoteDescription('');
      setRating(0);
    } catch (err) {
      setError(t('contact.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="contact-page">
      <div className="contact-form-wrap">
        <article className="contact-form-card">
          <div className="contact-form-head">
            <h1 className="contact-heading">
              <img
                src="/images/note.png"
                alt=""
                aria-hidden="true"
                className="contact-heading-icon"
              />
              <span>{t('contact.title')}</span>
            </h1>
            <p>{t('contact.subtitle')}</p>
          </div>

          <form className="contact-form-grid" onSubmit={onSubmit}>
            <label className="contact-field">
              <span className="contact-field-label">
                <img
                  src="/images/communication.png"
                  alt=""
                  aria-hidden="true"
                  className="contact-field-label-icon"
                />
                <span>{t('contact.email')}</span>
              </span>
              <input
                type="email"
                placeholder={t('contact.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="contact-field">
              <span className="contact-field-label">
                <img
                  src="/images/pencil.png"
                  alt=""
                  aria-hidden="true"
                  className="contact-field-label-icon"
                />
                <span>{t('contact.noteDescription')}</span>
              </span>
              <textarea
                placeholder={t('contact.notePlaceholder')}
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
                rows={5}
              />
            </label>

            <div className="contact-field">
              <span className="contact-field-label">
                <img
                  src="/images/rating.png"
                  alt=""
                  aria-hidden="true"
                  className="contact-field-label-icon"
                />
                <span>{t('contact.rateUs')}</span>
              </span>
              <div className="contact-rating" role="radiogroup" aria-label="Rate us">
                {STAR_VALUES.map((value) => {
                  const active = value <= rating;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`contact-star${active ? ' is-active' : ''}`}
                      onClick={() => setRating(value)}
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    >
                      {active ? '\u2605' : '\u2606'}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="contact-form-error">{error}</p>}
            {success && <p className="contact-form-success">{success}</p>}

            <div className="contact-form-actions">
              <button type="submit" className="contact-submit-btn" disabled={submitting}>
                {submitting ? t('contact.submittingButton') : t('contact.submitButton')}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}
