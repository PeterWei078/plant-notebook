import { useState } from 'react'
import { parseAiText, type AiPlant } from '../utils/aiImport'

/** Paste the text produced by the `/plant` skill to auto-fill the form. */
export function PasteAiDialog({ onApply, onCancel }: { onApply: (plant: AiPlant) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  async function readClipboard() {
    try {
      setText(await navigator.clipboard.readText())
      setError('')
    } catch {
      setError('無法讀取剪貼簿，請長按輸入框手動貼上')
    }
  }

  function apply() {
    try {
      const plants = parseAiText(text)
      onApply(plants[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法解析內容')
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h2>貼上 AI 查詢結果</h2>
        <p>
          在 Claude Code 輸入 <b>/plant 植物名稱</b>，複製產出的 JSON 貼到下方。只會填入 AI
          有查到的欄位，照片不受影響；植物類型或環境若是新的，會自動加入選項。
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder='{"name": "九芎", ...}' />
        {error && <div className="error-text">{error}</div>}
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn btn-secondary" onClick={readClipboard}>
            📋 從剪貼簿貼上
          </button>
        </div>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-primary" onClick={apply} disabled={!text.trim()}>
            套用
          </button>
        </div>
      </div>
    </div>
  )
}
