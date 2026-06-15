import React, { useState, useRef, useMemo } from 'react';
import { updateCommunity, importFromUrl } from '../api';
import { validateEntry, isGasHeated } from './DataValidator';

const MODES = [
  { key: 'file', label: 'CSV文件', icon: '📂' },
  { key: 'paste', label: '粘贴数据', icon: '📋' },
  { key: 'url', label: '在线表格', icon: '🌐' },
];

function normalize(s) { return s.replace(/\s+/g, '').toLowerCase(); }

function findBestMatch(rawName, communities) {
  const n = normalize(rawName);
  // 1. exact (normalized)
  let match = communities.find(c => normalize(c.name) === n);
  if (match) return match;
  // 2. name contains input
  match = communities.find(c => normalize(c.name).includes(n));
  if (match) return match;
  // 3. input contains name
  match = communities.find(c => n.includes(normalize(c.name)));
  if (match) return match;
  return null;
}

function parseRows(text, communities) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return { error: '数据行不足' };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const row = {};
    headers.forEach((h, j) => row[h] = vals[j] || '');
    return row;
  });

  const entries = rows.map((r, i) => {
    const rawName = (r['小区名称'] || r['名称'] || r['name'] || '').trim();
    const best = findBestMatch(rawName, communities);
    return {
      row: i + 1, rawName,
      id: best?.id || null,
      matchedName: best?.name || null,
      matched: !!best,
      heatingArea: Number(r['供暖面积'] || r['heatingArea'] || 0),
      dailyGas: Number(r['日耗气量'] || r['dailyGas'] || 0),
      dailyElectricity: Number(r['日耗电量'] || r['dailyElectricity'] || 0),
      dailyWater: Number(r['日耗水量'] || r['dailyWater'] || 0),
    };
  });
  return { entries };
}

