import React, { useState } from 'react';
import { updateCommunity } from '../api';
import { validateEntry } from './DataValidator';

export default function ManualEntry({ communities, onDataChange }) {
  const [selectedId, setSelectedId] = useState(communities[0]?.id || '');
  const [form, setForm] = useState({ dailyGas: '', dailyElectricity: '', dailyWater: '', heatingArea: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [warnings, setWarnings] = useState([]);

  function handleSelect(id) {
    setSelectedId(id);
    const c = communities.find(x => x.id === Number(id));
    if (c) {
      setForm({ dailyGas: c.dailyGas, dailyElectricity: c.dailyElectricity, dailyWater: c.dailyWater, heatingArea: c.heatingArea, date: c.date || new Date().toISOString().slice(0, 10) });
      setWarnings([]);
    }
    setMessage(null);
  }

  function handleChange(field, value) {
    const updated = { ...form, [field]: value, id: selectedId };
    setForm(prev => ({ ...prev, [field]: value }));
    const ws = validateEntry({ ...updated, id: selectedId }, communities);
    setWarnings(ws);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedId) return;
    const ws = validateEntry({ ...form, id: selectedId }, communities);
    setWarnings(ws);
    if (ws.some(w => w.type === 'error')) {
      setMessage({ type: 'error', text: '存在严重异常，请修正后再保存' });
      return;
    }
    setSaving(true);
    try {
      await updateCommunity(Number(selectedId), {
        dailyGas: Number(form.dailyGas), dailyElectricity: Number(form.dailyElectricity),
        dailyWater: Number(form.dailyWater), heatingArea: Number(form.heatingArea), date: form.date,
      });
      setMessage({ type: 'success', text: '保存成功，报表已更新' });
      if (onDataChange) onDataChange();
    } catch (e) {
      setMessage({ type: 'error', text: '保存失败: ' + e.message });
    } finally {
      setSaving(false);
    }
  }

  const selectedCommunity = communities.find(c => c.id === Number(selectedId));
  const currentVals = selectedCommunity ? { dailyGas: selectedCommunity.dailyGas, dailyElectricity: selectedCommunity.dailyElectricity, dailyWater: selectedCommunity.dailyWater, heatingArea: selectedCommunity.heatingArea } : null;

  return (
    <div className="manual-entry">
      <div className="me-topbar">
        <div className="me-selector">
          <label>选择小区</label>
          <select value={selectedId} onChange={e => handleSelect(e.target.value)}>
            {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {currentVals && (
          <div className="me-current">
            <span>当前值: 气 {currentVals.dailyGas}m³ | 电 {currentVals.dailyElectricity}kWh | 水 {currentVals.dailyWater}t</span>
          </div>
        )}
      </div>

      <form className="me-form" onSubmit={handleSubmit}>
        <div className="me-grid">
          <div className="form-group">
            <label>日期</label>
            <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>供暖面积 (m²)</label>
            <input type="number" step="0.1" value={form.heatingArea} onChange={e => handleChange('heatingArea', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>日耗气量 (m³)</label>
            <input type="number" step="0.1" value={form.dailyGas} onChange={e => handleChange('dailyGas', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>日耗电量 (kWh)</label>
            <input type="number" step="0.1" value={form.dailyElectricity} onChange={e => handleChange('dailyElectricity', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>日耗水量 (t)</label>
            <input type="number" step="0.1" value={form.dailyWater} onChange={e => handleChange('dailyWater', e.target.value)} required />
          </div>
        </div>

        <div className="me-warnings">
          {warnings.map((w, i) => (
            <div key={i} className={`warn-item ${w.type}`}>{w.type === 'error' ? '⚠️' : '⚡'} {w.msg}</div>
          ))}
        </div>

        <div className="me-actions">
          <button type="submit" className="btn-submit" disabled={saving}>{saving ? '保存中...' : '保存数据'}</button>
          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
        </div>
      </form>
    </div>
  );
}
