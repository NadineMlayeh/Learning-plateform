import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    title: 'Programmation Robotique',
    description:
      'Construis de vrais robots. Code de vraies solutions. Vis de vraies aventures technologiques.',
    icon: '\u{1F916}',
    tone: 'is-blue',
    tag: 'Hands-on',
  },
  {
    title: 'Soft Skills & Creativite',
    description:
      'Developpe ta confiance, ta communication et ton leadership dans un espace bienveillant.',
    icon: '\u2728',
    tone: 'is-pink',
    tag: 'Essentiel',
  },
  {
    title: 'Competitions Ludiques',
    description:
      "Releve des defis en equipe, celebre chaque victoire et deviens un champion de l'innovation.",
    icon: '\u{1F3C6}',
    tone: 'is-navy',
    tag: 'Fun',
  },
];

const PATHS = [
  { age: '6-8 ans', label: 'Petits Explorateurs', emoji: '\u{1F331}', color: '#ddaed3' },
  { age: '9-11 ans', label: 'Inventeurs en Herbe', emoji: '\u26A1', color: '#8fd8f3' },
  { age: '12-14 ans', label: 'Genies en Devenir', emoji: '\u{1F680}', color: '#2f73ba' },
  { age: '15-18 ans', label: 'Experts du Futur', emoji: '\u{1F52C}', color: '#0b2d72' },
];

const STATS = [
  {
    value: '2 400+',
    label: 'Eleves formes',
    icon: '\u{1F393}',
    detail: 'parcours suivis',
  },
  {
    value: '98%',
    label: 'Satisfaction',
    icon: '\u{1F497}',
    detail: 'parents ravis',
  },
  {
    value: '120+',
    label: 'Projets crees',
    icon: '\u{1F680}',
    detail: 'projets reels',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sonia B.',
    role: 'Maman de Lina, 10 ans',
    text:
      "Ma fille rentre de ses cours avec des etoiles dans les yeux. InnovaLearn a transforme son rapport a l'apprentissage.",
    stars: 5,
  },
  {
    name: 'Karim M.',
    role: 'Papa de Yassine, 13 ans',
    text:
      "En 3 mois mon fils a code son premier jeu video. Je n'en reviens toujours pas. Equipe au top.",
    stars: 5,
  },
  {
    name: 'Amira T.',
    role: 'Maman de Sofia, 8 ans',
    text:
      'Sofia parle de ses robots a tous ses amis. La pedagogie est parfaite pour les enfants creatifs.',
    stars: 5,
  },
];

const HERO_IMAGE = '/images/x.png';
const HERO_OVERLAY = 0.28;
const HERO_TEXT_ON_DARK = true;

function roleHomePath(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'FORMATEUR') return '/formateur';
  if (role === 'STUDENT') return '/student';
  return '/';
}

