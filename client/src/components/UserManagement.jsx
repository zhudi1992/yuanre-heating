import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api';

const ROLE_LABELS = { admin: '管理员', entry: '录入员', viewer: '查看员' };
const ROLE_COLORS = { admin: '#e74c3c', entry: '#2980b9', viewer: '#888' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer', displayName: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ username: '', password: '', role: 'viewer', displayName: '' });
    setShowForm(true);
  }

  function openEdit(user) {
    setEditing(user.id);
    setForm({ username: user.username, password: '', role: user.role, displayName: user.displayName });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        const body = { displayName: form.displayName, role: form.role };
        if (form.password) body.password = form.password;
        await updateUser(editing, body);
        setMessage({ type: 'success', text: '更新成功' });
      } else {
        await createUser(form);
        setMessage({ type: 'success', text: '创建成功' });
      }
      setShowForm(false);
      loadUsers();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`确定删除用户 "${name}"？`)) return;
    try {
      await deleteUser(id);
      setMessage({ type: 'success', text: '删除成功' });
      loadUsers();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  if (loading) return <div className="loading">加载用户数据...</div>;

  return (
    <div className="um-panel">
      <div className="um-header">
        <h2>用户管理</h2>
        <button className="btn-create" onClick={openCreate}>+ 新增用户</button>
      </div>

      {message && <div className={`form-message ${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="um-form-overlay">
          <div className="um-form-card">
            <h3>{editing ? '编辑用户' : '新增用户'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>用户名</label>
                <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  disabled={!!editing} required={!editing} />
              </div>
              <div className="form-group">
                <label>{editing ? '新密码（留空不修改）' : '密码'}</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required={!editing} />
              </div>
              <div className="form-group">
                <label>显示名称</label>
                <input type="text" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="viewer">查看员</option>
                  <option value="entry">录入员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="um-form-actions">
                <button type="submit" className="btn-submit">保存</button>
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="um-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>显示名称</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>
                  <span className="role-badge" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role] }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--'}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" onClick={() => openEdit(u)}>编辑</button>
                    <button className="btn-cancel" onClick={() => handleDelete(u.id, u.displayName)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
