import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  FAMILIARITY_LABELS,
  ID_STATUS_LABELS,
  type Familiarity,
  type IdStatus,
  type Plant,
} from '../db/types'
import { TopBar } from '../components/TopBar'
import { PlantCard } from '../components/PlantCard'
import { OptionChips } from '../components/OptionChips'
import { currentMonth } from '../utils/months'
import { useSessionState } from '../utils/sessionState'

type QuickFilter = 'all' | 'flowering' | 'fruiting' | 'favorite'
type SortKey = 'updated' | 'created' | 'name'

interface Filters {
  quick: QuickFilter
  search: string
  typeId: string | null
  environmentIds: string[]
  idStatus: IdStatus | null
  familiarity: Familiarity | null
  sort: SortKey
}

const INITIAL_FILTERS: Filters = {
  quick: 'all',
  search: '',
  typeId: null,
  environmentIds: [],
  idStatus: null,
  familiarity: null,
  sort: 'updated',
}

function matchesSearch(plant: Plant, q: string): boolean {
  const haystack = [plant.name, plant.aliases, plant.scientificName, plant.englishName, plant.family, ...plant.keyFeatures]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q.toLowerCase())
}

export function HomePage() {
  const plants = useLiveQuery(() => db.plants.toArray(), [])
  const options = useLiveQuery(() => db.options.orderBy('order').toArray(), [])
  const [filters, setFilters] = useSessionState<Filters>('home-filters', INITIAL_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const update = (changes: Partial<Filters>) => setFilters({ ...filters, ...changes })

  const typeOptions = useMemo(() => (options ?? []).filter((o) => o.listKey === 'plantType'), [options])
  const envOptions = useMemo(() => (options ?? []).filter((o) => o.listKey === 'environment'), [options])
  const typeNames = useMemo(() => new Map(typeOptions.map((o) => [o.id, o.name])), [typeOptions])

  const advancedCount =
    (filters.typeId ? 1 : 0) + (filters.environmentIds.length ? 1 : 0) + (filters.idStatus ? 1 : 0) + (filters.familiarity ? 1 : 0)

  const visible = useMemo(() => {
    if (!plants) return []
    const month = currentMonth()
    const q = filters.search.trim()
    const list = plants.filter((p) => {
      if (filters.quick === 'flowering' && !p.floweringMonths.includes(month)) return false
      if (filters.quick === 'fruiting' && !p.fruitingMonths.includes(month)) return false
      if (filters.quick === 'favorite' && !p.favorite) return false
      if (q && !matchesSearch(p, q)) return false
      if (filters.typeId && p.typeId !== filters.typeId) return false
      if (filters.environmentIds.length && !filters.environmentIds.some((e) => p.environmentIds.includes(e))) return false
      if (filters.idStatus && p.idStatus !== filters.idStatus) return false
      if (filters.familiarity && p.familiarity !== filters.familiarity) return false
      return true
    })
    return list.sort((a, b) => {
      if (filters.sort === 'name') return a.name.localeCompare(b.name, 'zh-Hant')
      if (filters.sort === 'created') return b.createdAt - a.createdAt
      return b.updatedAt - a.updatedAt
    })
  }, [plants, filters])

  const quickChips: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'flowering', label: `🌸 ${currentMonth()}月開花` },
    { key: 'fruiting', label: `🍒 ${currentMonth()}月結果` },
    { key: 'favorite', label: '⭐ 收藏' },
  ]

  return (
    <>
      <TopBar title="拈花惹草" subtitle={plants ? `${plants.length} 種` : undefined} />
      <main className="page-content">
        <div className="search-row">
          <input
            className="search-input"
            type="search"
            placeholder="搜尋名稱、別名、學名、特徵…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
          />
          <button className={`filter-btn${advancedCount ? ' active' : ''}`} onClick={() => setSheetOpen(true)}>
            篩選{advancedCount ? ` ${advancedCount}` : ''}
          </button>
        </div>

        <div className="chip-row">
          {quickChips.map((c) => (
            <button key={c.key} className={`chip${filters.quick === c.key ? ' active' : ''}`} onClick={() => update({ quick: c.key })}>
              {c.label}
            </button>
          ))}
        </div>

        {plants && plants.length > 0 && (
          <div className="list-meta">
            <span>顯示 {visible.length} 種</span>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as SortKey })} aria-label="排序">
              <option value="updated">最近編輯</option>
              <option value="created">最近新增</option>
              <option value="name">名稱</option>
            </select>
          </div>
        )}

        {plants === undefined ? null : plants.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🌼</div>
            <div>還沒有任何植物紀錄</div>
            <div>看到不認識的花草，就拍下來吧！</div>
            <Link to="/plant/new" className="btn btn-primary">
              📷 新增第一筆
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔍</div>
            <div>沒有符合條件的植物</div>
            <button className="btn btn-secondary" onClick={() => setFilters(INITIAL_FILTERS)}>
              清除所有篩選
            </button>
          </div>
        ) : (
          <div className="plant-grid">
            {visible.map((p) => (
              <PlantCard key={p.id} plant={p} typeName={p.typeId ? typeNames.get(p.typeId) : undefined} />
            ))}
          </div>
        )}
      </main>

      {sheetOpen && (
        <div className="dialog-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h2>篩選</h2>
            <div className="sheet-section">
              <span className="field-label">植物類型</span>
              <OptionChips allowAdd={false} listKey="plantType" options={typeOptions} value={filters.typeId} onChange={(typeId) => update({ typeId })} />
            </div>
            <div className="sheet-section">
              <span className="field-label">常見環境（符合任一）</span>
              <OptionChips
                allowAdd={false}
                listKey="environment"
                options={envOptions}
                multiple
                value={filters.environmentIds}
                onChange={(environmentIds) => update({ environmentIds })}
              />
            </div>
            <div className="sheet-section">
              <span className="field-label">辨識狀態</span>
              <div className="chip-wrap">
                {(Object.keys(ID_STATUS_LABELS) as IdStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`chip${filters.idStatus === s ? ' active' : ''}`}
                    onClick={() => update({ idStatus: filters.idStatus === s ? null : s })}
                  >
                    {ID_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="sheet-section">
              <span className="field-label">熟悉度</span>
              <div className="chip-wrap">
                {(Object.keys(FAMILIARITY_LABELS) as Familiarity[]).map((f) => (
                  <button
                    key={f}
                    className={`chip${filters.familiarity === f ? ' active' : ''}`}
                    onClick={() => update({ familiarity: filters.familiarity === f ? null : f })}
                  >
                    {FAMILIARITY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="btn-row">
              <button
                className="btn btn-secondary"
                onClick={() => update({ typeId: null, environmentIds: [], idStatus: null, familiarity: null })}
              >
                清除
              </button>
              <button className="btn btn-primary" onClick={() => setSheetOpen(false)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
