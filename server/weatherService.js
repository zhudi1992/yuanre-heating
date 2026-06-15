const https = require('https');

const CACHE_DURATION = 30 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function generateMockWeather() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const temps = [28, 22, 30, 24, 26, 20, 32];
  const descs = ['晴', '多云', '晴', '阴', '小雨', '多云', '晴'];
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    forecast.push({
      date: d.toISOString().slice(0, 10),
      maxTemp: temps[(now.getDate() + i) % temps.length] + 2,
      minTemp: temps[(now.getDate() + i) % temps.length] - 6,
      avgTemp: temps[(now.getDate() + i) % temps.length] - 2,
      desc: descs[(now.getDate() + i) % descs.length],
    });
  }
  return {
    current: {
      temp: temps[now.getDate() % temps.length],
      desc: descs[now.getDate() % descs.length],
      humidity: 55,
      windSpeed: 12,
      feelsLike: temps[now.getDate() % temps.length] - 1,
    },
    forecast,
    source: 'mock',
  };
}

async function getWeather() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }
  try {
    const data = await fetchJson('https://wttr.in/Xi%27an?format=j1');
    const result = {
      current: {
        temp: parseFloat(data.current_condition[0].temp_C),
        desc: data.current_condition[0].weatherDesc[0].value,
        humidity: parseFloat(data.current_condition[0].humidity),
        windSpeed: parseFloat(data.current_condition[0].windSpeedKmph),
        feelsLike: parseFloat(data.current_condition[0].FeelsLikeC),
      },
      forecast: (data.weather || []).slice(1, 4).map(d => ({
        date: d.date,
        maxTemp: parseFloat(d.maxtempC),
        minTemp: parseFloat(d.mintempC),
        avgTemp: (parseFloat(d.maxtempC) + parseFloat(d.mintempC)) / 2,
        desc: (d.hourly && d.hourly[0]) ? d.hourly[0].weatherDesc[0].value : '--',
      })),
      source: 'wttr.in',
    };
    cache = { data: result, timestamp: now };
    return result;
  } catch (e) {
    const mock = generateMockWeather();
    cache = { data: mock, timestamp: now };
    return mock;
  }
}

module.exports = { getWeather };
