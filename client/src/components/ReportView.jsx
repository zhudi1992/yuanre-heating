import React, { useState, useEffect, useMemo } from 'react';
import { fetchReport } from '../api';
import { isGasHeated } from './DataValidator';

const SECTION_COLORS = { A: '#e74c3c', B: '#f39c12', C: '#2ecc71', D: '#3498db', E: '#9b59b6', F: '#1abc9c' };

function exportCSV(communities) {
  const headers = ['标段', '序号', '小区名称', '供暖面积(m²)', '日耗气量(m³)', '日耗电量(kWh)', '日耗水量(t)', '单位面积耗气量(m³/m²)', '单位面积耗电量(kWh/m²)', '单位面积耗水量(t/m²)', '日期'];
  const rows = communities.map((c, i) => [
    c.section || '', i + 1, c.name, c.heatingArea, c.dailyGas, c.dailyElectricity,
    c.dailyWater, c.unitAreaGas, c.unitAreaElectricity, c.unitAreaWater, c.date || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `供暖调度报表_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportView() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReport(startDate || undefined, endDate || undefined)
      .then(setReport)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleFilter(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchReport(startDate || undefined, endDate || undefined);
      setReport(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => {
    if (!report) return [];
    const groups = {};
    report.communities.forEach(c => {
      const s = c.section || '其他';
      if (!groups[s]) groups[s] = { section: s, communities: [], count: 0, gasCount: 0, area: 0, gas: 0, elec: 0, water: 0 };
      groups[s].communities.push(c);
      groups[s].count++;
      groups[s].area += c.heatingArea;
      groups[s].gas += isGasHeated(c.name) ? (c.dailyGas || 0) : 0;
      groups[s].gasCount += isGasHeated(c.name) ? 1 : 0;
      groups[s].elec += c.dailyElectricity || 0;
      groups[s].water += c.dailyWater || 0;
    });
    return Object.values(groups);
  }, [report]);

  if (loading) return <div className="loading">加载报表数据...</div>;
  if (error) return <div className="error">报表加载失败: {error}</div>;
  if (!report) return null;

  return (
    <div className="report-panel">
      <h2>报表生成</h2>

      <form className="report-filters" onSubmit={handleFilter}>
        <div className="filter-group">
          <label>开始日期</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>结束日期</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button type="submit">查询</button>
          <button type="button" className="btn-export" onClick={() => exportCSV(report.communities)} disabled={!report.communities?.length}>
          导出 CSV
        </button>
      </form>

      <div className="summary-cards">
        <div className="card" style={{ borderLeftColor: '#1a5276' }}>
          <div className="card-label">小区总数</div>
          <div className="card-value">{report.totalCommunities}</div>
          <div className="card-unit">个</div>
        </div>
        <div className="card" style={{ borderLeftColor: '#e74c3c' }}>
          <div className="card-label">总供暖面积</div>
          <div className="card-value">{report.totalArea?.toLocaleString() ?? '--'}</div>
          <div className="card-unit">m²</div>
        </div>
        <div className="card" style={{ borderLeftColor: '#f39c12' }}>
          <div className="card-label">平均单位面积耗气量</div>
          <div className="card-value">{report.avgUnitAreaGas}</div>
          <div className="card-unit">m³/m²</div>
        </div>
      </div>

      {/* 标段汇总 */}
      <div className="section-summary">
        <h3>标段汇总</h3>
        <div className="section-grid">
          {sections.map(s => (
            <div className="s-card" key={s.section} style={{ borderLeftColor: SECTION_COLORS[s.section] || '#888' }}>
              <div className="s-header">
                <span className="section-badge">{s.section}</span>
                <span className="s-count">{s.count} 个 (气 {s.gasCount})</span>
              </div>
              <div className="s-area">{(s.area / 10000).toFixed(2)} 万m²</div>
              <div className="s-detail">
                <span>气: {s.gas.toLocaleString()} m³</span>
                <span>电: {s.elec.toLocaleString()} kWh</span>
                <span>水: {s.water.toLocaleString()} t</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 按标段分组表格 */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>标段</th>
              <th>序号</th>
              <th>小区名称</th>
              <th>供暖面积 (m²)</th>
              <th>日耗气量 (m³)</th>
              <th>日耗电量 (kWh)</th>
              <th>日耗水量 (t)</th>
              <th>单位面积耗气量</th>
              <th>单位面积耗电量</th>
              <th>单位面积耗水量</th>
              <th>日期</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(s =>
              s.communities.map((c, i) => {
                const notGas = !isGasHeated(c.name);
                return (
                <tr key={c.id} style={notGas ? { opacity: 0.6 } : {}}>
                  {i === 0 && <td rowSpan={s.count}><span className="section-badge">{s.section}</span></td>}
                  <td>{i + 1}</td>
                  <td className="name-cell">{c.name}{notGas ? <span className="non-gas-tag">非天然气</span> : ''}</td>
                  <td>{c.heatingArea}</td>
                  <td>{notGas ? '--' : c.dailyGas}</td>
                  <td>{c.dailyElectricity}</td>
                  <td>{c.dailyWater}</td>
                  <td>{notGas ? '--' : c.unitAreaGas}</td>
                  <td>{c.unitAreaElectricity}</td>
                  <td>{c.unitAreaWater}</td>
                  <td>{c.date || '--'}</td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
