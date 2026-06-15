import React, { useState } from 'react';
import { updateCommunity } from '../api';
import { isGasHeated } from './DataValidator';

export default function CommunityTable({ communities, onUpdate, user }) {
  const canEdit = user?.role === 'admin' || user?.role === 'entry';
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      dailyGas: c.dailyGas,
      dailyElectricity: c.dailyElectricity,
      dailyWater: c.dailyWater,
      heatingArea: c.heatingArea,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  async function saveEdit(id) {
    setSaving(true);
    try {
      await updateCommunity(id, form);
      await onUpdate();
      setEditingId(null);
    } catch (e) {
      alert('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value === '' ? '' : Number(value) }));
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>标段</th>
            <th>小区名称</th>
            <th>供暖面积 (m&sup2;)</th>
            <th>日耗气量 (m&sup3;)</th>
            <th>日耗电量 (kWh)</th>
            <th>日耗水量 (t)</th>
            <th>单位面积耗气量 (m&sup3;/m&sup2;)</th>
            <th>单位面积耗电量 (kWh/m&sup2;)</th>
            <th>单位面积耗水量 (t/m&sup2;)</th>
              {canEdit && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {communities.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td>
              <td><span className="section-badge">{c.section || '--'}</span></td>
              <td className="name-cell">{c.name}{!isGasHeated(c.name) ? <span className="non-gas-tag">非天然气</span> : ''}</td>
              <td>
                {editingId === c.id ? (
                  <input type="number" step="0.1" value={form.heatingArea} onChange={e => handleChange('heatingArea', e.target.value)} />
                ) : c.heatingArea}
              </td>
              <td>
                {editingId === c.id ? (
                  <input type="number" step="0.1" value={form.dailyGas} onChange={e => handleChange('dailyGas', e.target.value)} />
                ) : c.dailyGas}
              </td>
              <td>
                {editingId === c.id ? (
                  <input type="number" step="0.1" value={form.dailyElectricity} onChange={e => handleChange('dailyElectricity', e.target.value)} />
                ) : c.dailyElectricity}
              </td>
              <td>
                {editingId === c.id ? (
                  <input type="number" step="0.1" value={form.dailyWater} onChange={e => handleChange('dailyWater', e.target.value)} />
                ) : c.dailyWater}
              </td>
              <td>{c.unitAreaGas}</td>
              <td>{c.unitAreaElectricity}</td>
              <td>{c.unitAreaWater}</td>
              {canEdit && (
                <td>
                  {editingId === c.id ? (
                    <span className="action-btns">
                      <button className="btn-save" onClick={() => saveEdit(c.id)} disabled={saving}>保存</button>
                      <button className="btn-cancel" onClick={cancelEdit} disabled={saving}>取消</button>
                    </span>
                  ) : (
                    <button className="btn-edit" onClick={() => startEdit(c)}>编辑</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
