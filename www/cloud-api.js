export const CLOUD_API_BASE = 'https://nux-mg30-studio-api.vaivai851.workers.dev';
export const CLOUD_API_DEPLOYMENT = 'nux-mg30-studio-api';

function getToken() {
  try { return localStorage.getItem('mg30-cloud-auth-token') || ''; }
  catch { return ''; }
}

export async function cloudApiFetch(path, options = {}) {
  if (typeof path !== 'string' || !path.startsWith('/api/v1/')) throw new TypeError('Invalid Cloud API path.');
  const token = getToken();
  if (!token) throw new Error('Connect your Cloud Account from Device → NUX MG30 Studio Cloud before using online services.');
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', 'Bearer ' + token);
  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const requestUrl = CLOUD_API_BASE + path;
  const response = await fetch(requestUrl, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    let data = {};
    try { data = await response.clone().json(); } catch {}
    const label = data.error || ('HTTP ' + response.status);
    const upstream = data.upstreamStatus ? ' (provider HTTP ' + data.upstreamStatus + ')' : '';
    const error = new Error(label + upstream + ' [' + response.status + ' ' + requestUrl.replace(CLOUD_API_BASE, '') + ']');
    error.status = response.status;
    error.upstreamStatus = Number(data.upstreamStatus || 0) || null;
    error.reason = data.reason || '';
    error.requestUrl = requestUrl;
    throw error;
  }
  return response;
}

export async function cloudApiRequest(path, options = {}) {
  const response = await cloudApiFetch(path, {
    ...options,
    ...(options.body && typeof options.body !== 'string' ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (data?.ok === false) {
    const error = new Error(data.error || 'Cloud API request failed.');
    error.status = response.status;
    error.reason = data.reason || '';
    throw error;
  }
  return data;
}

export async function cloudApiStatus() {
  return cloudApiRequest('/api/v1/status');
}
