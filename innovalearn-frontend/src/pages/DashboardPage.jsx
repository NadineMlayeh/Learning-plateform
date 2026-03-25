import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';
import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
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
    description: "Relève des défis en équipe, célèbre chaque victoire et deviens un champion de l'innovation.",
    icon: '🏆',
    tone: 'is-navy',
    tag: 'Fun',
  },
];

const PATHS = [
  { age: '6–8 ans',   label: 'Petits Explorateurs',  emoji: '🌱', color: '#ddaed3' },
  { age: '9–11 ans',  label: 'Inventeurs en Herbe',   emoji: '⚡', color: '#8fd8f3' },
  { age: '12–14 ans', label: 'Génies en Devenir',     emoji: '🚀', color: '#2f73ba' },
  { age: '15–18 ans', label: 'Experts du Futur',      emoji: '🔬', color: '#0b2d72' },
];

const STATS = [
  { value: '2 400+', label: 'Élèves formés',       icon: '👧' },
  { value: '98%',    label: 'Satisfaction', icon: '💬' },
  { value: '120+',   label: 'Projets créés',        icon: '🎨' },
];

const TESTIMONIALS = [
  {
    name: 'Sonia B.',
    role: 'Maman de Lina, 10 ans',
    text: "Ma fille rentre de ses cours avec des étoiles dans les yeux. InnovaLearn a transformé son rapport à l'apprentissage.",
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
const HERO_IMAGE        = '/images/x.png';
const HERO_OVERLAY      = 0.28;
const HERO_TEXT_ON_DARK = true;

function roleHomePath(role) {
  if (role === 'ADMIN')     return '/admin';
  if (role === 'FORMATEUR') return '/formateur';
  if (role === 'STUDENT')   return '/student';
  return '/';
}

/* ─────────────────────────────────────────
   HOOKS
───────────────────────────────────────── */

/** Adds .scrolled to nav when page scrolls */
function useNavScroll(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);
}

/** IntersectionObserver: adds .visible to [data-reveal] elements */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export default function DashboardPage() {
  const user   = getCurrentUser();
  const navRef = useRef(null);
  useNavScroll(navRef);
  useScrollReveal();

  /* Hero inline style — supports optional image */
  const heroStyle = HERO_IMAGE
    ? {
        background: `linear-gradient(120deg, rgba(11,45,114,${HERO_OVERLAY + 0.04}) 0%, rgba(47,115,186,${Math.max(HERO_OVERLAY - 0.02, 0.12)}) 34%, rgba(143,216,243,${Math.max(HERO_OVERLAY - 0.15, 0.08)}) 68%, rgba(221,174,211,${Math.max(HERO_OVERLAY - 0.18, 0.06)}) 100%), url('${HERO_IMAGE}') center/cover no-repeat`,
      }
    : undefined;

  const heroTextClass = HERO_IMAGE && HERO_TEXT_ON_DARK ? ' il-hero--dark-text' : '';

  return (
    <div className="il-page">

      {/* ── NAV ── */}
      <header className="il-nav" ref={navRef}>
        <div className="il-nav-inner">
          <div className="il-logo"> 
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-logo-img" />
          </div>
          <nav className="il-nav-links">
            <a href="#why"      className="il-nav-link">Pourquoi nous</a>
            <a href="#parcours" className="il-nav-link">Parcours</a>
            <a href="#avis"     className="il-nav-link">Avis</a>
            <Link className="il-btn il-btn-ghost"   to="/login">Connexion</Link>
            <Link className="il-btn il-btn-primary" to="/signup">Commencer</Link>
            {user && (
              <Link className="il-btn il-btn-dashboard" to={roleHomePath(user.role)}>
                Mon espace
              </Link>
            )}
          </nav>
        </div>
      </header>
      {/* ── HERO ── */}
      <section className={`il-hero${heroTextClass}`} style={heroStyle}>
        <div className="il-hero-content">
          {/* Left: copy */}
          <div className="il-hero-inner">
          <h1 className="il-hero-title">
            L'aventure de{" "}
            <span className="il-hero-gradient">l'apprentissage</span>
            <br />
            commence ici.
          </h1>
            <p className="il-hero-sub">
              Robotique · Code · Soft Skills<br />
              Pour les enfants de 6 à 18 ans qui veulent changer le monde.
            </p>
            <div className="il-hero-stats">
              {STATS.map((s) => (
                <div key={s.label} className="il-hero-stat">
                  <span className="il-hero-stat-icon">{s.icon}</span>
                  <div>
                    <div className="il-hero-stat-value">{s.value}</div>
                    <div className="il-hero-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ── FEATURES ── */}
      <section id="why" className="il-section il-features-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Pourquoi InnovaLearn ?</span>
            <h2 className="il-section-title">Apprendre autrement,<br />grandir ensemble.</h2>
          </div>
          <div className="il-features-grid">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`il-feature-card il-feature-card--${f.tone}`}
                data-reveal
                data-reveal-delay={i + 1}
              >
                <div className="il-feature-tag">{f.tag}</div>
                <span className="il-feature-icon">{f.icon}</span>
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
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Comment ça marche</span>
            <h2 className="il-section-title">3 étapes vers le succès</h2>
          </div>
          <div className="il-steps">
            {[
              { num: '01', title: 'Choisis ton parcours',   desc: 'Sélectionne le programme adapté à ton âge et tes passions.' },
              { num: '02', title: 'Apprends en créant',      desc: 'Des projets concrets, des défis amusants, des formateurs passionnés.' },
              { num: '03', title: 'Obtiens ton badge',        desc: 'Valide tes compétences avec des certificats reconnus.' },
            ].map((step, i) => (
              <div className="il-step" key={step.num} data-reveal data-reveal-delay={i + 1}>
                <span className="il-step-num">{step.num}</span>
                <div className="il-step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PATHS ── */}
      <section id="parcours" className="il-section il-paths-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Parcours d'apprentissage</span>
            <h2 className="il-section-title">Un chemin pour chaque enfant.</h2>
            <p className="il-section-sub">Programmes pensés pour chaque tranche d'âge, avec des contenus adaptés et progressifs.</p>
          </div>
          <div className="il-paths-grid">
            {PATHS.map((p, i) => (
              <article
                key={p.age}
                className="il-path-card"
                style={{ '--accent': p.color }}
                data-reveal
                data-reveal-delay={i + 1}
              >
                <span className="il-path-emoji">{p.emoji}</span>
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
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Ce que disent les parents</span>
            <h2 className="il-section-title">Ils nous font confiance.</h2>
          </div>
          <div className="il-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <article key={t.name} className="il-testimonial-card" data-reveal data-reveal-delay={i + 1}>
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
