const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getWeather } = require('./weatherService');
const { predict } = require('./predictionService');
const { hashPassword, readUsers, saveUsers, generateToken, authenticate, requireRole } = require('./auth');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'communities.json');

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function calcUnitArea(item) {
  const area = Number(item.heatingArea);
  return {
    ...item,
    heatingArea: area,
    unitAreaGas: area > 0 ? Number((item.dailyGas / area).toFixed(4)) : 0,
    unitAreaElectricity: area > 0 ? Number((item.dailyElectricity / area).toFixed(4)) : 0,
    unitAreaWater: area > 0 ? Number((item.dailyWater / area).toFixed(4)) : 0,
  };
}

/* ===== 认证 ===== */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === hashPassword(password));
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, displayName: user.displayName } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/password', authenticate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请提供旧密码和新密码' });
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (users[idx].password !== hashPassword(oldPassword)) return res.status(401).json({ error: '旧密码错误' });
  users[idx].password = hashPassword(newPassword);
  saveUsers(users);
  res.json({ message: '密码修改成功' });
});

/* ===== 用户管理 (仅 admin) ===== */
app.get('/api/users', authenticate, requireRole('admin'), (req, res) => {
  const users = readUsers().map(u => ({ id: u.id, username: u.username, role: u.role, displayName: u.displayName, createdAt: u.createdAt }));
  res.json(users);
});

app.post('/api/users', authenticate, requireRole('admin'), (req, res) => {
  const { username, password, role, displayName } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: '缺少必填字段' });
  if (!['admin', 'entry', 'viewer'].includes(role)) return res.status(400).json({ error: '角色无效' });
  const users = readUsers();
  if (users.find(u => u.username === username)) return res.status(409).json({ error: '用户名已存在' });
  const newUser = {
    id: Math.max(...users.map(u => u.id)) + 1,
    username,
    password: hashPassword(password),
    role,
    displayName: displayName || username,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role, displayName: newUser.displayName });
});

app.put('/api/users/:id', authenticate, requireRole('admin'), (req, res) => {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  if (req.body.displayName) users[idx].displayName = req.body.displayName;
  if (req.body.role && ['admin', 'entry', 'viewer'].includes(req.body.role)) users[idx].role = req.body.role;
  if (req.body.password) users[idx].password = hashPassword(req.body.password);
  saveUsers(users);
  res.json({ id: users[idx].id, username: users[idx].username, role: users[idx].role, displayName: users[idx].displayName });
});

app.delete('/api/users/:id', authenticate, requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: '不能删除自己' });
  let users = readUsers();
  const idx = users.findIndex(u => u.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  users.splice(idx, 1);
  saveUsers(users);
  res.json({ message: '删除成功' });
});

/* ===== 小区数据 ===== */
app.get('/api/communities', authenticate, (req, res) => {
  const data = readData();
  const enriched = data.map(calcUnitArea);
  res.json(enriched);
});

app.get('/api/communities/:id', authenticate, (req, res) => {
  const data = readData();
  const item = data.find(c => c.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '社区不存在' });
  res.json(calcUnitArea(item));
});

app.put('/api/communities/:id', authenticate, requireRole('admin', 'entry'), (req, res) => {
  const data = readData();
  const idx = data.findIndex(c => c.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '社区不存在' });
  const { dailyGas, dailyElectricity, dailyWater, heatingArea } = req.body;
  if (dailyGas !== undefined) data[idx].dailyGas = Number(dailyGas);
  if (dailyElectricity !== undefined) data[idx].dailyElectricity = Number(dailyElectricity);
  if (dailyWater !== undefined) data[idx].dailyWater = Number(dailyWater);
  if (heatingArea !== undefined) data[idx].heatingArea = Number(heatingArea);
  if (req.body.date) data[idx].date = req.body.date;
  saveData(data);
  res.json(calcUnitArea(data[idx]));
});

