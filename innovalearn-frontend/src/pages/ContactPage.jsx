import { useState } from 'react';
import { apiRequest } from '../api';

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function ContactPage() {
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
      setError('Email is required.');
      return;
    }
    if (!noteDescription.trim()) {
      setError('Note description is required.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Please choose a rating between 1 and 5 stars.');
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
      setSuccess('Thanks for your feedback. We received your note successfully.');
      setNoteDescription('');
      setRating(0);
    } catch (err) {
      setError(err.message || 'Unable to submit your note right now.');
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
              <span>Send us your note</span>
            </h1>
            <p>Share your feedback with our team. We read every message.</p>
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
                <span>Email</span>
              </span>
              <input
                type="email"
                placeholder="you@example.com"
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
                <span>Note description</span>
              </span>
              <textarea
                placeholder="Write your note..."
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
                <span>Rate us</span>
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
                {submitting ? 'Sending...' : 'Send note'}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}
