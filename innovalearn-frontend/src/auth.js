const TOKEN_KEY = 'innova_token';
const SESSION_STARTED_AT_KEY = 'innova_session_started_at';
const SESSION_TIMEOUT_FLAG_KEY = 'innova_session_timeout_redirect';
export const SESSION_DURATION_MS = 5 * 60 * 60 * 1000;

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
  try {
    sessionStorage.removeItem(SESSION_TIMEOUT_FLAG_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(options = {}) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_STARTED_AT_KEY);
  try {
    if (options.reason === 'timeout') {
      sessionStorage.setItem(SESSION_TIMEOUT_FLAG_KEY, '1');
    } else {
      sessionStorage.removeItem(SESSION_TIMEOUT_FLAG_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function isSessionExpired() {
  const token = getToken();
  if (!token) return false;

  const startedAtRaw = localStorage.getItem(SESSION_STARTED_AT_KEY);
  const startedAt = Number(startedAtRaw || 0);
  if (!startedAt) return false;

  return Date.now() - startedAt >= SESSION_DURATION_MS;
}

export function consumeSessionTimeoutRedirectFlag() {
  try {
    const flagged = sessionStorage.getItem(SESSION_TIMEOUT_FLAG_KEY) === '1';
    if (flagged) {
      sessionStorage.removeItem(SESSION_TIMEOUT_FLAG_KEY);
    }
    return flagged;
  } catch {
    return false;
  }
}

export function parseJwt(token) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const token = getToken();
  const payload = parseJwt(token);

  if (!token || !payload) return null;

  const startedAtRaw = localStorage.getItem(SESSION_STARTED_AT_KEY);
  if (!startedAtRaw) {
    localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
  }

  return {
    token,
    userId: payload.sub,
    role: payload.role,
  };
}
