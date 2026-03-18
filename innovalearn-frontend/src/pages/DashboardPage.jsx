import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';

const FEATURES = [
  {
    title: 'Programmation Robotique',
    description: 'Construis de vrais robots. Code de vraies solutions. Vis de vraies aventures technologiques.',
    icon: '🤖',
    tone: 'is-blue',
    tag: 'Hands-on',
  },
  {
    title: 'Soft Skills & Créativité',
    description: 'Développe ta confiance, ta communication et ton leadership dans un espace bienveillant.',
    icon: '✨',
    tone: 'is-pink',
    tag: 'Essentiel',
  },
  {
    title: 'Compétitions Ludiques',
    description: 'Relève des défis en équipe, célèbre chaque victoire et deviens un champion de l\'innovation.',
    icon: '🏆',
    tone: 'is-navy',
    tag: 'Fun',
  },
];

const PATHS = [
  { age: '6–8 ans', label: 'Petits Explorateurs', emoji: '🌱', color: '#ddaed3' },
  { age: '9–11 ans', label: 'Inventeurs en Herbe', emoji: '⚡', color: '#8fd8f3' },
  { age: '12–14 ans', label: 'Génies en Devenir', emoji: '🚀', color: '#2f73ba' },
  { age: '15–18 ans', label: 'Experts du Futur', emoji: '🔬', color: '#0b2d72' },
];

const STATS = [
  { value: '2 400+', label: 'Élèves formés', icon: '👧' },
  { value: '98%', label: 'Satisfaction parents', icon: '💬' },
  { value: '120+', label: 'Projets créés', icon: '🎨' },
  { value: '15', label: 'Formateurs experts', icon: '🧑‍🏫' },
];

