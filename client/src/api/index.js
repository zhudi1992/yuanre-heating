const BASE = '/api';

export async function fetchCommunities() {
  const res = await fetch(`${BASE}/communities`);
  if (!res.ok) throw new Error('获取数据失败');
  return res.json();
}

export async function fetchSummary() {
  const res = await fetch(`${BASE}/summary`);
  if (!res.ok) throw new Error('获取统计数据失败');
  return res.json();
}

export async function updateCommunity(id, data) {
  const res = await fetch(`${BASE}/communities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新数据失败');
  return res.json();
}

export async function fetchWeather() {
  const res = await fetch(`${BASE}/weather`);
  if (!res.ok) throw new Error('获取天气数据失败');
  return res.json();
}

export async function fetchPrediction(temperature) {
  const res = await fetch(`${BASE}/predict?temperature=${temperature}`);
  if (!res.ok) throw new Error('获取预测数据失败');
  return res.json();
}

export async function fetchTomorrowPrediction() {
  const res = await fetch(`${BASE}/predict/tomorrow`);
  if (!res.ok) throw new Error('获取明日预测数据失败');
  return res.json();
}

export async function fetchReport(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const res = await fetch(`${BASE}/report?${params}`);
  if (!res.ok) throw new Error('获取报表数据失败');
  return res.json();
}
