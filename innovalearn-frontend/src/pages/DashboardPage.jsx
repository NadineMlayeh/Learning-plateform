import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    title: 'Robotics Programming',
    description:
      'Build real robots. Code real solutions. Experience real technological adventures.',
    icon: '\u{1F916}',
    tone: 'is-blue',
    tag: 'Hands-on',
  },
  {
    title: 'Soft Skills & Creativity',
    description:
      'Develop confidence, communication, and leadership in a supportive environment.',
    icon: '\u2728',
    tone: 'is-pink',
    tag: 'Essential',
  },
  {
    title: 'Fun Competitions',
    description:
      'Take on team challenges, celebrate every victory, and become an innovation champion.',
    icon: '\u{1F3C6}',
    tone: 'is-navy',
    tag: 'Fun',
  },
];

const PATHS = [
  { age: '6-8 yrs', label: 'Little Explorers', emoji: '\u{1F331}', color: '#ddaed3' },
  { age: '9-11 yrs', label: 'Budding Inventors', emoji: '\u26A1', color: '#8fd8f3' },
  { age: '12-14 yrs', label: 'Young Geniuses', emoji: '\u{1F680}', color: '#2f73ba' },
  { age: '15-18 yrs', label: 'Future Experts', emoji: '\u{1F52C}', color: '#0b2d72' },
];

const STATS = [
  {
    value: '2,400+',
    label: 'Students Trained',
    icon: '/images/medaille.png',
    detail: 'courses completed',
  },
  {
    value: '98%',
    label: 'Satisfaction',
    icon: '/images/love.png',
    detail: 'happy parents',
  },
  {
    value: '120+',
    label: 'Projects Created',
    icon: '/images/project.png',
    detail: 'real projects',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sonia B.',
    role: "Lina's Mom, 10 yrs old",
    text:
      "My daughter comes back from her classes with stars in her eyes. InnovaLearn transformed her approach to learning.",
    stars: 5,
  },
  {
    name: 'Karim M.',
    role: "Yassine's Dad, 13 yrs old",
    text:
      "In 3 months my son coded his first video game. I still can't believe it. Amazing team!",
    stars: 5,
  },
  {
    name: 'Amira T.',
    role: "Sofia's Mom, 8 yrs old",
    text:
      'Sofia talks about her robots to all her friends. The pedagogy is perfect for creative kids.',
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
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
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
          0.12
        )}) 34%, rgba(143,216,243,${Math.max(HERO_OVERLAY - 0.15, 0.08)}) 68%, rgba(221,174,211,${Math.max(
          HERO_OVERLAY - 0.18,
          0.06
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
              Why Us
            </a>
            <a href="#parcours" className="il-nav-link">
              Programs
            </a>
            <a href="#avis" className="il-nav-link">
              Reviews
            </a>
            <Link className="il-btn il-btn-ghost" to="/login">
              Login
            </Link>
            <Link className="il-btn il-btn-primary" to="/signup">
              Get Started
            </Link>
            {user && (
              <Link className="il-btn il-btn-dashboard" to={roleHomePath(user.role)}>
                My Dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className={`il-hero${heroTextClass}`} style={heroStyle}>
        <div className="il-hero-content">
          <div className="il-hero-inner">
            <h1 className="il-hero-title">
              The adventure of <span className="il-hero-gradient">learning</span>
              <br />
              starts here.
            </h1>
            <p className="il-hero-sub">
              Robotics · Code · Soft Skills
              <br />
              For kids aged 6–18 who want to change the world.
            </p>
            <div className="il-hero-stats">
              {STATS.map((stat) => (
                <div key={stat.label} className="il-hero-stat">
                  <span className="il-hero-stat-icon">
                    {stat.icon.startsWith('/images/') ? (
                      <img src={stat.icon} alt="" className="il-hero-stat-icon-img" />
                    ) : (
                      stat.icon
                    )}
                  </span>
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

      <div className="il-bbc-shared-sections">
        <section id="why" className="il-section il-features-section">
          <div className="il-shell">
            <div className="il-section-head" data-reveal>
              <span className="il-eyebrow">Why InnovaLearn?</span>
              <h2 className="il-section-title">
                Learn differently,
                <br />
                grow together.
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
              <span className="il-eyebrow">How it works</span>
              <h2 className="il-section-title">3 steps to success</h2>
            </div>
            <div className="il-steps">
              {[
                {
                  num: '01',
                  title: 'Choose your path',
                  desc: 'Select the program suited to your age and interests.',
                },
                {
                  num: '02',
                  title: 'Learn by creating',
                  desc: 'Concrete projects, fun challenges, passionate instructors.',
                },
                {
                  num: '03',
                  title: 'Earn your badge',
                  desc: 'Validate your skills with recognized certificates.',
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
      </div>

      <div className="il-bbc-shared-sections il-bbc-shared-sections--lower">
        <section id="parcours" className="il-section il-paths-section">
          <div className="il-shell">
            <div className="il-section-head" data-reveal>
              <span className="il-eyebrow">Learning Paths</span>
              <h2 className="il-section-title">A path for every child.</h2>
              <p className="il-section-sub">
                Programs designed for each age group, with adapted and progressive content.
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
                  <div className="il-path-cta">Discover \u2192</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="avis" className="il-section il-testimonials-section">
          <div className="il-shell">
            <div className="il-section-head" data-reveal>
              <span className="il-eyebrow">What parents say</span>
              <h2 className="il-section-title">They trust us.</h2>
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
      </div>

      <footer className="il-footer">
        <div className="il-shell il-footer-inner">
          <div className="il-footer-brand">
            <img src="/images/logo2.png" alt="InnovaLearn" className="il-footer-logo" />
            <p>Innovative education for tomorrow’s generation.</p>
          </div>
          <div className="il-footer-links">
            <span className="il-footer-link">Home</span>
            <span className="il-footer-link">Programs</span>
            <span className="il-footer-link">Instructors</span>
            <span className="il-footer-link">Contact</span>
          </div>
          <p className="il-footer-copy">{'\u00A9'} 2026 InnovaLearn. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}