const TOKEN_KEY = 'innova_token';

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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

  return {
    token,
    userId: payload.sub,
    role: payload.role,
  };
}
