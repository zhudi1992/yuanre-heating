const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getWeather } = require('./weatherService');
const { predict } = require('./predictionService');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'communities.json');

app.use(cors());
app.use(express.json());

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

app.get('/api/communities', (req, res) => {
  const data = readData();
  const enriched = data.map(calcUnitArea);
  res.json(enriched);
});

app.get('/api/communities/:id', (req, res) => {
  const data = readData();
  const item = data.find(c => c.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '社区不存在' });
  res.json(calcUnitArea(item));
});

app.put('/api/communities/:id', (req, res) => {
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

app.get('/api/summary', (req, res) => {
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

app.get('/api/weather', async (req, res) => {
  try {
    const weather = await getWeather();
    res.json(weather);
  } catch (e) {
    res.status(500).json({ error: '获取天气数据失败' });
  }
});

app.get('/api/predict', async (req, res) => {
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

app.get('/api/predict/tomorrow', async (req, res) => {
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

app.get('/api/report', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`远热供暖调度系统后端运行中: http://localhost:${PORT}`);
});
