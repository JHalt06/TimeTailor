export async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // with Vite proxy this is same-origin; credentials not strictly needed,
    // but leaving it on is harmless for dev/prod consistency:
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}
