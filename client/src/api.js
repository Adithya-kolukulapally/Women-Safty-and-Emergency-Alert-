const API = '/api';

export async function request(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch {
    throw new Error('SafeHer API is offline. Start MongoDB, configure server/.env, then run npm run dev from the project folder.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (response.status >= 500) {
    throw new Error('SafeHer API or database is unavailable. Check that MongoDB and the Express server are running, and that server/.env has the correct MONGODB_URI.');
  }
  if (!response.ok) throw new Error(data?.message || 'Request failed. Please try again.');
  return data;
}
