const API_BASE_URL = 'http://localhost:3000';

function getAuthHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function apiRequest(path, options = {}) {
  const { token, body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: rest.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
      ...(rest.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
