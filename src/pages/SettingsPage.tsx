import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { optionsRepo } from '../db/optionsRepo'
import { plantsRepo } from '../db/plantsRepo'
import { OPTION_LIST_LABELS, type OptionItem, type OptionListKey } from '../db/types'
import { TopBar } from '../components/TopBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Toast } from '../components/Toast'
import { downloadJson, exportToJson, importFromJson, type ImportMode, type ImportResult } from '../utils/exportImport'

function OptionListEditor({ listKey, options, plantsUsing }: { listKey: OptionListKey; options: OptionItem[]; plantsUsing: (id: string) => number }) {
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<OptionItem | null>(null)

  async function add() {
    const name = draft.trim()
    if (!name) return
    await optionsRepo.findOrCreate(listKey, name)
    setDraft('')
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await plantsRepo.detachOption(pendingDelete.id)
    await optionsRepo.remove(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <section className="form-card">
      <h2 className="form-card-title">{OPTION_LIST_LABELS[listKey]}</h2>
      {options.map((o, i) => (
        <div className="option-row" key={o.id}>
          <input
            defaultValue={o.name}
            aria-label={`${OPTION_LIST_LABELS[listKey]}名稱`}
            onBlur={(e) => {
              const name = e.target.value.trim()
              if (name && name !== o.name) optionsRepo.rename(o.id, name)
              else e.target.value = o.name
            }}
          />
          <span className="hint" style={{ margin: 0 }}>
            {plantsUsing(o.id) || ''}
          </span>
          <button className="icon-btn" aria-label="上移" disabled={i === 0} onClick={() => optionsRepo.move(o.id, -1)}>
            ↑
          </button>
          <button className="icon-btn" aria-label="下移" disabled={i === options.length - 1} onClick={() => optionsRepo.move(o.id, 1)}>
            ↓
          </button>
          <button className="icon-btn" aria-label="刪除" onClick={() => setPendingDelete(o)}>
            🗑
          </button>
        </div>
      ))}
      <div className="add-row">
        <input value={draft} placeholder="新增選項" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-primary" onClick={add} disabled={!draft.trim()}>
          新增
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="刪除選項"
          message={
            plantsUsing(pendingDelete.id)
              ? `「${pendingDelete.name}」目前有 ${plantsUsing(pendingDelete.id)} 筆植物使用，刪除後這些植物會移除這個選項（植物本身不會被刪除）。`
              : `確定刪除「${pendingDelete.name}」？`
          }
          confirmLabel="刪除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}

function describeImport(result: ImportResult): string {
  if (result.kind === 'backup') return `已匯入 ${result.plantCount} 筆植物`
  const skipped = result.skipped.length ? `，略過已存在的 ${result.skipped.length} 筆（${result.skipped.join('、')}）` : ''
  return `已新增 ${result.added} 筆 AI 查詢資料${skipped}`
}

export function SettingsPage() {
  const plants = useLiveQuery(() => db.plants.toArray(), [])
  const options = useLiveQuery(() => db.options.orderBy('order').toArray(), [])
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [pendingFile, setPendingFile] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const usage = new Map<string, number>()
  for (const p of plants ?? []) {
    for (const id of [p.typeId, ...p.environmentIds]) if (id) usage.set(id, (usage.get(id) ?? 0) + 1)
  }
  const plantsUsing = (id: string) => usage.get(id) ?? 0

  const stats = [
    { label: '全部', value: plants?.length ?? 0 },
    { label: '已確認', value: plants?.filter((p) => p.idStatus === 'confirmed').length ?? 0 },
    { label: '熟悉', value: plants?.filter((p) => p.familiarity === 'familiar').length ?? 0 },
    { label: '不熟悉', value: plants?.filter((p) => p.familiarity === 'unfamiliar').length ?? 0 },
  ]

  async function handleExport() {
    setBusy(true)
    try {
      downloadJson(await exportToJson())
      setToast('已匯出備份檔')
    } finally {
      setBusy(false)
    }
  }

  async function runImport(json: string) {
    setPendingFile(null)
    setBusy(true)
    try {
      setToast(describeImport(await importFromJson(json, importMode)))
    } catch (e) {
      setToast(`匯入失敗：${e instanceof Error ? e.message : '檔案格式不正確'}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const json = await file.text()
    if (importMode === 'replace') setPendingFile(json)
    else runImport(json)
  }

  return (
    <>
      <TopBar title="設定" />
      <main className="page-content">
        <section className="form-card">
          <div className="stat-row">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="stat-num">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="section-title">選項清單</div>
        {(Object.keys(OPTION_LIST_LABELS) as OptionListKey[]).map((key) => (
          <OptionListEditor key={key} listKey={key} options={(options ?? []).filter((o) => o.listKey === key)} plantsUsing={plantsUsing} />
        ))}

        <div className="section-title">備份與匯入</div>
        <section className="form-card">
          <button className="btn btn-primary" onClick={handleExport} disabled={busy}>
            ⬇️ 匯出 JSON 備份（含照片）
          </button>
          <p className="hint">資料只存在這支手機的瀏覽器裡。換手機、清除瀏覽器資料前，請先匯出備份。</p>
        </section>

        <section className="form-card">
          <span className="field-label">匯入方式</span>
          <div className="segmented" style={{ marginBottom: 10 }}>
            <button className={importMode === 'merge' ? 'active' : ''} onClick={() => setImportMode('merge')}>
              合併（保留現有資料）
            </button>
            <button className={importMode === 'replace' ? 'active' : ''} onClick={() => setImportMode('replace')}>
              覆蓋（清空後匯入）
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            ⬆️ 選擇 JSON 檔匯入
          </button>
          <p className="hint">
            可匯入 App 匯出的備份檔，或 /plant 批次查詢產生的 JSON 檔（只會新增，同名植物會略過）。
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
        </section>

        <p className="hint" style={{ textAlign: 'center', marginTop: 20 }}>
          拈花惹草 v{__APP_VERSION__}
        </p>
      </main>

      {pendingFile && (
        <ConfirmDialog
          title="覆蓋所有資料？"
          message="匯入備份檔會先清空目前所有植物與選項，無法復原。（若是 /plant 產生的檔案則只會新增，不會清空）"
          confirmLabel="覆蓋匯入"
          danger
          onConfirm={() => runImport(pendingFile)}
          onCancel={() => setPendingFile(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
