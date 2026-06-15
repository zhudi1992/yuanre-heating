import React, { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';

export default function ImageEntry({ onResult }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setProgress('');
  }

  async function handleRecognize() {
    if (!image) return;
    setRecognizing(true);
    setProgress('加载识别引擎...');
    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(`识别中... ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      setProgress('识别中...');
      const { data } = await worker.recognize(preview);
      setProgress('识别完成');
      const nums = data.text.match(/\d+\.?\d*/g) || [];
      const parsed = { raw: data.text, numbers: nums };
      setResult(parsed);
      if (onResult) onResult(parsed);
      await worker.terminate();
    } catch (e) {
      setProgress('识别失败: ' + e.message);
    } finally {
      setRecognizing(false);
    }
  }

  function fillField(key) {
    if (!result || !result.numbers.length) return '';
    if (key === 'dailyGas' && result.numbers[0]) return result.numbers[0];
    if (key === 'dailyElectricity' && result.numbers[1]) return result.numbers[1];
    if (key === 'dailyWater' && result.numbers[2]) return result.numbers[2];
    return '';
  }

  return (
    <div className="image-entry">
      <div className="ie-layout">
        <div className="ie-left">
          <div className={`ie-dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="表计照片" className="ie-preview-img" />
            ) : (
              <div className="ie-placeholder">
                <div className="drop-icon">📷</div>
                <div className="drop-text">点击或拖拽表计照片</div>
                <div className="drop-hint">支持 JPG / PNG</div>
              </div>
            )}
          </div>
          {image && !recognizing && (
            <button className="btn-recognize" onClick={handleRecognize}>开始识别</button>
          )}
          {recognizing && <div className="recognize-progress">{progress}</div>}
        </div>

        <div className="ie-right">
          <h4>识别结果</h4>
          {result ? (
            <div className="ie-result">
              <div className="ie-raw">
                <label>原始文本</label>
                <pre>{result.raw}</pre>
              </div>
              <div className="ie-extracted">
                <label>提取数据 (可手动修正)</label>
                <div className="ie-field">
                  <span>日耗气量 (m³)</span>
                  <input type="number" step="0.1" defaultValue={fillField('dailyGas')} id="ie-gas" />
                </div>
                <div className="ie-field">
                  <span>日耗电量 (kWh)</span>
                  <input type="number" step="0.1" defaultValue={fillField('dailyElectricity')} id="ie-elec" />
                </div>
                <div className="ie-field">
                  <span>日耗水量 (t)</span>
                  <input type="number" step="0.1" defaultValue={fillField('dailyWater')} id="ie-water" />
                </div>
              </div>
              <div className="ie-tip">
                💡 将识别结果复制到手动录入或批量录入中使用
              </div>
            </div>
          ) : (
            <div className="ie-empty">
              <p>上传表计照片后点击"开始识别"</p>
              <p>系统将自动提取表盘上的数字读数</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
