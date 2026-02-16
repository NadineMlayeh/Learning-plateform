import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';

const PROGRAMS = [
  {
    title: 'Robotique & Coding',
    text: 'Des ateliers concrets pour apprendre la logique, coder des robots et créer des mini projets fun.',
    tone: 'is-blue',
  },
  {
    title: 'Soft Skills & Communication',
    text: 'Presentations, creativite, confiance en soi et travail d equipe dans un cadre bienveillant.',
    tone: 'is-red',
  },
  {
    title: 'Parcours Progressif',
    text: 'Le student suit des formations, reussit ses quizzes et debloque badges et certificats.',
    tone: 'is-yellow',
  },
];

function getRolePath(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'FORMATEUR') return '/formateur';
  if (role === 'STUDENT') return '/student';
  return '/';
}

export default function DashboardPage() {
  const user = getCurrentUser();

  return (
    <section className="landing-page stack">
      <article className="landing-hero card">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">InnovaLearn Platform</p>
          <h1>Apprends, cree et progresse avec une experience moderne</h1>
          <p>
            Une plateforme claire pour les etudiants, formateurs et administrateurs,
            avec un suivi complet des formations, cours, quizzes, badges et certificats.
          </p>

          {user ? (
            <div className="row landing-actions">
              <Link className="landing-btn landing-btn-primary" to={getRolePath(user.role)}>
                Open my dashboard
              </Link>
              <span className="landing-role-pill">Role: {user.role}</span>
            </div>
          ) : (
            <div className="row landing-actions">
              <Link className="landing-btn landing-btn-primary" to="/login">
                Login
              </Link>
              <Link className="landing-btn landing-btn-secondary" to="/signup">
                Create account
              </Link>
            </div>
          )}
        </div>

        <div className="landing-hero-badges">
          <article>
            <strong>Interactive</strong>
            <span>Lessons, quizzes, score review</span>
          </article>
          <article>
            <strong>Structured</strong>
            <span>Role-based access and approval flow</span>
          </article>
          <article>
            <strong>Rewarding</strong>
            <span>Badges and final certificates</span>
          </article>
        </div>
      </article>

      <article className="landing-programs card">
        <div className="landing-programs-head">
          <h2>Why students like it</h2>
          <p>Simple to navigate, colorful, and focused on progression.</p>
        </div>

        <div className="landing-program-grid">
          {PROGRAMS.map((item) => (
            <section key={item.title} className={`landing-program-card ${item.tone}`}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
