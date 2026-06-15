import React from 'react';

const cards = [
  { key: 'totalGas', label: '总耗气量', unit: 'm³', color: '#e74c3c' },
  { key: 'totalElectricity', label: '总耗电量', unit: 'kWh', color: '#f39c12' },
  { key: 'totalWater', label: '总耗水量', unit: 't', color: '#3498db' },
  { key: 'avgUnitAreaGas', label: '平均单位面积耗气量', unit: 'm³/m²', color: '#e74c3c' },
  { key: 'avgUnitAreaElectricity', label: '平均单位面积耗电量', unit: 'kWh/m²', color: '#f39c12' },
  { key: 'avgUnitAreaWater', label: '平均单位面积耗水量', unit: 't/m²', color: '#3498db' },
];

export default function Dashboard({ summary }) {
  if (!summary) return null;
  return (
    <div className="dashboard">
      {cards.map(c => (
        <div className="card" key={c.key} style={{ borderLeftColor: c.color }}>
          <div className="card-label">{c.label}</div>
          <div className="card-value">{Number(summary[c.key]).toLocaleString()}</div>
          <div className="card-unit">{c.unit}</div>
        </div>
      ))}
    </div>
  );
}
