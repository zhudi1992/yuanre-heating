import React, { useState, useEffect, useMemo } from 'react';
import { fetchCommunities, fetchSummary } from './api';
import Dashboard from './components/Dashboard';
import CommunityTable from './components/CommunityTable';
import WeatherWidget from './components/WeatherWidget';
import PredictionPanel from './components/PredictionPanel';
import DataEntryPanel from './components/DataEntryPanel';
import ReportView from './components/ReportView';
import AnalysisPanel from './components/AnalysisPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const NAV_ITEMS = [
  { key: 'dashboard', label: '仪表盘', icon: '📊' },
  { key: 'analysis', label: '数据分析', icon: '📈' },
  { key: 'dataentry', label: '数据录入', icon: '📝' },
  { key: 'report', label: '报表', icon: '📋' },
  { key: 'prediction', label: '能耗预测', icon: '🔮' },
];

const PIE_COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

export default function App() {
  const [communities, setCommunities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [comms, summ] = await Promise.all([fetchCommunities(), fetchSummary()]);
      setCommunities(comms);
      setSummary(summ);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const top10Gas = useMemo(() => {
    if (!communities.length) return [];
    return [...communities].sort((a, b) => b.dailyGas - a.dailyGas).slice(0, 10);
  }, [communities]);

  const pieData = useMemo(() => {
    if (!communities.length) return [];
    return communities.slice(0, 8).map(c => ({ name: c.name, value: c.dailyGas }));
  }, [communities]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🔥</span>
          {!sidebarCollapsed && <span className="sidebar-title">远热调度</span>}
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
              onClick={() => setActiveNav(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!sidebarCollapsed && <span className="sidebar-version">v1.0</span>}
        </div>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <div className="header-info">
            <h1>远热公司 · 供暖调度系统</h1>
            <p>共 {summary.totalCommunities} 个小区 | 总供暖面积 {summary.totalArea?.toLocaleString()} m²</p>
          </div>
          <WeatherWidget />
        </header>

        <main className="content">
          {activeNav === 'dashboard' && (
            <>
              <Dashboard summary={summary} />
              {communities.length > 0 && (
                <div className="charts-grid">
                  <div className="chart-box">
                    <h3>耗气量 Top 10 小区</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={top10Gas} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip formatter={v => v.toLocaleString()} />
                        <Bar dataKey="dailyGas" fill="#e74c3c" name="日耗气量 (m³)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-box">
                    <h3>耗气量分布 (Top 8)</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}:${value}`}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => v.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <CommunityTable communities={communities} onUpdate={loadData} />
            </>
          )}
          {activeNav === 'analysis' && <AnalysisPanel communities={communities} />}
          {activeNav === 'dataentry' && <DataEntryPanel communities={communities} onDataChange={loadData} />}
          {activeNav === 'report' && <ReportView />}
          {activeNav === 'prediction' && <PredictionPanel />}
        </main>
      </div>
    </div>
  );
}
