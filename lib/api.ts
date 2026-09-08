let csrf = '';
export function setCsrfToken(value: string) { csrf = value; }
export async function apiFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('X-CSRF-Token', csrf);
  const response = await window.fetch(url, { ...init, headers, credentials: 'same-origin' });
  if (response.status === 401 && !url.endsWith('/login')) window.dispatchEvent(new Event('session-expired'));
  return response;
}
