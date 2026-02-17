import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';

const FEATURES = [
  {
    title: 'Programmation Robotique',
    description: 'Ateliers concrets avec projets amusants pour apprendre en construisant.',
    tone: 'is-blue',
  },
  {
    title: 'Soft Skills et Creativite',
    description: 'Communication, confiance et prise de parole dans un cadre positif.',
    tone: 'is-red',
  },
  {
    title: 'Competitions Ludiques',
    description: 'Challenges en equipe pour progresser et celebrer chaque victoire.',
    tone: 'is-yellow',
  },
];

const PATHS = [
  { age: '6-8 ans', label: 'Petits explorateurs' },
  { age: '9-11 ans', label: 'Inventeurs en herbe' },
  { age: '12-14 ans', label: 'Genies en devenir' },
  { age: '15-18 ans', label: 'Experts du futur' },
];

function roleHomePath(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'FORMATEUR') return '/formateur';
  if (role === 'STUDENT') return '/student';
  return '/';
}

export default function DashboardPage() {
  const user = getCurrentUser();

  return (
    <div className="showcase-page">
      <header className="showcase-nav glass-nav">
        <div className="showcase-nav-inner">
          <div className="showcase-logo">
            <span className="logo-innova">Innova</span>
            <span className="logo-learn">Learn</span>
          </div>

          <nav className="showcase-links">
            <a href="#avis" className="nav-link">
              Avis Parents
            </a>
            <a href="#why" className="nav-link">
              Pourquoi nous
            </a>
            <a href="#competitions" className="nav-link">
              Competitions
            </a>
            <Link className="kid-button" to="/login">
              Login
            </Link>
            <Link className="kid-button kid-button-outline" to="/signup">
              Sign up
            </Link>
            {user && (
              <Link className="kid-button kid-button-strong" to={roleHomePath(user.role)}>
                Open dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="showcase-hero sparkle-bg hero-glow">
        <h1><span className="gradient-text">
          Developpement </span><span className="gradient-text">Robotique</span> et{' '}
          <span className="gradient-text">Soft Skills</span>
        </h1>
        <p className="showcase-tagline">
          <span>Apprends</span>
          <span className="dot">.</span>
          <span>Cree</span>
          <span className="dot">.</span>
          <span>Innove</span>
        </p>
      </section>

      <section id="why" className="showcase-features">
        <div className="showcase-shell feature-grid">
          {FEATURES.map((item) => (
            <article key={item.title} className={`kid-card feature-card ${item.tone}`}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-paths">
        <div className="showcase-shell">
          <h2>Parcours d Apprentissage</h2>
          <p>Choisis ton chemin.</p>
          <div className="path-grid">
            {PATHS.map((item) => (
              <article key={item.age} className="kid-card path-card">
                <h3>{item.age}</h3>
                <p>{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="avis" className="showcase-testimonials">
        <div className="showcase-shell">
          <h2>Avis des Parents</h2>
          <div className="testimonial-grid">
            <article className="kid-card testimonial-card">
              <p className="stars">*****</p>
              <p>Mon enfant adore InnovaLearn.</p>
            </article>
            <article className="kid-card testimonial-card">
              <p className="stars">*****</p>
              <p>Apprentissage serieux et amusant.</p>
            </article>
          </div>
        </div>
      </section>

      <footer id="competitions" className="showcase-footer">
        <p>InnovaLearn 2026</p>
      </footer>
    </div>
  );
}