export default function BatchEntry({ communities, onDataChange }) {
  const [mode, setMode] = useState('file');
  const [parsedRows, setParsedRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [urlText, setUrlText] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [manualMap, setManualMap] = useState({});
  const fileRef = useRef();

  function processEntries(entries) {
    setParsedRows(entries);
    const ws = entries.map(e => {
      if (!e.matched) return { row: e.row, name: e.rawName, warnings: [] };
      return { row: e.row, name: e.matchedName, warnings: validateEntry({ ...e, date, name: e.matchedName }, communities) };
    });
    setWarnings(ws);
  }

  function handleFile(file) {
    if (!file) return;
    setMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseRows(e.target.result, communities);
      if (result.error) { setMessage({ type: 'error', text: result.error }); return; }
      processEntries(result.entries);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handlePaste() {
    if (!pasteText.trim()) { setMessage({ type: 'error', text: '请先粘贴数据' }); return; }
    setMessage(null);
    const result = parseRows(pasteText, communities);
    if (result.error) { setMessage({ type: 'error', text: result.error }); return; }
    processEntries(result.entries);
  }

  async function handleUrlFetch() {
    if (!urlText.trim()) { setMessage({ type: 'error', text: '请输入在线表格链接' }); return; }
    setMessage(null); setLoadingUrl(true);
    try {
      const data = await importFromUrl(urlText.trim());
      const result = parseRows(data.text, communities);
      if (result.error) { setMessage({ type: 'error', text: result.error }); return; }
      processEntries(result.entries);
    } catch (e) {
      setMessage({ type: 'error', text: '获取失败: ' + e.message });
    } finally { setLoadingUrl(false); }
  }

  function getEffectiveRow(e) {
    const manual = manualMap[e.row];
    if (manual) return { ...e, id: manual.id, matchedName: manual.name, matched: true };
    return e;
  }

  async function handleSave() {
    const ready = parsedRows.map(getEffectiveRow).filter(e => e.matched);
    if (!ready.length) { setMessage({ type: 'warn', text: '没有可保存的数据' }); return; }
    setSaving(true);
    let success = 0, fail = 0;
    for (const e of ready) {
      try {
        await updateCommunity(e.id, {
          dailyGas: e.dailyGas, dailyElectricity: e.dailyElectricity,
          dailyWater: e.dailyWater, heatingArea: e.heatingArea, date,
        });
        success++;
      } catch { fail++; }
    }
    setMessage({ type: 'success', text: `保存完成: ${success} 成功, ${fail} 失败` });
    if (success > 0 && onDataChange) onDataChange();
    setSaving(false);
  }

  const matchedCount = parsedRows.map(getEffectiveRow).filter(e => e.matched).length;
  const errorCount = warnings.reduce((s, w) => s + w.warnings.filter(x => x.type === 'error').length, 0);
  const warnCount = warnings.reduce((s, w) => s + w.warnings.filter(x => x.type === 'warn').length, 0);

  return (
    <div className="batch-entry">
      <div className="be-topbar">
        <div className="form-group" style={{ margin: 0 }}>
          <label>日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="be-modes">
          {MODES.map(m => (
            <button key={m.key} className={`be-mode ${mode === m.key ? 'active' : ''}`} onClick={() => { setMode(m.key); setParsedRows([]); setWarnings([]); setManualMap({}); setMessage(null); }}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="be-hint">
        <span>格式: 小区名称, 供暖面积, 日耗气量, 日耗电量, 日耗水量 — 系统自动模糊匹配小区名称</span>
      </div>

      {mode === 'file' && (
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
      )}

      {mode === 'paste' && (
        <div className="be-paste">
          <textarea className="be-textarea"
            placeholder="从 Excel/在线表格 复制数据后粘贴到这里&#10;&#10;格式:&#10;小区名称, 供暖面积, 日耗气量, 日耗电量, 日耗水量&#10;航天动力第一生活区, 243000, 892.5, 320.4, 15.2"
            value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10} />
          <button className="btn-submit" onClick={handlePaste}>解析数据</button>
        </div>
      )}

      {mode === 'url' && (
        <div className="be-url">
          <div className="be-url-hint">
            <strong>支持以下在线表格链接：</strong>
            <ul>
              <li>腾讯文档 / 金山文档 / 飞书表格 的「导出为 CSV」分享链接</li>
              <li>Google Sheets: <code>https://docs.google.com/spreadsheets/d/xxxx/export?format=csv</code></li>
              <li>任何可直接访问的 CSV 文件直链</li>
            </ul>
          </div>
          <div className="be-url-input">
            <input type="text" placeholder="粘贴在线表格的 CSV 分享链接" value={urlText} onChange={e => setUrlText(e.target.value)} />
            <button className="btn-submit" onClick={handleUrlFetch} disabled={loadingUrl}>
              {loadingUrl ? '获取中...' : '获取数据'}
            </button>
          </div>
        </div>
      )}

      {message && <div className={`form-message ${message.type}`} style={{ marginTop: 8 }}>{message.text}</div>}

      {parsedRows.length > 0 && (
        <div className="be-preview">
          <div className="be-preview-header">
            <span>解析结果: 共 {parsedRows.length} 行，已匹配 {matchedCount} 个</span>
            <span className={`be-badge ${errorCount > 0 ? 'has-error' : ''}`}>异常 {errorCount}</span>
            <span className={`be-badge ${warnCount > 0 ? 'has-warn' : ''}`}>警告 {warnCount}</span>
          </div>

          <div className="be-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行</th>
                  <th>导入名称</th>
                  <th>匹配小区</th>
                  <th>供暖面积</th>
                  <th>日耗气量</th>
                  <th>日耗电量</th>
                  <th>日耗水量</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 100).map(e => {
                  const eff = getEffectiveRow(e);
                  const ws = warnings.find(w => w.row === e.row);
                  const hasError = ws?.warnings.some(x => x.type === 'error');
                  const hasWarn = ws?.warnings.some(x => x.type === 'warn');
                  const notGas = !isGasHeated(eff.matchedName || e.rawName);
                  return (
                    <tr key={e.row} className={!eff.matched ? 'row-unmatched' : hasError ? 'row-error' : hasWarn ? 'row-warn' : ''}>
                      <td>{e.row}</td>
                      <td>{e.rawName}</td>
                      <td>
                        {eff.matched ? (
                          <span>{eff.matchedName}{notGas ? <span className="non-gas-tag">非天然气</span> : ''}</span>
                        ) : (
                          <select className="be-map-select" value="" onChange={ev => {
                            const val = ev.target.value;
                            if (!val) {
                              const m = { ...manualMap }; delete m[e.row]; setManualMap(m);
                            } else {
                              const [id, name] = val.split('|');
                              setManualMap(p => ({ ...p, [e.row]: { id: Number(id), name } }));
                            }
                          }}>
                            <option value="">-- 请选择 --</option>
                            {communities.map(c => <option key={c.id} value={`${c.id}|${c.name}`}>{c.section} {c.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td>{e.heatingArea}</td>
                      <td style={notGas ? { opacity: 0.4 } : {}}>{e.dailyGas}</td>
                      <td>{e.dailyElectricity}</td>
                      <td>{e.dailyWater}</td>
                      <td>{!eff.matched ? '未匹配' : hasError ? '异常' : hasWarn ? '警告' : '正常'}</td>
                    </tr>
                  );
                })}
                {parsedRows.length > 100 && <tr><td colSpan={8} style={{ textAlign:'center',color:'#888' }}>...仅显示前 100 行</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="be-actions">
            <button className="btn-submit" onClick={handleSave} disabled={saving || !matchedCount}>
              {saving ? '保存中...' : `仅保存已匹配 (${matchedCount} 条)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
