import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminAddQuizPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const formationId = searchParams.get('formationId');

  const [quizTitle, setQuizTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateChoice(index, key, value) {
    setChoices((prev) =>
      prev.map((choice, i) =>
        i === index ? { ...choice, [key]: value } : choice,
      ),
    );
  }

  function setCorrectChoice(index) {
    setChoices((prev) =>
      prev.map((choice, i) => ({ ...choice, isCorrect: i === index })),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedQuestion = questionText.trim();
    const filledChoices = choices
      .map((choice) => ({
        text: choice.text.trim(),
        isCorrect: choice.isCorrect,
      }))
      .filter((choice) => choice.text);

    const correctCount = filledChoices.filter(
      (choice) => choice.isCorrect,
    ).length;

    if (!normalizedQuestion) {
      pushToast('Question is required.', 'error');
      return;
    }

    if (filledChoices.length < 2) {
      pushToast('At least 2 choices are required.', 'error');
      return;
    }

    if (correctCount !== 1) {
      pushToast(
        'You should select exactly one correct choice.',
        'error',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const quiz = await apiRequest(`/courses/${courseId}/quizzes`, {
        method: 'POST',
        token: user.token,
        body: { title: quizTitle },
      });

      await apiRequest(`/quizzes/${quiz.id}/questions`, {
        method: 'POST',
        token: user.token,
        body: {
          text: normalizedQuestion,
          choices: filledChoices,
        },
      });

      pushToast('Quiz created.', 'success');
      navigate(formationId ? `/formateur/formations/${formationId}` : '/formateur');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="floating-back-link"
        onClick={() =>
          navigate(
            formationId
              ? `/formateur/formations/${formationId}`
              : '/formateur',
          )
        }
      >
        <span aria-hidden="true">&lt;</span>
        <span>Back to Formation</span>
      </button>

      <section className="card">
        <h1>Add Quiz</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Quiz title" required />
          <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Question" required />

          <div className="nested-grid">
            {choices.map((choice, index) => (
              <div className="item small-item" key={index}>
                <input
                  value={choice.text}
                  onChange={(event) => updateChoice(index, 'text', event.target.value)}
                  placeholder={`Choice ${index + 1}`}
                  required={index < 2}
                />
                <label className="hint">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={choice.isCorrect}
                    onChange={() => setCorrectChoice(index)}
                  />
                  Correct
                </label>
              </div>
            ))}
          </div>

          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Quiz'}</button>
        </form>
      </section>
    </>
  );
}
