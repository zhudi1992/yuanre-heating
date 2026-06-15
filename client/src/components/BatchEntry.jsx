import React, { useState, useRef } from 'react';
import { updateCommunity } from '../api';
import { validateEntry } from './DataValidator';

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return { error: '数据行不足' };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  });
  return { headers, rows };
}

export default function BatchEntry({ communities, onDataChange }) {
  const [data, setData] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const nameMap = {};
  communities.forEach(c => { nameMap[c.name] = c.id; nameMap[c.name.replace(/\s/g, '')] = c.id; });

  function handleFile(file) {
    if (!file) return;
    setMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const result = parseCSV(text);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      const { rows } = result;
      const entries = rows.map((r, i) => {
        const name = r['小区名称'] || r['名称'] || r['name'] || '';
        const id = nameMap[name] || null;
        return {
          row: i + 1, name,
          id, matched: !!id,
          heatingArea: Number(r['供暖面积'] || r['heatingArea'] || 0),
          dailyGas: Number(r['日耗气量'] || r['dailyGas'] || 0),
          dailyElectricity: Number(r['日耗电量'] || r['dailyElectricity'] || 0),
          dailyWater: Number(r['日耗水量'] || r['dailyWater'] || 0),
        };
      });
      setParsedRows(entries);
      setData(result);
      const ws = entries.map(e => ({
        row: e.row, name: e.name,
        warnings: e.id ? validateEntry({ ...e, date }, communities) : [{ type: 'error', msg: `未匹配到小区"${e.name}"` }],
      }));
      setWarnings(ws);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleSave() {
    const hasError = warnings.some(w => w.warnings.some(x => x.type === 'error'));
    if (hasError) {
      setMessage({ type: 'error', text: '存在严重异常，请修正后再保存' });
      return;
    }
    setSaving(true);
    let success = 0, fail = 0;
    for (const e of parsedRows) {
      if (!e.id) { fail++; continue; }
      try {
        await updateCommunity(e.id, {
          dailyGas: e.dailyGas, dailyElectricity: e.dailyElectricity,
          dailyWater: e.dailyWater, heatingArea: e.heatingArea, date,
        });
        success++;
      } catch { fail++; }
    }
    setMessage({ type: 'success', text: `批量保存完成: ${success} 成功, ${fail} 失败` });
    if (success > 0 && onDataChange) onDataChange();
    setSaving(false);
  }

  const errorCount = warnings.reduce((s, w) => s + w.warnings.filter(x => x.type === 'error').length, 0);
  const warnCount = warnings.reduce((s, w) => s + w.warnings.filter(x => x.type === 'warn').length, 0);

  return (
    <div className="batch-entry">
      <div className="be-topbar">
        <div className="form-group" style={{ margin: 0 }}>
          <label>日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="be-template">
          <span>CSV模板: 小区名称, 供暖面积, 日耗气量, 日耗电量, 日耗水量</span>
        </div>
      </div>

      <div className={`be-dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={e => handleFile(e.target.files[0])} />
        <div className="drop-icon">📂</div>
        <div className="drop-text">点击或拖拽 CSV 文件到此处</div>
        <div className="drop-hint">支持 UTF-8 编码的 CSV 文件</div>
      </div>

      {data && (
        <div className="be-preview">
          <div className="be-preview-header">
            <span>解析结果: 共 {parsedRows.length} 行</span>
            <span className={`be-badge ${errorCount > 0 ? 'has-error' : ''}`}>异常 {errorCount}</span>
            <span className={`be-badge ${warnCount > 0 ? 'has-warn' : ''}`}>警告 {warnCount}</span>
          </div>

          {warnings.some(w => w.warnings.length > 0) && (
            <div className="be-warnings">
              {warnings.filter(w => w.warnings.length > 0).slice(0, 5).map(w => (
                <div key={w.row} className="warn-list">
                  <span className="warn-row">第{w.row}行 [{w.name}]</span>
                  {w.warnings.map((x, i) => <span key={i} className={`warn-tag ${x.type}`}>{x.msg}</span>)}
                </div>
              ))}
              {warnings.filter(w => w.warnings.length > 0).length > 5 && <div className="warn-more">...还有更多</div>}
            </div>
          )}

          <div className="be-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行</th>
                  <th>小区名称</th>
                  <th>匹配</th>
                  <th>供暖面积</th>
                  <th>日耗气量</th>
                  <th>日耗电量</th>
                  <th>日耗水量</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map(e => {
                  const ws = warnings.find(w => w.row === e.row);
                  const hasError = ws?.warnings.some(x => x.type === 'error');
                  const hasWarn = ws?.warnings.some(x => x.type === 'warn');
                  return (
                    <tr key={e.row} className={hasError ? 'row-error' : hasWarn ? 'row-warn' : ''}>
                      <td>{e.row}</td>
                      <td>{e.name}</td>
                      <td>{e.matched ? '✅' : '❌'}</td>
                      <td>{e.heatingArea}</td>
                      <td>{e.dailyGas}</td>
                      <td>{e.dailyElectricity}</td>
                      <td>{e.dailyWater}</td>
                      <td>{hasError ? '异常' : hasWarn ? '警告' : '正常'}</td>
                    </tr>
                  );
                })}
                {parsedRows.length > 50 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>...仅显示前 50 行</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="be-actions">
            <button className="btn-submit" onClick={handleSave} disabled={saving || errorCount > 0}>
              {saving ? '保存中...' : `确认保存 ${parsedRows.filter(e => e.matched).length} 条`}
            </button>
            {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
