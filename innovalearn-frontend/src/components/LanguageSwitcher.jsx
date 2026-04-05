import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANG_OPTIONS = [
  { code: 'en', label: 'English', flag: '/images/uk.png' },
  { code: 'fr', label: 'Français', flag: '/images/france.png' },
];

export default function LanguageSwitcher({ variant = 'topbar' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const activeCode = useMemo(() => {
    const raw = i18n.resolvedLanguage || i18n.language || 'en';
    return raw.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  function toggle() {
    setIsOpen((prev) => !prev);
  }

  function selectLanguage(code) {
    i18n.changeLanguage(code);
    setIsOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`language-switcher language-switcher--${variant}`}
    >
      <button
        type="button"
        className={`language-switcher-trigger language-switcher-trigger--${variant} topbar-link-underline`}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Change language"
      >
        <span className="language-switcher-globe" aria-hidden="true">
          🌐
        </span>
        <span className="language-switcher-code">{activeCode.toUpperCase()}</span>
        <span className="language-switcher-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={`language-switcher-menu language-switcher-menu--${variant}`} role="menu">
          {LANG_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              role="menuitemradio"
              aria-checked={activeCode === option.code}
              className={`language-switcher-item${
                activeCode === option.code ? ' is-active' : ''
              }`}
              onClick={() => selectLanguage(option.code)}
            >
              <img
                src={option.flag}
                alt=""
                aria-hidden="true"
                className="language-switcher-flag"
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