app.get('/api/summary', authenticate, (req, res) => {
  const data = readData();
  const enriched = data.map(calcUnitArea);
  const totalArea = enriched.reduce((s, c) => s + c.heatingArea, 0);
  const totalGas = enriched.reduce((s, c) => s + c.dailyGas, 0);
  const totalElectricity = enriched.reduce((s, c) => s + c.dailyElectricity, 0);
  const totalWater = enriched.reduce((s, c) => s + c.dailyWater, 0);
  res.json({
    totalCommunities: enriched.length,
    totalArea,
    totalGas: Number(totalGas.toFixed(2)),
    totalElectricity: Number(totalElectricity.toFixed(2)),
    totalWater: Number(totalWater.toFixed(2)),
    avgUnitAreaGas: totalArea > 0 ? Number((totalGas / totalArea).toFixed(4)) : 0,
    avgUnitAreaElectricity: totalArea > 0 ? Number((totalElectricity / totalArea).toFixed(4)) : 0,
    avgUnitAreaWater: totalArea > 0 ? Number((totalWater / totalArea).toFixed(4)) : 0,
  });
});

app.get('/api/weather', authenticate, async (req, res) => {
  try {
    const weather = await getWeather();
    res.json(weather);
  } catch (e) {
    res.status(500).json({ error: '获取天气数据失败' });
  }
});

app.get('/api/predict', authenticate, async (req, res) => {
  try {
    const temp = parseFloat(req.query.temperature);
    if (isNaN(temp)) return res.status(400).json({ error: '请提供温度参数 (temperature)' });
    const weather = await getWeather();
    const data = readData();
    const result = predict(data, weather.current.temp, temp);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: '预测失败' });
  }
});

app.get('/api/predict/tomorrow', authenticate, async (req, res) => {
  try {
    const weather = await getWeather();
    if (!weather.forecast.length) return res.status(404).json({ error: '暂无预报数据' });
    const tomorrow = weather.forecast[0];
    const data = readData();
    const result = predict(data, weather.current.temp, tomorrow.avgTemp);
    res.json({ ...result, forecastDate: tomorrow.date, forecastDesc: tomorrow.desc });
  } catch (e) {
    res.status(500).json({ error: '获取明日预测失败' });
  }
});

app.get('/api/report', authenticate, (req, res) => {
  const data = readData();
  const { startDate, endDate } = req.query;
  let filtered = data;
  if (startDate) filtered = filtered.filter(c => c.date >= startDate);
  if (endDate) filtered = filtered.filter(c => c.date <= endDate);
  const enriched = filtered.map(calcUnitArea);
  const totals = enriched.reduce((a, c) => ({
    totalArea: a.totalArea + c.heatingArea,
    totalGas: a.totalGas + c.dailyGas,
    totalElec: a.totalElectricity + c.dailyElectricity,
    totalWater: a.totalWater + c.dailyWater,
  }), { totalArea: 0, totalGas: 0, totalElectricity: 0, totalWater: 0 });
  res.json({
    totalCommunities: enriched.length,
    totalArea: totals.totalArea,
    totalGas: Number(totals.totalGas.toFixed(2)),
    totalElectricity: Number(totals.totalElec.toFixed(2)),
    totalWater: Number(totals.totalWater.toFixed(2)),
    avgUnitAreaGas: totals.totalArea > 0 ? Number((totals.totalGas / totals.totalArea).toFixed(4)) : 0,
    avgUnitAreaElectricity: totals.totalArea > 0 ? Number((totals.totalElectricity / totals.totalArea).toFixed(4)) : 0,
    avgUnitAreaWater: totals.totalArea > 0 ? Number((totals.totalWater / totals.totalArea).toFixed(4)) : 0,
    communities: enriched,
  });
});

/* ===== 批量导入代理 ===== */
app.get('/api/import/url', authenticate, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '请提供 url 参数' });
  try {
    const https = require('https');
    const http = require('http');
    const fetcher = url.startsWith('https') ? https : http;
    fetcher.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => res.json({ text: data }));
    }).on('error', e => res.status(500).json({ error: '获取远程数据失败: ' + e.message }));
  } catch (e) {
    res.status(500).json({ error: '导入失败: ' + e.message });
  }
});

if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`远热供暖调度系统后端运行中: http://localhost:${PORT}`);
});
