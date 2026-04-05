import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  { age: '6-8 years', label: 'Little Explorers', emoji: '\u{1F331}', color: '#ddaed3' },
  { age: '9-11 years', label: 'Budding Inventors', emoji: '\u26A1', color: '#8fd8f3' },
  { age: '12-14 years', label: 'Young Geniuses', emoji: '\u{1F680}', color: '#2f73ba' },
  { age: '15-18+ years', label: 'Future Experts', emoji: '\u{1F52C}', color: '#0b2d72' },
];

const STATS = [
  {
    target: 2400,
    suffix: '+',
    label: 'Students Trained',
    icon: '/images/medaille.png',
    detail: 'learning journeys',
  },
  {
    target: 98,
    suffix: '%',
    label: 'Satisfaction',
    icon: '/images/love.png',
    detail: 'happy parents',
  },
  {
    target: 120,
    suffix: '+',
    label: 'Projects Created',
    icon: '/images/project.png',
    detail: 'hands-on builds',
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
  {
    name: 'Mehdi R.',
    role: "Rayen's Dad, 12 yrs old",
    text:
      'Super coaching and very clear progression. Rayen became more confident after only a few weeks.',
    stars: 5,
  },
  {
    name: 'Nour H.',
    role: "Yasmine's Mom, 9 yrs old",
    text:
      'The classes are playful and structured at the same time. She loves showing us her mini projects.',
    stars: 5,
  },
  {
    name: 'Wassim K.',
    role: "Adam's Dad, 15 yrs old",
    text:
      'Excellent environment and serious mentors. Adam now spends his free time building useful apps.',
    stars: 5,
  },
  {
    name: 'Rim S.',
    role: "Meriem's Mom, 11 yrs old",
    text:
      'A modern way of teaching with real outcomes. We noticed major growth in problem-solving skills.',
    stars: 5,
  },
  {
    name: 'Hichem D.',
    role: "Nader's Dad, 14 yrs old",
    text:
      'The quality is professional and motivating. Nader now plans to pursue robotics in high school.',
    stars: 5,
  },
];

const HERO_IMAGE = '/images/x.png';
const HERO_OVERLAY = 0.28;
const HERO_TEXT_ON_DARK = true;
const COUNTER_DURATION_MS = 1400;



function Footer() {   // or whatever your component is named

  useEffect(() => {
    function initSocialParticles() {
      document.querySelectorAll('.il-footer-social-link').forEach(link => {
        const canvas = link.querySelector('.il-social-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let raf = null;

        const COLOR_MAP = {
          'il-social-fb': '#4a90d9',
          'il-social-ig': '#e06fad',
          'il-social-li': '#5ba4cf',
        };
        const clsKey = ['il-social-fb','il-social-ig','il-social-li'].find(c => link.classList.contains(c));
        const clr = COLOR_MAP[clsKey] || '#56b5e8';

        function resize() {
          canvas.width  = link.offsetWidth;
          canvas.height = link.offsetHeight;
        }

        function spawnParticle() {
          const w = canvas.width;
          const h = canvas.height;
          const isBit = Math.random() > 0.4;
          particles.push({
            x: Math.random() * w,
            y: h * 0.6 + Math.random() * h * 0.4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(0.6 + Math.random() * 1.2),
            alpha: 0.9,
            size: isBit ? (6 + Math.random() * 4) : (1.5 + Math.random() * 2),
            isBit,
            char: Math.random() > 0.5 ? '1' : '0',
            color: clr,
          });
        }

        function loop() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (Math.random() < 0.35) spawnParticle();
          particles = particles.filter(p => p.alpha > 0.02);
          particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.016;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.isBit) {
              ctx.font = `bold ${p.size}px 'Courier New', monospace`;
              ctx.fillText(p.char, p.x, p.y);
            } else {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          ctx.globalAlpha = 1;
          raf = requestAnimationFrame(loop);
        }

        function start() { resize(); particles = []; if (!raf) raf = requestAnimationFrame(loop); }
        function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } ctx.clearRect(0, 0, canvas.width, canvas.height); particles = []; }

        link.addEventListener('mouseenter', start);
        link.addEventListener('mouseleave', stop);
        link.addEventListener('focus', start);
        link.addEventListener('blur', stop);
      });
    }

    initSocialParticles();

    // Cleanup on unmount — remove listeners
    return () => {
      document.querySelectorAll('.il-footer-social-link').forEach(link => {
        const clone = link.cloneNode(false);
        link.parentNode?.replaceChild(clone, link);
      });
    };
  }, []); // ? empty array = runs once after mount

  return (
    <footer className="il-footer">
      {/* ... your footer JSX ... */}
    </footer>
  );
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
  const { t, i18n } = useTranslation();
  const navRef = useRef(null);
  const [animatedStatValues, setAnimatedStatValues] = useState(() =>
    STATS.map(() => 0),
  );
  const numberLocale = i18n.language?.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-US';

  useNavScroll(navRef);
  useScrollReveal();

  useEffect(() => {
    let rafId;
    const startedAt = performance.now();
    const easeOutCubic = (t) => 1 - (1 - t) ** 3;

    const update = (now) => {
      const progress = Math.min((now - startedAt) / COUNTER_DURATION_MS, 1);
      const eased = easeOutCubic(progress);

      setAnimatedStatValues(STATS.map((stat) => Math.round(stat.target * eased)));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    rafId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

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
              {t('landing.nav.whyUs')}
            </a>
            <a href="#parcours" className="il-nav-link">
              {t('landing.nav.programs')}
            </a>
            <a href="#avis" className="il-nav-link">
              {t('landing.nav.reviews')}
            </a>
            <Link className="il-nav-link" to="/contact">
              {t('landing.nav.contact')}
            </Link>
            <Link className="topbar-auth-action il-nav-auth-action" to="/login">
              {t('landing.nav.login')}
            </Link>
            <Link className="topbar-auth-action topbar-auth-signup il-nav-auth-action" to="/signup">
              {t('landing.nav.getStarted')}
            </Link>
            <LanguageSwitcher variant="landing" />
          </nav>
        </div>
      </header>

      <section className={`il-hero${heroTextClass}`} style={heroStyle}>
        <div className="il-hero-content">
          <div className="il-hero-inner">
            <h1 className="il-hero-title">
              {t('landing.hero.titleLead')} <span className="il-hero-gradient">{` ${t('landing.hero.titleAccent')}`}</span>
              <br />
              {t('landing.hero.titleEnd')}
            </h1>
            <p className="il-hero-sub">
              {t('landing.hero.subtitleLine1')}
              <br />
              {t('landing.hero.subtitleLine2')}
            </p>
            <div className="il-hero-stats">
              {STATS.map((stat, index) => (
                <div key={stat.label} className="il-hero-stat">
                  <span className="il-hero-stat-icon">
                    {stat.icon.startsWith('/images/') ? (
                      <img src={stat.icon} alt="" className="il-hero-stat-icon-img" />
                    ) : (
                      stat.icon
                    )}
                  </span>
                  <div>
                    <div className="il-hero-stat-value">
                      {`${animatedStatValues[index].toLocaleString(numberLocale)}${stat.suffix}`}
                    </div>
                    <div className="il-hero-stat-label">
                      {t(`landing.hero.stats.${index}.label`, { defaultValue: stat.label })}
                    </div>
                    <div className="il-hero-stat-meta">
                      {t(`landing.hero.stats.${index}.detail`, { defaultValue: stat.detail })}
                    </div>
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
              <span className="il-eyebrow">{t('landing.sections.whyEyebrow')}</span>
              <h2 className="il-section-title">
                {t('landing.sections.whyTitleLine1')}
                <br />
                {t('landing.sections.whyTitleLine2')}
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
                  <div className="il-feature-tag">
                    {t(`landing.features.${index}.tag`, { defaultValue: feature.tag })}
                  </div>
                  <span className="il-feature-icon">{feature.icon}</span>
                  <h3 className="il-feature-title">
                    {t(`landing.features.${index}.title`, { defaultValue: feature.title })}
                  </h3>
                  <p className="il-feature-desc">
                    {t(`landing.features.${index}.description`, { defaultValue: feature.description })}
                  </p>
                  <div className="il-feature-line" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="il-section il-how-section">
          <div className="il-shell">
            <div className="il-section-head" data-reveal>
              <span className="il-eyebrow">{t('landing.sections.howEyebrow')}</span>
              <h2 className="il-section-title">{t('landing.sections.howTitle')}</h2>
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
                    <h3>{t(`landing.steps.${index}.title`, { defaultValue: step.title })}</h3>
                    <p>{t(`landing.steps.${index}.description`, { defaultValue: step.desc })}</p>
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
              <span className="il-eyebrow">{t('landing.sections.pathsEyebrow')}</span>
              <h2 className="il-section-title">{t('landing.sections.pathsTitle')}</h2>
              <p className="il-section-sub">{t('landing.sections.pathsSubtitle')}</p>
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
                  <div className="il-path-age">
                    {t(`landing.paths.${index}.age`, { defaultValue: path.age })}
                  </div>
                  <div className="il-path-label">
                    {t(`landing.paths.${index}.label`, { defaultValue: path.label })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="avis" className="il-section il-testimonials-section">
          <div className="il-shell">
            <div className="il-section-head" data-reveal>
              <span className="il-eyebrow">{t('landing.sections.reviewsEyebrow')}</span>
              <h2 className="il-section-title">{t('landing.sections.reviewsTitle')}</h2>
            </div>
            <div className="il-testimonials-marquee" data-reveal>
              <div className="il-testimonials-track">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => {
                  const testimonialIndex = index % TESTIMONIALS.length;
                  const testimonialName = t(`landing.testimonials.${testimonialIndex}.name`, {
                    defaultValue: testimonial.name,
                  });
                  const testimonialRole = t(`landing.testimonials.${testimonialIndex}.role`, {
                    defaultValue: testimonial.role,
                  });
                  const testimonialText = t(`landing.testimonials.${testimonialIndex}.text`, {
                    defaultValue: testimonial.text,
                  });

                  return (
                    <article
                      key={`${testimonial.name}-${index}`}
                      className="il-testimonial-card"
                    >
                      <div className="il-testimonial-stars">{'\u2605'.repeat(testimonial.stars)}</div>
                      <p className="il-testimonial-text">&quot;{testimonialText}&quot;</p>
                      <div className="il-testimonial-author">
                        <div className="il-testimonial-avatar">{testimonialName[0]}</div>
                        <div>
                          <div className="il-testimonial-name">{testimonialName}</div>
                          <div className="il-testimonial-role">{testimonialRole}</div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="il-footer">
        <div className="il-shell il-footer-inner">
          <div className="il-footer-grid">
            <div className="il-footer-col il-footer-col-brand">
              <img src="/images/logo2.png" alt="InnovaLearn" className="il-footer-logo" />
              <p className="il-footer-description">
                {t('landing.footer.descriptionLine1')}<br />
                {t('landing.footer.descriptionLine2')}<br />
                {t('landing.footer.descriptionLine3')}
              </p>
              <div className="il-footer-socials">
 
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/innovatorszone/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="il-footer-social-link il-social-fb"
                  aria-label="InnovaLearn Facebook"
                  data-label="fb"
                >
                  <span className="il-social-code-tag il-social-code-tag--open">&lt;</span>
                  <span className="il-social-icon-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M13.2 21v-8.2h2.8l.4-3.2h-3.2V7.6c0-.9.3-1.6 1.7-1.6h1.8V3.1c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6v2H7v3.2h2.7V21h3.5z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="il-social-code-tag il-social-code-tag--close">/&gt;</span>
                  <span className="il-social-tooltip">
                    <span className="il-tooltip-line"><span className="il-tok-kw">import</span> <span className="il-tok-str">'facebook'</span></span>
                    <span className="il-tooltip-line"><span className="il-tok-fn">connect</span><span className="il-tok-punc">(</span><span className="il-tok-str">"fb"</span><span className="il-tok-punc">)</span></span>
                  </span>
                  <canvas className="il-social-particles" aria-hidden="true" />
                </a>
 
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/mobtakeron.tn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="il-footer-social-link il-social-ig"
                  aria-label="InnovaLearn Instagram"
                  data-label="ig"
                >
                  <span className="il-social-code-tag il-social-code-tag--open">&lt;</span>
                  <span className="il-social-icon-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9zm9.7 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 7.3A4.7 4.7 0 1 1 7.3 12 4.7 4.7 0 0 1 12 7.3zm0 1.8A2.9 2.9 0 1 0 14.9 12 2.9 2.9 0 0 0 12 9.1z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="il-social-code-tag il-social-code-tag--close">/&gt;</span>
                  <span className="il-social-tooltip">
                    <span className="il-tooltip-line"><span className="il-tok-kw">import</span> <span className="il-tok-str">'instagram'</span></span>
                    <span className="il-tooltip-line"><span className="il-tok-fn">connect</span><span className="il-tok-punc">(</span><span className="il-tok-str">"ig"</span><span className="il-tok-punc">)</span></span>
                  </span>
                  <canvas className="il-social-particles" aria-hidden="true" />
                </a>
 
                {/* LinkedIn */}
                <a
                  href="#"
                  className="il-footer-social-link il-social-li"
                  aria-label="InnovaLearn LinkedIn"
                  data-label="li"
                  onClick={(event) => event.preventDefault()}
                >
                  <span className="il-social-code-tag il-social-code-tag--open">&lt;</span>
                  <span className="il-social-icon-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M6.2 8.3a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zM4.5 9.7h3.4v9.8H4.5V9.7zm5.5 0h3.2v1.3h.1c.4-.8 1.5-1.6 3.1-1.6 3.3 0 3.9 2.2 3.9 5v5.1h-3.4v-4.5c0-1.1 0-2.4-1.5-2.4s-1.7 1.1-1.7 2.3v4.6H10V9.7z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="il-social-code-tag il-social-code-tag--close">/&gt;</span>
                  <span className="il-social-tooltip">
                    <span className="il-tooltip-line"><span className="il-tok-kw">import</span> <span className="il-tok-str">'linkedin'</span></span>
                    <span className="il-tooltip-line"><span className="il-tok-fn">connect</span><span className="il-tok-punc">(</span><span className="il-tok-str">"li"</span><span className="il-tok-punc">)</span></span>
                  </span>
                  <canvas className="il-social-particles" aria-hidden="true" />
                </a>
 
              </div>
            </div>
 
            <div className="il-footer-col il-footer-col-contact">
              <center><h3 className="il-footer-contact-title">{t('landing.footer.contactTitle')}</h3></center>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@mobtakeron.tn"
              target="_blank"
              rel="noopener noreferrer"
              className="il-footer-contact-item"
            >
              <span className="il-footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm8 6 7-4H5l7 4zm0 2-7-4v6h14v-6l-7 4z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="il-footer-contact-text">contact@mobtakeron.tn</span>
            </a>
            <a href="tel:+21655500333" className="il-footer-contact-item">
              <span className="il-footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M6.6 10.8a15.4 15.4 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2c1 .4 2 .6 3.1.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17.5 17.5 0 0 1 3 4a1 1 0 0 1 1-1h3.4a1 1 0 0 1 1 1c0 1.1.2 2.1.6 3.1a1 1 0 0 1-.2 1l-2.2 2.2z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="il-footer-contact-text">+216 55 500 333</span>
            </a>
              <div className="il-footer-contact-item is-static">
                <span className="il-footer-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 2a7 7 0 0 1 7 7c0 4.9-7 13-7 13S5 13.9 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <a
                  href="https://maps.app.goo.gl/UrVwTsys4nvdJwKU7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="il-footer-contact-text-link"
                >
                  <span className="il-footer-contact-text">
                    Avenue Habib Bourguiba Moknine, 5050
                  </span>
                </a>
              </div>
            </div>
          </div>
 
          <div className="il-footer-bottom">
            <center><p className="il-footer-copy">{t('landing.footer.copyright')}</p></center>
          </div>
        </div>
      </footer>
    </div>
  );
}