const TESTIMONIALS = [
  {
    name: 'Sonia B.',
    role: 'Maman de Lina, 10 ans',
    text: 'Ma fille rentre de ses cours avec des étoiles dans les yeux. InnovaLearn a transformé son rapport à l\'apprentissage.',
    stars: 5,
  },
  {
    name: 'Karim M.',
    role: 'Papa de Yassine, 13 ans',
    text: 'En 3 mois mon fils a codé son premier jeu vidéo. Je n\'en reviens toujours pas. Équipe au top.',
    stars: 5,
  },
  {
    name: 'Amira T.',
    role: 'Maman de Sofia, 8 ans',
    text: 'Sofia parle de ses robots à tous ses amis. La pédagogie est parfaite pour les enfants créatifs.',
    stars: 5,
  },
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
    <div className="il-page">

      {/* ── NAV ── */}
      <header className="il-nav">
        <div className="il-nav-inner">
          <div className="il-logo">
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-logo-img" />
          </div>
          <nav className="il-nav-links">
            <a href="#why" className="il-nav-link">Pourquoi nous</a>
            <a href="#parcours" className="il-nav-link">Parcours</a>
            <a href="#avis" className="il-nav-link">Avis</a>
            <Link className="il-btn il-btn-ghost" to="/login">Connexion</Link>
            <Link className="il-btn il-btn-primary" to="/signup">Commencer →</Link>
            {user && (
              <Link className="il-btn il-btn-dashboard" to={roleHomePath(user.role)}>
                Mon espace
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="il-hero">
        <div className="il-hero-bg">
          <div className="il-blob il-blob-1" />
          <div className="il-blob il-blob-2" />
          <div className="il-blob il-blob-3" />
          <div className="il-grid-overlay" />
        </div>
        <div className="il-hero-inner">

          <h1 className="il-hero-title">
            L'aventure de
            <span className="il-hero-gradient"> l'apprentissage</span>
            <br />
            commence ici.
          </h1>
          <p className="il-hero-sub">
            Robotique · Code · Créativité · Soft Skills<br />
            Pour les enfants de 6 à 18 ans qui veulent changer le monde.
          </p>
          <div className="il-hero-actions">
            <Link className="il-btn il-btn-hero-primary" to="/signup">
              Rejoindre gratuitement →
            </Link>
            <a href="#why" className="il-btn il-btn-hero-ghost">
              Découvrir les parcours
            </a>
          </div>
          <div className="il-hero-stats">
            {STATS.map((s) => (
              <div key={s.label} className="il-hero-stat">
                <span className="il-hero-stat-icon">{s.icon}</span>
                <span className="il-hero-stat-value">{s.value}</span>
                <span className="il-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* IMAGE PLACEHOLDER — replace with your hero illustration */}
        <div className="il-hero-visual">
          <div className="il-hero-img-placeholder">
            <span>🖼️</span>
            <p>Illustration hero<br />(remplacez par votre image)</p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="why" className="il-section il-features-section">
        <div className="il-shell">
          <div className="il-section-head">
            <span className="il-eyebrow">Pourquoi InnovaLearn ?</span>
            <h2 className="il-section-title">Apprendre autrement,<br />grandir ensemble.</h2>
          </div>
          <div className="il-features-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className={`il-feature-card il-feature-card--${f.tone}`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="il-feature-tag">{f.tag}</div>
                <div className="il-feature-icon">{f.icon}</div>
                <h3 className="il-feature-title">{f.title}</h3>
                <p className="il-feature-desc">{f.description}</p>
                <div className="il-feature-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="il-section il-how-section">
        <div className="il-shell">
          <div className="il-section-head">
            <span className="il-eyebrow">Comment ça marche</span>
            <h2 className="il-section-title">3 étapes vers le succès</h2>
          </div>
          <div className="il-steps">
            <div className="il-step">
              <div className="il-step-num">01</div>
              <div className="il-step-content">
                <h3>Choisis ton parcours</h3>
                <p>Sélectionne le programme adapté à ton âge et tes passions.</p>
              </div>
            </div>
            <div className="il-step-arrow">→</div>
            <div className="il-step">
              <div className="il-step-num">02</div>
              <div className="il-step-content">
                <h3>Apprends en créant</h3>
                <p>Des projets concrets, des défis amusants, des formateurs passionnés.</p>
              </div>
            </div>
            <div className="il-step-arrow">→</div>
            <div className="il-step">
              <div className="il-step-num">03</div>
              <div className="il-step-content">
                <h3>Obtiens ton badge</h3>
                <p>Valide tes compétences avec des certificats reconnus.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PATHS ── */}
      <section id="parcours" className="il-section il-paths-section">
        <div className="il-shell">
          <div className="il-section-head">
            <span className="il-eyebrow">Parcours d'apprentissage</span>
            <h2 className="il-section-title">Un chemin pour chaque enfant.</h2>
            <p className="il-section-sub">Programmes pensés pour chaque tranche d'âge, avec des contenus adaptés et progressifs.</p>
          </div>
          <div className="il-paths-grid">
            {PATHS.map((p, i) => (
              <article key={p.age} className="il-path-card" style={{ '--accent': p.color, animationDelay: `${i * 60}ms` }}>
                <div className="il-path-emoji">{p.emoji}</div>
                <div className="il-path-age">{p.age}</div>
                <div className="il-path-label">{p.label}</div>
                <div className="il-path-cta">Découvrir →</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="avis" className="il-section il-testimonials-section">
        <div className="il-shell">
          <div className="il-section-head">
            <span className="il-eyebrow">Ce que disent les parents</span>
            <h2 className="il-section-title">Ils nous font confiance.</h2>
          </div>
          <div className="il-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="il-testimonial-card">
                <div className="il-testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="il-testimonial-text">"{t.text}"</p>
                <div className="il-testimonial-author">
                  <div className="il-testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="il-testimonial-name">{t.name}</div>
                    <div className="il-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="il-cta-section">
        <div className="il-shell">
          <div className="il-cta-card">
            <div className="il-cta-blob" />
            <h2 className="il-cta-title">Prêt à commencer l'aventure ?</h2>
            <p className="il-cta-sub">Inscris-toi gratuitement et découvre le premier cours offert.</p>
            <div className="il-cta-actions">
              <Link className="il-btn il-btn-cta" to="/signup">Créer mon compte →</Link>
              <Link className="il-btn il-btn-cta-ghost" to="/login">J'ai déjà un compte</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="il-footer">
        <div className="il-shell il-footer-inner">
          <div className="il-footer-brand">
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-footer-logo" />
            <p>L'éducation innovante pour la génération de demain.</p>
          </div>
          <div className="il-footer-links">
            <span className="il-footer-link">Accueil</span>
            <span className="il-footer-link">Parcours</span>
            <span className="il-footer-link">Formateurs</span>
            <span className="il-footer-link">Contact</span>
          </div>
          <p className="il-footer-copy">© 2026 InnovaLearn. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}