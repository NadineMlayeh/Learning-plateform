import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

export default function StudentFormationDetailsPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { formationId } = useParams();

  const [formation, setFormation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadDetails() {
    setIsLoading(true);
    try {
      const data = await apiRequest(
        `/formations/${formationId}/details`,
        { token: user.token },
      );
      setFormation(data);
    } catch (err) {
      pushToast(err.message, 'error');
      navigate('/student');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [formationId]);

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? 'Loading formation content...' : 'Formation not found.'}</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <button
        type="button"
        className="floating-back-link"
        onClick={() => navigate('/student')}
      >
        <span aria-hidden="true">&lt;</span>
        <span>Back to Student Dashboard</span>
      </button>

      <div className="card">
        <div className="card-head-row">
          <h1>{formation.title}</h1>
          <StatusBadge label="APPROVED" tone="green" />
        </div>
        <p>{formation.description}</p>
        <p className="hint">Price: {formation.price}</p>
      </div>

      <div className="stack">
        {formation.courses.map((course) => (
          <article key={course.id} className="card course-card">
            <h2>Course: {course.title}</h2>

            <div className="nested-sections">
              <section>
                <h3>Lessons</h3>
                <div className="nested-grid">
                  {course.lessons.length === 0 && (
                    <p className="hint">No lessons in this course.</p>
                  )}
                  {course.lessons.map((lesson) => (
                    <article key={lesson.id} className="item small-item">
                      <p><strong>{lesson.title}</strong></p>
                      <a
                        href={lesson.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hint"
                      >
                        Open PDF
                      </a>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3>Quizzes</h3>
                <div className="nested-grid">
                  {course.quizzes.length === 0 && (
                    <p className="hint">No quizzes in this course.</p>
                  )}

                  {course.quizzes.map((quiz) => (
                    <article key={quiz.id} className="item small-item">
                      <p><strong>{quiz.title}</strong></p>

                      {quiz.questions.map((question) => (
                        <div key={question.id} className="question-block">
                          <p className="hint"><strong>Question:</strong> {question.text}</p>
                          <ul className="choice-list">
                            {question.choices.map((choice) => (
                              <li key={choice.id}>{choice.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </article>
        ))}

        {formation.courses.length === 0 && (
          <div className="card">
            <p className="hint">No published online courses yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
