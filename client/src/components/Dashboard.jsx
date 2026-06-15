import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { isGasHeated } from './DataValidator';

const cards = [
  { key: 'totalGas', label: '总耗气量', unit: 'm³', color: '#e74c3c' },
  { key: 'totalElectricity', label: '总耗电量', unit: 'kWh', color: '#f39c12' },
  { key: 'totalWater', label: '总耗水量', unit: 't', color: '#3498db' },
  { key: 'avgUnitAreaGas', label: '平均单位面积耗气量', unit: 'm³/m²', color: '#e74c3c' },
  { key: 'avgUnitAreaElectricity', label: '平均单位面积耗电量', unit: 'kWh/m²', color: '#f39c12' },
  { key: 'avgUnitAreaWater', label: '平均单位面积耗水量', unit: 't/m²', color: '#3498db' },
];

const SECTION_COLORS = { A: '#e74c3c', B: '#f39c12', C: '#2ecc71', D: '#3498db', E: '#9b59b6', F: '#1abc9c' };
const PIE_COLORS = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c'];

export default function Dashboard({ summary, communities }) {
  if (!summary) return null;

  const sectionSummary = useMemo(() => {
    if (!communities) return [];
    const groups = {};
    communities.forEach(c => {
      const s = c.section || '其他';
      if (!groups[s]) groups[s] = { section: s, count: 0, area: 0, gas: 0, elec: 0, water: 0, gasCount: 0 };
      groups[s].count++;
      groups[s].area += c.heatingArea;
      groups[s].gas += isGasHeated(c.name) ? (c.dailyGas || 0) : 0;
      groups[s].gasCount += isGasHeated(c.name) ? 1 : 0;
      groups[s].elec += c.dailyElectricity || 0;
      groups[s].water += c.dailyWater || 0;
    });
    return Object.values(groups);
  }, [communities]);

  return (
    <>
      <div className="dashboard">
        {cards.map(c => (
          <div className="card" key={c.key} style={{ borderLeftColor: c.color }}>
            <div className="card-label">{c.label}</div>
            <div className="card-value">{summary[c.key] != null ? Number(summary[c.key]).toLocaleString() : '--'}</div>
            <div className="card-unit">{c.unit}</div>
          </div>
        ))}
      </div>

      {sectionSummary.length > 0 && (
        <div className="section-summary">
          <h3>标段概况</h3>
          <div className="section-grid">
            {sectionSummary.map(s => (
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
          <div className="charts-grid" style={{ marginTop: 16 }}>
            <div className="chart-box">
              <h4>各标段供暖面积</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sectionSummary.map(s => ({ section: s.section, 面积: Number((s.area / 10000).toFixed(2)) }))} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="section" />
                  <YAxis unit="万m²" />
                  <Tooltip formatter={(v) => [v + ' 万m²', '面积']} />
                  <Bar dataKey="面积" name="面积">
                    {sectionSummary.map(s => <Cell key={s.section} fill={SECTION_COLORS[s.section] || '#888'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box">
              <h4>各标段小区数</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sectionSummary} dataKey="count" nameKey="section" cx="50%" cy="50%" outerRadius={100} label={({ section, count }) => `${section}:${count}`}>
                    {sectionSummary.map(s => <Cell key={s.section} fill={SECTION_COLORS[s.section] || '#888'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
