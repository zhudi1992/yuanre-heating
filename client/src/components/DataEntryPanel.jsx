import React, { useState } from 'react';
import ManualEntry from './ManualEntry';
import BatchEntry from './BatchEntry';
import ImageEntry from './ImageEntry';

const ENTRY_MODES = [
  { key: 'manual', label: '手动录入', icon: '✏️' },
  { key: 'batch', label: '批量录入', icon: '📂' },
  { key: 'image', label: '图片识别', icon: '📷' },
];

export default function DataEntryPanel({ communities, onDataChange }) {
  const [mode, setMode] = useState('manual');

  return (
    <div className="data-entry-panel">
      <div className="dep-header">
        <h2>数据录入</h2>
        <div className="dep-tabs">
          {ENTRY_MODES.map(m => (
            <button key={m.key} className={`dep-tab ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'manual' && <ManualEntry communities={communities} onDataChange={onDataChange} />}
      {mode === 'batch' && <BatchEntry communities={communities} onDataChange={onDataChange} />}
      {mode === 'image' && <ImageEntry />}
    </div>
  );
}
