import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { plantsRepo, type NewPlantInput } from '../db/plantsRepo'
import {
  emptyPlant,
  FAMILIARITY_LABELS,
  ID_STATUS_LABELS,
  normalizePlant,
  type Familiarity,
  type IdStatus,
  type Observation,
  type SourceLink,
} from '../db/types'
import { TopBarWithBack } from '../components/TopBar'
import { PhotoManager } from '../components/PhotoManager'
import { OptionChips } from '../components/OptionChips'
import { MonthPicker } from '../components/MonthPicker'
import { PasteAiDialog } from '../components/PasteAiDialog'
import { Toast } from '../components/Toast'
import { aiPlantToFields, type AiPlant } from '../utils/aiImport'
import { generateId } from '../utils/id'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PlantFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const options = useLiveQuery(() => db.options.orderBy('order').toArray(), [])
  const typeOptions = (options ?? []).filter((o) => o.listKey === 'plantType')
  const envOptions = (options ?? []).filter((o) => o.listKey === 'environment')

  const [form, setForm] = useState<NewPlantInput>(emptyPlant)
  const [loaded, setLoaded] = useState(!isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!id) return
    plantsRepo.get(id).then((plant) => {
      if (plant) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = normalizePlant(plant)
        setForm(rest)
      }
      setLoaded(true)
    })
  }, [id])

  const set = <K extends keyof NewPlantInput>(key: K, value: NewPlantInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function applyAi(ai: AiPlant) {
    const fields = await aiPlantToFields(ai)
    setForm((f) => ({ ...f, ...fields }))
    setPasteOpen(false)
    setToast('已套用 AI 查詢結果，請核對內容')
  }

  function updateSource(index: number, changes: Partial<SourceLink>) {
    set('sources', form.sources.map((s, i) => (i === index ? { ...s, ...changes } : s)))
  }

  function updateObservation(obsId: string, changes: Partial<Observation>) {
    set('observations', form.observations.map((o) => (o.id === obsId ? { ...o, ...changes } : o)))
  }

  async function handleSave() {
    if (!form.name.trim() && form.photos.length === 0) {
      setError('請至少填寫中文名稱或上傳一張照片')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    const cleaned: NewPlantInput = {
      ...form,
      name: form.name.trim(),
      coverPhotoId: form.photos.some((p) => p.id === form.coverPhotoId) ? form.coverPhotoId : (form.photos[0]?.id ?? null),
      keyFeatures: form.keyFeatures.map((k) => k.trim()),
      sources: form.sources.map((s) => ({ title: s.title.trim(), url: s.url.trim() })).filter((s) => s.url),
      observations: form.observations.filter((o) => o.place.trim() || o.note.trim() || o.date),
    }
    if (isEdit) await plantsRepo.update(id, cleaned)
    else await plantsRepo.create(cleaned)
    navigate('/')
  }

  if (!loaded) return null

  return (
    <>
      <TopBarWithBack title={isEdit ? '編輯植物' : '新增植物'} />
      <main className="page-content no-nav">
        <button type="button" className="ai-paste-btn" onClick={() => setPasteOpen(true)}>
          <span style={{ fontSize: 22 }}>✨</span>
          <span>
            貼上 AI 查詢結果
            <small>用 /plant 查好資料，一鍵填入欄位</small>
          </span>
        </button>

        {error && <div className="error-text">{error}</div>}

        <section className="form-card">
          <h2 className="form-card-title">照片（最多 3 張，可選一張當封面）</h2>
          <PhotoManager
            photos={form.photos}
            coverPhotoId={form.coverPhotoId}
            onChange={(photos, coverPhotoId) => setForm((f) => ({ ...f, photos, coverPhotoId }))}
          />
        </section>

        <section className="form-card">
          <h2 className="form-card-title">名稱</h2>
          <div className="form-field">
            <label htmlFor="name">中文名稱</label>
            <input id="name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例：九芎" />
          </div>
          <div className="form-field">
            <label htmlFor="sci">學名</label>
            <input
              id="sci"
              type="text"
              value={form.scientificName}
              onChange={(e) => set('scientificName', e.target.value)}
              placeholder="例：Lagerstroemia subcostata"
              autoCapitalize="off"
            />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="family">科名</label>
              <input id="family" type="text" value={form.family} onChange={(e) => set('family', e.target.value)} placeholder="例：千屈菜科" />
            </div>
            <div className="form-field">
              <label htmlFor="en">英文名</label>
              <input id="en" type="text" value={form.englishName} onChange={(e) => set('englishName', e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="aliases">別名</label>
            <input id="aliases" type="text" value={form.aliases} onChange={(e) => set('aliases', e.target.value)} placeholder="多個請用「、」分隔" />
          </div>
        </section>

        <section className="form-card">
          <h2 className="form-card-title">分類與辨識</h2>
          <div className="form-field">
            <span className="field-label">植物類型</span>
            <OptionChips listKey="plantType" options={typeOptions} value={form.typeId} onChange={(v) => set('typeId', v)} />
          </div>
          <div className="form-field">
            <span className="field-label">辨識關鍵（三個重點）</span>
            {form.keyFeatures.map((feature, i) => (
              <div className="numbered-input" key={i}>
                <span className="num">{i + 1}</span>
                <input
                  className="text-input"
                  type="text"
                  value={feature}
                  onChange={(e) => set('keyFeatures', form.keyFeatures.map((k, j) => (j === i ? e.target.value : k)))}
                  placeholder={['例：樹皮光滑、會片狀剝落', '例：葉對生', '例：夏季開白色皺褶花瓣'][i]}
                />
              </div>
            ))}
          </div>
          <div className="form-field">
            <span className="field-label">🌸 花期</span>
            <MonthPicker variant="flower" value={form.floweringMonths} onChange={(v) => set('floweringMonths', v)} />
          </div>
          <div className="form-field">
            <span className="field-label">🍒 果期</span>
            <MonthPicker variant="fruit" value={form.fruitingMonths} onChange={(v) => set('fruitingMonths', v)} />
          </div>
          <div className="form-field">
            <span className="field-label">常見環境</span>
            <OptionChips listKey="environment" options={envOptions} multiple value={form.environmentIds} onChange={(v) => set('environmentIds', v)} />
          </div>
        </section>

        <section className="form-card">
          <h2 className="form-card-title">狀態</h2>
          <div className="form-field">
            <span className="field-label">辨識狀態</span>
            <div className="segmented">
              {(Object.keys(ID_STATUS_LABELS) as IdStatus[]).map((s) => (
                <button type="button" key={s} className={form.idStatus === s ? 'active' : ''} onClick={() => set('idStatus', s)}>
                  {ID_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <span className="field-label">熟悉度（測驗後會自動更新）</span>
            <div className="segmented">
              {(Object.keys(FAMILIARITY_LABELS) as Familiarity[]).map((f) => (
                <button type="button" key={f} className={form.familiarity === f ? 'active' : ''} onClick={() => set('familiarity', f)}>
                  {FAMILIARITY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.favorite} onChange={(e) => set('favorite', e.target.checked)} />
              ⭐ 加入收藏
            </label>
          </div>
        </section>

        <section className="form-card">
          <h2 className="form-card-title">辨識依據／來源</h2>
          {form.sources.map((s, i) => (
            <div className="repeat-row" key={i}>
              <button type="button" className="row-remove" aria-label="移除" onClick={() => set('sources', form.sources.filter((_, j) => j !== i))}>
                ✕
              </button>
              <input
                className="first-input"
                type="text"
                value={s.title}
                placeholder="標題（例：TBN、Notion 筆記）"
                onChange={(e) => updateSource(i, { title: e.target.value })}
              />
              <input type="url" value={s.url} placeholder="https://…" onChange={(e) => updateSource(i, { url: e.target.value })} autoCapitalize="off" />
            </div>
          ))}
          <button type="button" className="link-btn" onClick={() => set('sources', [...form.sources, { title: '', url: '' }])}>
            ＋ 新增連結
          </button>
        </section>

        <section className="form-card">
          <h2 className="form-card-title">觀察紀錄</h2>
          {form.observations.map((o) => (
            <div className="repeat-row" key={o.id}>
              <button
                type="button"
                className="row-remove"
                aria-label="移除"
                onClick={() => set('observations', form.observations.filter((x) => x.id !== o.id))}
              >
                ✕
              </button>
              <input className="first-input" type="date" value={o.date} onChange={(e) => updateObservation(o.id, { date: e.target.value })} />
              <input type="text" value={o.place} placeholder="地點（例：大安森林公園）" onChange={(e) => updateObservation(o.id, { place: e.target.value })} />
              <input type="text" value={o.note} placeholder="備註（例：盛開中）" onChange={(e) => updateObservation(o.id, { note: e.target.value })} />
            </div>
          ))}
          <button
            type="button"
            className="link-btn"
            onClick={() => set('observations', [...form.observations, { id: generateId(), date: today(), place: '', note: '' }])}
          >
            ＋ 新增觀察紀錄
          </button>
        </section>

        <section className="form-card">
          <h2 className="form-card-title">補充</h2>
          <div className="form-field">
            <label htmlFor="cautions">⚠️ 注意事項（毒性、過敏、外來種…）</label>
            <textarea id="cautions" value={form.cautions} onChange={(e) => set('cautions', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="notes">個人筆記</label>
            <textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </section>

        <div className="sticky-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </main>

      {pasteOpen && <PasteAiDialog onApply={applyAi} onCancel={() => setPasteOpen(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
