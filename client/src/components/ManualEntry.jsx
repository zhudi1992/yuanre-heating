import React, { useState, useCallback } from 'react';
import { updateCommunity } from '../api';
import { validateEntry, isGasHeated } from './DataValidator';

export default function ManualEntry({ communities, onDataChange }) {
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const getVal = useCallback((c, field) => {
    const e = edits[c.id];
    if (e && e[field] !== undefined) return e[field];
    return c[field];
  }, [edits]);

  function handleChange(id, field, value) {
    setEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  }

  function getWarnings(c) {
    const vals = { id: c.id, name: c.name, heatingArea: getVal(c, 'heatingArea'), dailyGas: getVal(c, 'dailyGas'), dailyElectricity: getVal(c, 'dailyElectricity'), dailyWater: getVal(c, 'dailyWater') };
    return validateEntry(vals, communities);
  }

  function isEdited(id) {
    return edits[id] && Object.keys(edits[id]).length > 0;
  }

  async function saveAll() {
    const ids = Object.keys(edits);
    if (!ids.length) { setMessage({ type: 'warn', text: '没有需要保存的修改' }); return; }

    // Validate all edited rows
    for (const idStr of ids) {
      const id = Number(idStr);
      const c = communities.find(x => x.id === id);
      if (!c) continue;
      const vals = { ...c, ...edits[id], id, name: c.name };
      const ws = validateEntry(vals, communities);
      if (ws.some(w => w.type === 'error')) {
        setMessage({ type: 'error', text: `小区"${c.name}"存在严重异常，请修正后再保存` });
        return;
      }
    }

    setSaving(true);
    let success = 0;
    let failed = 0;
    for (const idStr of ids) {
      const id = Number(idStr);
      const ch = edits[id];
      try {
        const body = {
          date,
          heatingArea: Number(ch.heatingArea),
          dailyGas: Number(ch.dailyGas),
          dailyElectricity: Number(ch.dailyElectricity),
          dailyWater: Number(ch.dailyWater),
        };
        await updateCommunity(id, body);
        success++;
      } catch (e) {
        failed++;
      }
    }
    setSaving(false);
    setEdits({});
    if (onDataChange) onDataChange();
    setMessage({ type: failed ? 'warn' : 'success', text: failed ? `已保存 ${success} 个，${failed} 个失败` : `全部保存成功 (${success} 个)` });
  }

  function resetAll() {
    if (!Object.keys(edits).length) return;
    if (!confirm('确定放弃所有未保存的修改？')) return;
    setEdits({});
    setMessage({ type: 'info', text: '已重置所有修改' });
  }

  return (
    <div className="manual-entry">
      <div className="me-topbar">
        <div className="me-datepicker">
          <label>日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="me-actions">
          <span className="me-hint">已修改 {Object.keys(edits).length} 个小区</span>
          <button className="btn-submit" onClick={saveAll} disabled={saving || !Object.keys(edits).length}>
            {saving ? '保存中...' : '保存全部'}
          </button>
          <button className="btn-cancel" onClick={resetAll} disabled={!Object.keys(edits).length}>
            重置
          </button>
        </div>
        {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
      </div>

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
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
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {communities.map((c, i) => {
              const edited = isEdited(c.id);
              const notGas = !isGasHeated(c.name);
              const ws = edited ? getWarnings(c) : [];
              const err = ws.find(w => w.type === 'error');
              const warn = ws.find(w => w.type === 'warn');
              return (
                <tr key={c.id} className={edited ? 'row-edited' : ''}>
                  <td><span className="section-badge">{c.section}</span></td>
                  <td>{i + 1}</td>
                  <td className="name-cell">{c.name}{notGas ? <span className="non-gas-tag">非天然气</span> : ''}</td>
                  <td>
                    <input type="number" className="me-input" value={getVal(c, 'heatingArea')}
                      onChange={e => handleChange(c.id, 'heatingArea', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="me-input" value={getVal(c, 'dailyGas')}
                      onChange={e => handleChange(c.id, 'dailyGas', e.target.value)}
                      style={notGas ? { opacity: 0.4 } : {}} />
                  </td>
                  <td>
                    <input type="number" className="me-input" value={getVal(c, 'dailyElectricity')}
                      onChange={e => handleChange(c.id, 'dailyElectricity', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="me-input" value={getVal(c, 'dailyWater')}
                      onChange={e => handleChange(c.id, 'dailyWater', e.target.value)} />
                  </td>
                  <td>
                    {err && <span className="anomaly-tag error" title={err.msg}>异常</span>}
                    {warn && !err && <span className="anomaly-tag warn" title={warn.msg}>警告</span>}
                    {edited && !err && !warn && <span className="anomaly-tag" style={{ background: '#d5f5e3', color: '#27ae60' }}>已修改</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
