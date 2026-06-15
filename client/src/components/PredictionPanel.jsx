import React, { useState, useEffect, useMemo } from 'react';
import { fetchTomorrowPrediction, fetchPrediction } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Line } from 'recharts';

export default function PredictionPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customTemp, setCustomTemp] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => { loadTomorrow(); }, []);

  async function loadTomorrow() {
    setLoading(true);
    try {
      const result = await fetchTomorrowPrediction();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomPredict() {
    const t = parseFloat(customTemp);
    if (isNaN(t)) return;
    setCustomLoading(true);
    try {
      const result = await fetchPrediction(t);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setCustomLoading(false);
    }
  }

  const top10 = useMemo(() => {
    if (!data?.predictions) return [];
    return [...data.predictions]
      .sort((a, b) => b.predictedGas - a.predictedGas)
      .slice(0, 10);
  }, [data]);

  const curveData = useMemo(() => {
    if (!data?.predictions) return [];
    const temps = [-5, 0, 5, 10, 15, 20, 25, 30, 35];
    const sample = data.predictions.slice(0, 3);
    return temps.map(t => {
      const point = { temp: t };
      sample.forEach((c, i) => {
        const hdd = Math.max(0, 18 - t);
        const coeff = data?.model?.coefficients?.find(x => x.key === 'gas')?.value || 0.0041;
        point[`c${i}`] = Number((c.dailyGas + coeff * hdd * c.heatingArea).toFixed(0));
      });
      return point;
    });
  }, [data]);

  if (loading) return <div className="loading">加载预测数据...</div>;
  if (error) return <div className="error">预测数据加载失败: {error}</div>;
  if (!data) return null;

  const { model, input, summary, predictions, forecastDate } = data;
  const needHeating = input.forecastHDD > 0;
  const heatingAdded = summary.totalGas - predictions.reduce((s, c) => s + c.dailyGas, 0);

  return (
    <div className="prediction-panel">
      <div className="prediction-header">
        <h2>能耗预测</h2>
        {forecastDate && <span className="forecast-label">📅 {forecastDate} 预报</span>}
      </div>

      <div className="prediction-controls">
        <div className="temp-compare">
          <div className="temp-group">
            <div className="temp-badge current">当前 {input.currentTemp}°C</div>
            <div className="temp-sub">HDD = {input.currentHDD}</div>
          </div>
          <span className="temp-arrow">→</span>
          <div className="temp-group">
            <div className="temp-badge forecast">预报 {input.forecastTemp}°C</div>
            <div className="temp-sub">HDD = {input.forecastHDD}</div>
          </div>
          <div className="temp-diff-box">
            <span className="temp-diff-label">HDD 增量</span>
            <span className="temp-diff-value">+{input.hddDelta}</span>
          </div>
        </div>
        <div className="custom-temp">
          <input type="number" step="1" placeholder="输入温度试算..."
            value={customTemp} onChange={e => setCustomTemp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomPredict()} />
          <button onClick={handleCustomPredict} disabled={customLoading || !customTemp}>试算</button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="card" style={{ borderLeftColor: '#e74c3c' }}>
          <div className="card-label">预测总耗气量</div>
          <div className="card-value">{summary.totalGas.toLocaleString()}</div>
          <div className="card-unit">
            m³  <span className="confidence-range">({summary.totalGasConfidenceLow?.toLocaleString()} ~ {summary.totalGasConfidenceHigh?.toLocaleString()})</span>
          </div>
        </div>
        <div className="card" style={{ borderLeftColor: '#f39c12' }}>
          <div className="card-label">预测总耗电量</div>
          <div className="card-value">{summary.totalElectricity.toLocaleString()}</div>
          <div className="card-unit">
            kWh <span className="confidence-range">({summary.totalElecConfidenceLow?.toLocaleString()} ~ {summary.totalElecConfidenceHigh?.toLocaleString()})</span>
          </div>
        </div>
        <div className="card" style={{ borderLeftColor: '#3498db' }}>
          <div className="card-label">预测总耗水量</div>
          <div className="card-value">{summary.totalWater.toLocaleString()}</div>
          <div className="card-unit">
            t <span className="confidence-range">({summary.totalWaterConfidenceLow?.toLocaleString()} ~ {summary.totalWaterConfidenceHigh?.toLocaleString()})</span>
          </div>
        </div>
        {heatingAdded > 0 && (
          <div className="card" style={{ borderLeftColor: '#8e44ad' }}>
            <div className="card-label">其中供暖新增</div>
            <div className="card-value">{Number(heatingAdded).toLocaleString()}</div>
            <div className="card-unit">m³ (纯供暖负荷)</div>
          </div>
        )}
      </div>

      {!needHeating && (
        <div className="info-banner">
          🌡️ 预报温度 ≥ {model.baseTemperature}°C，无需供暖，预测值 = 基准负荷（当前数据）
        </div>
      )}

      <div className="model-toggle">
        <button className="model-btn" onClick={() => setShowModel(!showModel)}>
          {showModel ? '收起' : '查看'}预测模型参数
        </button>
      </div>

      {showModel && (
        <div className="model-detail">
          <div className="model-header">
            <span className="model-name">{model.name}</span>
            <span className="model-ref">{model.reference}</span>
          </div>
          <div className="model-desc">{model.description}</div>

          <div className="calib-section">
            <h4>标定依据</h4>
            <div className="calib-grid">
              <div className="calib-item"><span>采暖季</span><strong>{model.heatingSeason}</strong></div>
              <div className="calib-item"><span>采暖天数</span><strong>{model.calibration.heatingDays} 天</strong></div>
              <div className="calib-item"><span>热负荷范围</span><strong>{model.calibration.heatLoadRange}</strong></div>
              <div className="calib-item"><span>季节总 HDD</span><strong>{model.calibration.seasonTotalHDD}</strong></div>
              <div className="calib-item"><span>日均 HDD</span><strong>{model.calibration.avgDailyHDD}</strong></div>
              <div className="calib-item"><span>热值换算</span><strong>{model.calibration.heatToGas}</strong></div>
            </div>
          </div>

          <div className="model-formula">
            <code>HDD = max(0, {model.baseTemperature} - T)</code><br />
            <code>预测值 = 基准负荷 + 系数 × HDD × 供暖面积</code>
          </div>

          <div className="coeff-grid">
            {model.coefficients.map(coeff => (
              <div key={coeff.key} className="coeff-card">
                <div className="coeff-label">{coeff.label}</div>
                <div className="coeff-value">{coeff.value} <small>{coeff.unit}</small></div>
                <div className="coeff-source">{coeff.source}</div>
                <div className="coeff-uncertainty">不确定度 {coeff.uncertainty}</div>
              </div>
            ))}
          </div>

          <div className="model-ref-note">
            参考标准：{model.reference} | 数据来源：{model.dataSource}
          </div>
        </div>
      )}

      <div className="chart-section">
        <h3>温度-能耗关系曲线 (前三大小区示例)</h3>
        <div className="chart-subtitle">横轴: 室外温度 | 纵轴: 预测日耗气量 (m³)</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={curveData} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="temp" tick={{ fontSize: 12 }} label={{ value: '温度 (°C)', position: 'insideBottomRight', offset: -5 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Legend />
            {data.predictions.slice(0, 3).map((c, i) => (
              <Bar key={c.id} dataKey={`c${i}`} name={c.name} fill={['#e74c3c', '#f39c12', '#3498db'][i]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h3>Top 10 小区预测耗气量 (含置信区间)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={top10} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Legend />
            <Bar dataKey="predictedGas" fill="#e74c3c" name="预测耗气量 (m³)" />
            <Bar dataKey="gasConfidenceHigh" fill="#f5b7b1" name="置信上限" />
            <Bar dataKey="gasConfidenceLow" fill="#fadbd8" name="置信下限" />
            <Bar dataKey="dailyGas" fill="#95a5a6" name="当前耗气量 (m³)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>小区名称</th>
              <th>供暖面积</th>
              <th>当前耗气量</th>
              <th>供暖新增</th>
              <th>预测耗气量</th>
              <th>置信区间 (低~高)</th>
              <th>预测耗电量</th>
              <th>预测耗水量</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td className="name-cell">{c.name}</td>
                <td>{c.heatingArea}</td>
                <td>{c.dailyGas}</td>
                <td style={{ color: c.heatingGasAdded > 0 ? '#8e44ad' : '#aaa' }}>
                  {c.heatingGasAdded > 0 ? `+${c.heatingGasAdded}` : '--'}
                </td>
                <td className="predicted-value">{c.predictedGas}</td>
                <td style={{ fontSize: 11, color: '#888' }}>{c.gasConfidenceLow} ~ {c.gasConfidenceHigh}</td>
                <td>{c.predictedElectricity}</td>
                <td>{c.predictedWater}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
