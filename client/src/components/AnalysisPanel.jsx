import React, { useMemo, useState } from 'react';
import { validateEntry, isGasHeated } from './DataValidator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, Legend, Cell, PieChart, Pie } from 'recharts';

const SECTION_COLORS = { A: '#e74c3c', B: '#f39c12', C: '#2ecc71', D: '#3498db', E: '#9b59b6', F: '#1abc9c' };
const PIE_COLORS = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c'];

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const std = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { min: sorted[0], max: sorted[n - 1], mean: Number(mean.toFixed(2)), median: Number(median.toFixed(2)), std: Number(std.toFixed(2)), count: n };
}

const METRICS = [
  { key: 'heatingArea', label: '供暖面积', unit: 'm²', color: '#3498db' },
  { key: 'dailyGas', label: '日耗气量', unit: 'm³', color: '#e74c3c' },
  { key: 'dailyElectricity', label: '日耗电量', unit: 'kWh', color: '#f39c12' },
  { key: 'dailyWater', label: '日耗水量', unit: 't', color: '#2ecc71' },
  { key: 'unitAreaGas', label: '单位面积耗气量', unit: 'm³/m²', color: '#e74c3c' },
  { key: 'unitAreaElectricity', label: '单位面积耗电量', unit: 'kWh/m²', color: '#f39c12' },
  { key: 'unitAreaWater', label: '单位面积耗水量', unit: 't/m²', color: '#2ecc71' },
];

const SIZE_GROUPS = [
  { label: '小型 (<8000m²)', min: 0, max: 8000 },
  { label: '中型 (8000~15000m²)', min: 8000, max: 15000 },
  { label: '大型 (>15000m²)', min: 15000, max: Infinity },
];

function getGroup(area) {
  return SIZE_GROUPS.find(g => area >= g.min && area < g.max) || SIZE_GROUPS[0];
}

