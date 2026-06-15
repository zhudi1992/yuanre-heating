import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔥</div>
        <h1>远热供暖调度系统</h1>
        <p className="login-subtitle">请登录</p>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="输入用户名" autoFocus />
          </div>
          <div className="login-field">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <div className="login-hints">
          <p>演示账号：</p>
          <p>管理员 admin / admin123</p>
          <p>录入员 entry / entry123</p>
          <p>查看员 viewer / viewer123</p>
        </div>
      </div>
    </div>
  );
}
