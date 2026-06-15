import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { fetchCommunities, fetchSummary } from './api';
import Dashboard from './components/Dashboard';
import CommunityTable from './components/CommunityTable';
import WeatherWidget from './components/WeatherWidget';
import PredictionPanel from './components/PredictionPanel';
import DataEntryPanel from './components/DataEntryPanel';
import ReportView from './components/ReportView';
import AnalysisPanel from './components/AnalysisPanel';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const NAV_ITEMS = {
  all: [
    { key: 'dashboard', label: '仪表盘', icon: '📊', roles: ['admin', 'entry', 'viewer'] },
    { key: 'analysis', label: '数据分析', icon: '📈', roles: ['admin', 'entry', 'viewer'] },
    { key: 'dataentry', label: '数据录入', icon: '📝', roles: ['admin', 'entry'] },
    { key: 'report', label: '报表', icon: '📋', roles: ['admin', 'entry', 'viewer'] },
    { key: 'prediction', label: '能耗预测', icon: '🔮', roles: ['admin', 'entry', 'viewer'] },
    { key: 'users', label: '用户管理', icon: '👤', roles: ['admin'] },
  ],
};

const PIE_COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  async function loadData() {
    try {
      setDataLoading(true);
      const [comms, summ] = await Promise.all([fetchCommunities(), fetchSummary()]);
      setCommunities(comms);
      setSummary(summ);
    } catch (e) {
      setError(e.message);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  const navItems = NAV_ITEMS.all.filter(item => item.roles.includes(user?.role));

  const top10Gas = useMemo(() => {
    if (!communities.length) return [];
    return [...communities].sort((a, b) => b.dailyGas - a.dailyGas).slice(0, 10);
  }, [communities]);

  const pieData = useMemo(() => {
    if (!communities.length) return [];
    return communities.slice(0, 8).map(c => ({ name: c.name, value: c.dailyGas }));
  }, [communities]);

  useEffect(() => {
    if (navItems.length && !navItems.find(n => n.key === activeNav)) {
      setActiveNav(navItems[0].key);
    }
  }, [user]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!user) return <LoginPage />;

  if (dataLoading) return <div className="loading">加载数据中...</div>;
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
        <div className="sidebar-user">
          <span className="user-avatar">{user.displayName?.[0] || 'U'}</span>
          {!sidebarCollapsed && (
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-role">{user.role === 'admin' ? '管理员' : user.role === 'entry' ? '录入员' : '查看员'}</span>
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.key} className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
              onClick={() => setActiveNav(item.key)}>
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={logout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">退出登录</span>}
          </button>
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
              <Dashboard summary={summary} communities={communities} />
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
              <CommunityTable communities={communities} onUpdate={loadData} user={user} />
            </>
          )}
          {activeNav === 'analysis' && <AnalysisPanel communities={communities} />}
          {activeNav === 'dataentry' && <DataEntryPanel communities={communities} onDataChange={loadData} />}
          {activeNav === 'report' && <ReportView />}
          {activeNav === 'prediction' && <PredictionPanel />}
          {activeNav === 'users' && <UserManagement />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