export default function AnalysisPanel({ communities }) {
  const [sortField, setSortField] = useState('dailyGas');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedMetric, setSelectedMetric] = useState('dailyGas');

  const metrics = useMemo(() => {
    const result = {};
    for (const m of METRICS) {
      const isGasMetric = m.key === 'dailyGas' || m.key === 'unitAreaGas';
      const pool = isGasMetric ? communities.filter(c => isGasHeated(c.name)) : communities;
      const values = pool.map(c => Number(c[m.key])).filter(v => !isNaN(v));
      result[m.key] = values.length ? stats(values) : null;
    }
    return result;
  }, [communities]);

  const sorted = useMemo(() => {
    const isGasSort = sortField === 'dailyGas' || sortField === 'unitAreaGas';
    return [...communities].sort((a, b) => {
      if (isGasSort) {
        const aGas = isGasHeated(a.name);
        const bGas = isGasHeated(b.name);
        if (aGas !== bGas) return aGas ? -1 : 1;
      }
      const va = Number(a[sortField]) || 0;
      const vb = Number(b[sortField]) || 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [communities, sortField, sortDir]);

  const histData = useMemo(() => {
    const isGasMetric = selectedMetric === 'dailyGas' || selectedMetric === 'unitAreaGas';
    const pool = isGasMetric ? communities.filter(c => isGasHeated(c.name)) : communities;
    const vals = pool.map(c => Number(c[selectedMetric])).filter(v => !isNaN(v));
    if (!vals.length) return [];
    const m = metrics[selectedMetric];
    if (!m) return [];
    const binCount = 10;
    const binWidth = (m.max - m.min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(m.min + i * binWidth).toFixed(0)}~${(m.min + (i + 1) * binWidth).toFixed(0)}`,
      count: 0, min: m.min + i * binWidth, max: m.min + (i + 1) * binWidth,
    }));
    for (const v of vals) {
      const idx = Math.min(Math.floor((v - m.min) / binWidth), binCount - 1);
      bins[idx].count++;
    }
    return bins;
  }, [communities, selectedMetric, metrics]);

  const scatterData = useMemo(() => {
    const gas = communities.filter(c => isGasHeated(c.name)).map(c => ({
      name: c.name, area: c.heatingArea, gas: c.dailyGas, group: '天然气锅炉',
    }));
    const nonGas = communities.filter(c => !isGasHeated(c.name)).map(c => ({
      name: c.name, area: c.heatingArea, gas: c.dailyGas, group: '大网/电锅炉',
    }));
    return { gas, nonGas };
  }, [communities]);

  const groupedAnalysis = useMemo(() => {
    return SIZE_GROUPS.map(g => {
      const members = communities.filter(c => c.heatingArea >= g.min && c.heatingArea < g.max);
      if (!members.length) return { ...g, count: 0, gasCount: 0 };
      const gasMembers = members.filter(c => isGasHeated(c.name));
      const avgGas = gasMembers.length ? gasMembers.reduce((s, c) => s + c.unitAreaGas, 0) / gasMembers.length : 0;
      const avgElec = members.reduce((s, c) => s + c.unitAreaElectricity, 0) / members.length;
      const avgWater = members.reduce((s, c) => s + c.unitAreaWater, 0) / members.length;
      return { ...g, count: members.length, gasCount: gasMembers.length, avgGas: Number(avgGas.toFixed(4)), avgElec: Number(avgElec.toFixed(4)), avgWater: Number(avgWater.toFixed(4)) };
    });
  }, [communities]);

  const allWarnings = useMemo(() => {
    return communities.map(c => ({
      name: c.name,
      id: c.id,
      warnings: validateEntry(c, communities),
    })).filter(item => item.warnings.length > 0);
  }, [communities]);

  const metricInfo = METRICS.find(m => m.key === selectedMetric);

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  return (
    <div className="analysis-panel">
      <h2>数据分析</h2>

      {/* 统计概览 */}
      <section className="analysis-section">
        <h3>统计概览</h3>
        <div className="stats-grid">
          {METRICS.map(m => {
            const s = metrics[m.key];
            const isGasMetric = m.key === 'dailyGas' || m.key === 'unitAreaGas';
            if (!s) return <div className="stat-card" key={m.key} style={{ borderTopColor: m.color, opacity: 0.5 }}><div className="stat-label">{m.label}</div><div className="stat-row"><span>暂无数据</span></div></div>;
            return (
              <div className="stat-card" key={m.key} style={{ borderTopColor: m.color }}>
                <div className="stat-label">{m.label}{isGasMetric ? ' (天然气)' : ''}</div>
                <div className="stat-row"><span>均值</span><span>{s.mean}</span></div>
                <div className="stat-row"><span>中位数</span><span>{s.median}</span></div>
                <div className="stat-row"><span>标准差</span><span>{s.std}</span></div>
                <div className="stat-row"><span>范围</span><span>{s.min} ~ {s.max}</span></div>
                {isGasMetric && <div className="stat-row" style={{ color: '#888', fontSize: 11 }}><span>统计小区</span><span>{s.count} 个</span></div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* 图表分析 */}
      <section className="analysis-section">
        <h3>图表分析</h3>
        <div className="analysis-charts">
          <div className="chart-box">
            <div className="chart-header">
              <h4>分布直方图</h4>
              <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
                {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip formatter={(v, n) => [v, '小区数']} />
                <Bar dataKey="count" fill={metricInfo?.color || '#3498db'} name="小区数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
            <div className="chart-box">
              <h4>供暖面积 vs 耗气量</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" name="供暖面积" unit="m²" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="gas" name="耗气量" unit="m³" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, n) => [v.toLocaleString(), n === 'area' ? '面积' : '耗气量']} />
                  <Scatter data={scatterData.gas} fill="#e74c3c" name="天然气锅炉" />
                  <Scatter data={scatterData.nonGas} fill="#95a5a6" name="大网/电锅炉" />
                  <Legend />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
        </div>
      </section>

      {/* 分组对比 */}
      <section className="analysis-section">
        <h3>规模分组对比</h3>
        <div className="group-table-wrap">
          <table>
            <thead>
              <tr>
                <th>规模分组</th>
                <th>小区数</th>
                <th>天然气小区</th>
                <th>平均单位面积耗气量 (m³/m²)</th>
                <th>平均单位面积耗电量 (kWh/m²)</th>
                <th>平均单位面积耗水量 (t/m²)</th>
              </tr>
            </thead>
            <tbody>
              {groupedAnalysis.map(g => (
                <tr key={g.label}>
                  <td><strong>{g.label}</strong></td>
                  <td>{g.count}</td>
                  <td>{g.gasCount}</td>
                  <td>{g.avgGas || '--'}</td>
                  <td>{g.avgElec || '--'}</td>
                  <td>{g.avgWater || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 标段分析 */}
      <section className="analysis-section">
        <h3>标段对比分析</h3>
        {(() => {
          const groups = {};
          communities.forEach(c => {
            const s = c.section || '其他';
            if (!groups[s]) groups[s] = { section: s, count: 0, gasCount: 0, area: 0, gas: 0, elec: 0, water: 0, unitGasArr: [], unitElecArr: [], unitWaterArr: [] };
            groups[s].count++;
            groups[s].area += c.heatingArea;
            groups[s].gas += isGasHeated(c.name) ? (c.dailyGas || 0) : 0;
            groups[s].gasCount += isGasHeated(c.name) ? 1 : 0;
            groups[s].elec += c.dailyElectricity || 0;
            groups[s].water += c.dailyWater || 0;
            if (isGasHeated(c.name) && c.unitAreaGas) groups[s].unitGasArr.push(c.unitAreaGas);
            if (c.unitAreaElectricity) groups[s].unitElecArr.push(c.unitAreaElectricity);
            if (c.unitAreaWater) groups[s].unitWaterArr.push(c.unitAreaWater);
          });
          const sectionData = Object.values(groups);
          const avg = arr => arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(4)) : 0;
          return (
            <>
              <div className="analysis-charts">
                <div className="chart-box">
                  <h4>各标段供暖面积对比</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectionData.map(s => ({ section: s.section, 面积: Number((s.area / 10000).toFixed(2)) }))} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="section" />
                      <YAxis unit="万m²" />
                      <Tooltip formatter={(v) => [v + ' 万m²', '面积']} />
                      <Bar dataKey="面积" name="面积">
                        {sectionData.map((s, i) => <Cell key={s.section} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-box">
                  <h4>各标段小区数分布</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={sectionData} dataKey="count" nameKey="section" cx="50%" cy="50%" outerRadius={100} label={({ section, count }) => `${section}:${count}`}>
                        {sectionData.map((s, i) => <Cell key={s.section} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="group-table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>标段</th>
                      <th>小区数</th>
                      <th>天然气</th>
                      <th>总面积 (万m²)</th>
                      <th>总耗气量 (m³)</th>
                      <th>总耗电量 (kWh)</th>
                      <th>总耗水量 (t)</th>
                      <th>平均单位面积耗气量</th>
                      <th>平均单位面积耗电量</th>
                      <th>平均单位面积耗水量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionData.map(s => (
                      <tr key={s.section}>
                        <td><span className="section-badge">{s.section}</span></td>
                        <td>{s.count}</td>
                        <td>{s.gasCount}</td>
                        <td>{(s.area / 10000).toFixed(2)}</td>
                        <td>{s.gas.toLocaleString()}</td>
                        <td>{s.elec.toLocaleString()}</td>
                        <td>{s.water.toLocaleString()}</td>
                        <td>{avg(s.unitGasArr)}</td>
                        <td>{avg(s.unitElecArr)}</td>
                        <td>{avg(s.unitWaterArr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </section>

      {/* 能耗排行 */}
      <section className="analysis-section">
        <h3>能耗排行</h3>
        <div className="rank-toolbar">
          <span>排序依据：</span>
          {['dailyGas', 'dailyElectricity', 'dailyWater', 'unitAreaGas', 'unitAreaElectricity', 'unitAreaWater'].map(k => {
            const m = METRICS.find(x => x.key === k);
            return (
              <button key={k} className={`rank-btn ${sortField === k ? 'active' : ''}`} onClick={() => toggleSort(k)}>
                {m?.label || k} {sortField === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </button>
            );
          })}
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>小区名称</th>
                <th>供暖面积</th>
                <th>日耗气量</th>
                <th>日耗电量</th>
                <th>日耗水量</th>
                <th>单位面积耗气量</th>
                <th>单位面积耗电量</th>
                <th>单位面积耗水量</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const notGas = !isGasHeated(c.name);
                const isGasSort = sortField === 'dailyGas' || sortField === 'unitAreaGas';
                return (
                <tr key={c.id} style={{ opacity: notGas && isGasSort ? 0.5 : 1 }}>
                  <td>{i + 1}</td>
                  <td className="name-cell">{c.name}{notGas ? <span className="non-gas-tag">非天然气</span> : ''}</td>
                  <td>{c.heatingArea}</td>
                  <td>{c.dailyGas}</td>
                  <td>{c.dailyElectricity}</td>
                  <td>{c.dailyWater}</td>
                  <td>{c.unitAreaGas}</td>
                  <td>{c.unitAreaElectricity}</td>
                  <td>{c.unitAreaWater}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 数据异常标注 */}
      {allWarnings.length > 0 && (
        <section className="analysis-section">
          <h3>数据异常标注 <span className="badge-warn">{allWarnings.length} 个小区有异常</span></h3>
          <div className="anomaly-list">
            {allWarnings.map(item => (
              <div key={item.id} className="anomaly-item">
                <div className="anomaly-name">{item.name}</div>
                <div className="anomaly-details">
                  {item.warnings.map((w, i) => (
                    <span key={i} className={`anomaly-tag ${w.type}`}>{w.msg}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
