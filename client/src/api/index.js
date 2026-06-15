const BASE = '/api';

function getHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(url, options = {}) {
  const res = await fetch(url, { headers: getHeaders(options.body ? undefined : {}), ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* Auth */
export async function authLogin(username, password) {
  return request(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function authMe() {
  return request(`${BASE}/auth/me`);
}

export async function changePassword(oldPassword, newPassword) {
  return request(`${BASE}/auth/password`, {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

/* Users (admin) */
export async function fetchUsers() {
  return request(`${BASE}/users`);
}

export async function createUser(data) {
  return request(`${BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id, data) {
  return request(`${BASE}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id) {
  return request(`${BASE}/users/${id}`, {
    method: 'DELETE',
  });
}

/* Communities */
export async function fetchCommunities() {
  return request(`${BASE}/communities`);
}

export async function fetchSummary() {
  return request(`${BASE}/summary`);
}

export async function updateCommunity(id, data) {
  return request(`${BASE}/communities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* Weather & Prediction */
export async function fetchWeather() {
  return request(`${BASE}/weather`);
}

export async function fetchPrediction(temperature) {
  return request(`${BASE}/predict?temperature=${temperature}`);
}

export async function fetchTomorrowPrediction() {
  return request(`${BASE}/predict/tomorrow`);
}

/* Report */
export async function importFromUrl(url) {
  return request(`${BASE}/import/url?url=${encodeURIComponent(url)}`);
}

export async function fetchReport(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return request(`${BASE}/report?${params}`);
}