function useNavScroll(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function DashboardPage() {
  const user = getCurrentUser();
  const navRef = useRef(null);

  useNavScroll(navRef);
  useScrollReveal();

  const heroStyle = HERO_IMAGE
    ? {
        background: `linear-gradient(120deg, rgba(11,45,114,${HERO_OVERLAY + 0.04}) 0%, rgba(47,115,186,${Math.max(
          HERO_OVERLAY - 0.02,
          0.12,
        )}) 34%, rgba(143,216,243,${Math.max(
          HERO_OVERLAY - 0.15,
          0.08,
        )}) 68%, rgba(221,174,211,${Math.max(
          HERO_OVERLAY - 0.18,
          0.06,
        )}) 100%), url('${HERO_IMAGE}') center/cover no-repeat`,
      }
    : undefined;

  const heroTextClass = HERO_IMAGE && HERO_TEXT_ON_DARK ? ' il-hero--dark-text' : '';

  return (
    <div className="il-page">
      <header className="il-nav" ref={navRef}>
        <div className="il-nav-inner">
          <div className="il-logo">
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-logo-img" />
          </div>
          <nav className="il-nav-links">
            <a href="#why" className="il-nav-link">
              Pourquoi nous
            </a>
            <a href="#parcours" className="il-nav-link">
              Parcours
            </a>
            <a href="#avis" className="il-nav-link">
              Avis
            </a>
            <Link className="il-btn il-btn-ghost" to="/login">
              Connexion
            </Link>
            <Link className="il-btn il-btn-primary" to="/signup">
              Commencer
            </Link>
            {user && (
              <Link className="il-btn il-btn-dashboard" to={roleHomePath(user.role)}>
                Mon espace
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className={`il-hero${heroTextClass}`} style={heroStyle}>
        <div className="il-hero-content">
          <div className="il-hero-inner">
            <h1 className="il-hero-title">
              L&apos;aventure de <span className="il-hero-gradient">l&apos;apprentissage</span>
              <br />
              commence ici.
            </h1>
            <p className="il-hero-sub">
              Robotique \u00B7 Code \u00B7 Soft Skills
              <br />
              Pour les enfants de 6 a 18 ans qui veulent changer le monde.
            </p>
            <div className="il-hero-stats">
              {STATS.map((stat) => (
                <div key={stat.label} className="il-hero-stat">
                  <span className="il-hero-stat-icon">{stat.icon}</span>
                  <div>
                    <div className="il-hero-stat-value">{stat.value}</div>
                    <div className="il-hero-stat-label">{stat.label}</div>
                    <div className="il-hero-stat-meta">{stat.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="il-section il-features-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Pourquoi InnovaLearn ?</span>
            <h2 className="il-section-title">
              Apprendre autrement,
              <br />
              grandir ensemble.
            </h2>
          </div>
          <div className="il-features-grid">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className={`il-feature-card il-feature-card--${feature.tone}`}
                data-reveal
                data-reveal-delay={index + 1}
              >
                <div className="il-feature-tag">{feature.tag}</div>
                <span className="il-feature-icon">{feature.icon}</span>
                <h3 className="il-feature-title">{feature.title}</h3>
                <p className="il-feature-desc">{feature.description}</p>
                <div className="il-feature-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="il-section il-how-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Comment ca marche</span>
            <h2 className="il-section-title">3 etapes vers le succes</h2>
          </div>
          <div className="il-steps">
            {[
              {
                num: '01',
                title: 'Choisis ton parcours',
                desc: 'Selectionne le programme adapte a ton age et tes passions.',
              },
              {
                num: '02',
                title: 'Apprends en creant',
                desc: 'Des projets concrets, des defis amusants, des formateurs passionnes.',
              },
              {
                num: '03',
                title: 'Obtiens ton badge',
                desc: 'Valide tes competences avec des certificats reconnus.',
              },
            ].map((step, index) => (
              <div className="il-step" key={step.num} data-reveal data-reveal-delay={index + 1}>
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

      <section id="parcours" className="il-section il-paths-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Parcours d&apos;apprentissage</span>
            <h2 className="il-section-title">Un chemin pour chaque enfant.</h2>
            <p className="il-section-sub">
              Programmes penses pour chaque tranche d&apos;age, avec des contenus adaptes et progressifs.
            </p>
          </div>
          <div className="il-paths-grid">
            {PATHS.map((path, index) => (
              <article
                key={path.age}
                className="il-path-card"
                style={{ '--accent': path.color }}
                data-reveal
                data-reveal-delay={index + 1}
              >
                <span className="il-path-emoji">{path.emoji}</span>
                <div className="il-path-age">{path.age}</div>
                <div className="il-path-label">{path.label}</div>
                <div className="il-path-cta">Decouvrir \u2192</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="avis" className="il-section il-testimonials-section">
        <div className="il-shell">
          <div className="il-section-head" data-reveal>
            <span className="il-eyebrow">Ce que disent les parents</span>
            <h2 className="il-section-title">Ils nous font confiance.</h2>
          </div>
          <div className="il-testimonials-grid">
            {TESTIMONIALS.map((testimonial, index) => (
              <article
                key={testimonial.name}
                className="il-testimonial-card"
                data-reveal
                data-reveal-delay={index + 1}
              >
                <div className="il-testimonial-stars">{'\u2605'.repeat(testimonial.stars)}</div>
                <p className="il-testimonial-text">&quot;{testimonial.text}&quot;</p>
                <div className="il-testimonial-author">
                  <div className="il-testimonial-avatar">{testimonial.name[0]}</div>
                  <div>
                    <div className="il-testimonial-name">{testimonial.name}</div>
                    <div className="il-testimonial-role">{testimonial.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="il-footer">
        <div className="il-shell il-footer-inner">
          <div className="il-footer-brand">
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-footer-logo" />
            <p>L&apos;education innovante pour la generation de demain.</p>
          </div>
          <div className="il-footer-links">
            <span className="il-footer-link">Accueil</span>
            <span className="il-footer-link">Parcours</span>
            <span className="il-footer-link">Formateurs</span>
            <span className="il-footer-link">Contact</span>
          </div>
          <p className="il-footer-copy">{'\u00A9'} 2026 InnovaLearn. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  );
}

