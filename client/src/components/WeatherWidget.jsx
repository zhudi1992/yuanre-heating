import React, { useState, useEffect } from 'react';
import { fetchWeather } from '../api';

const weatherIcons = {
  '晴': '☀️', '多云': '⛅', '阴': '☁️', '小雨': '🌦️',
  '中雨': '🌧️', '大雨': '🌧️', '雷阵雨': '⛈️', '雪': '❄️',
  '雾': '🌫️', '霾': '🌫️',
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeather()
      .then(setWeather)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="weather-card loading-card">加载天气...</div>;
  if (error) return <div className="weather-card error-card">天气数据暂不可用</div>;
  if (!weather) return null;

  const icon = weatherIcons[weather.current.desc] || '🌡️';

  return (
    <div className="weather-card">
      <div className="weather-header">
        <span className="weather-city">西安 · 实时天气</span>
        {weather.source === 'mock' && <span className="weather-mock-badge">模拟数据</span>}
      </div>
      <div className="weather-main">
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">{weather.current.temp}°C</span>
        <span className="weather-desc">{weather.current.desc}</span>
      </div>
      <div className="weather-details">
        <span>体感 {weather.current.feelsLike}°C</span>
        <span>湿度 {weather.current.humidity}%</span>
        <span>风速 {weather.current.windSpeed} km/h</span>
      </div>
      <div className="weather-forecast">
        {weather.forecast.map((d, i) => (
          <div className="forecast-day" key={d.date}>
            <span className="forecast-date">{i === 0 ? '明天' : d.date.slice(5)}</span>
            <span className="forecast-icon">{weatherIcons[d.desc] || '🌡️'}</span>
            <span className="forecast-temps">{d.minTemp}~{d.maxTemp}°C</span>
          </div>
        ))}
      </div>
    </div>
  );
}
