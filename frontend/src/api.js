const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getModels(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/models${q ? '?' + q : ''}`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function getModel(slug) {
  const res = await fetch(`${BASE}/models/${slug}`);
  if (!res.ok) throw new Error('Model not found');
  return res.json();
}

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  return res.json();
}

export async function adminGetModels() {
  const res = await fetch(`${BASE}/admin/models`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function adminGetModel(id) {
  const res = await fetch(`${BASE}/admin/models/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function adminCreateModel(formData) {
  const res = await fetch(`${BASE}/admin/models`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create model');
  }
  return res.json();
}

export async function adminUpdateModel(id, formData) {
  const res = await fetch(`${BASE}/admin/models/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update model');
  }
  return res.json();
}

export async function adminDeleteModel(id) {
  const res = await fetch(`${BASE}/admin/models/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete model');
  return res.json();
}

export async function getInstagramFeed() {
  const res = await fetch(`${BASE}/instagram`);
  if (!res.ok) throw new Error('Instagram unavailable');
  return res.json();
}

export async function submitApplication(data) {
  const res = await fetch(`${BASE}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao enviar inscrição.');
  }
  return res.json();
}
