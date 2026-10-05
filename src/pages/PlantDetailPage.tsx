import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { plantsRepo } from '../db/plantsRepo'
import { coverPhoto, normalizePlant, type Plant } from '../db/types'
import { TopBarWithBack } from '../components/TopBar'
import { BlobImage } from '../components/BlobImage'
import { FamiliarityBadge, IdStatusBadge } from '../components/Badges'
import { MonthBar } from '../components/MonthBar'
import { ConfirmDialog } from '../components/ConfirmDialog'

/** Cover first, then the remaining photos in their stored order. */
function orderedPhotos(plant: Plant) {
  const cover = coverPhoto(plant)
  return cover ? [cover, ...plant.photos.filter((p) => p.id !== cover.id)] : []
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function PlantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const raw = useLiveQuery(() => (id ? db.plants.get(id) : undefined), [id])
  const options = useLiveQuery(() => db.options.toArray(), [])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slide, setSlide] = useState(0)

  const plant = raw ? normalizePlant(raw) : undefined
  const optionNames = useMemo(() => new Map((options ?? []).map((o) => [o.id, o.name])), [options])

  if (raw === undefined) {
    return (
      <>
        <TopBarWithBack title="植物" />
        <main className="page-content no-nav" />
      </>
    )
  }
  if (!plant) {
    return (
      <>
        <TopBarWithBack title="找不到植物" />
        <main className="page-content no-nav">
          <div className="empty-state">這筆資料可能已被刪除</div>
        </main>
      </>
    )
  }

  const photos = orderedPhotos(plant)
  const envNames = plant.environmentIds.map((e) => optionNames.get(e)).filter(Boolean)
  const features = plant.keyFeatures.filter((k) => k.trim())
  const typeName = plant.typeId ? optionNames.get(plant.typeId) : undefined
  const nameRows: [string, string][] = (
    [
      ['科名', plant.family],
      ['別名', plant.aliases],
      ['英文名', plant.englishName],
      ['類型', typeName ?? ''],
      ['環境', envNames.join('、')],
    ] as [string, string][]
  ).filter(([, v]) => v)

  async function handleDelete() {
    await plantsRepo.remove(plant!.id)
    navigate('/', { replace: true })
  }

  return (
    <>
      <TopBarWithBack
        title={plant.name || '（未命名）'}
        action={
          <>
            <button className="icon-btn" aria-label={plant.favorite ? '取消收藏' : '加入收藏'} onClick={() => plantsRepo.toggleFavorite(plant.id)}>
              {plant.favorite ? '⭐' : '☆'}
            </button>
            <Link className="icon-btn" to={`/plant/${plant.id}/edit`} aria-label="編輯" style={{ textDecoration: 'none' }}>
              ✏️
            </Link>
          </>
        }
      />
      <main className="page-content no-nav">
        {photos.length > 0 ? (
          <>
            <div
              className="carousel"
              onScroll={(e) => {
                const el = e.currentTarget
                setSlide(Math.round(el.scrollLeft / (el.clientWidth + 8)))
              }}
            >
              {photos.map((p) => (
                <div className="carousel-item" key={p.id}>
                  <BlobImage blob={p.blob} alt={p.label || plant.name} />
                  {p.label && <span className="photo-label">{p.label}</span>}
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <div className="carousel-dots">
                {photos.map((p, i) => (
                  <span key={p.id} className={i === slide ? 'active' : ''} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="carousel-item" style={{ marginBottom: 12 }}>
            <div className="photo-placeholder">🌱</div>
          </div>
        )}

        <h2 className="detail-title">{plant.name || '（未命名）'}</h2>
        {plant.scientificName && <div className="detail-sci">{plant.scientificName}</div>}
        <div className="detail-badges">
          <IdStatusBadge status={plant.idStatus} />
          <FamiliarityBadge familiarity={plant.familiarity} />
        </div>

        {nameRows.length > 0 && (
          <section className="form-card">
            <dl className="info-table" style={{ margin: 0 }}>
              {nameRows.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {features.length > 0 && (
          <section className="form-card">
            <h3 className="form-card-title">🔍 辨識關鍵</h3>
            <ol className="key-features">
              {features.map((f, i) => (
                <li key={i}>
                  <span className="num">{i + 1}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="form-card">
          <h3 className="form-card-title">📅 花期／果期</h3>
          <MonthBar label="花期" months={plant.floweringMonths} variant="flower" />
          <div style={{ height: 8 }} />
          <MonthBar label="果期" months={plant.fruitingMonths} variant="fruit" />
        </section>

        {plant.cautions && (
          <section className="form-card">
            <h3 className="form-card-title">⚠️ 注意事項</h3>
            <div className="caution-box">{plant.cautions}</div>
          </section>
        )}

        {plant.sources.length > 0 && (
          <section className="form-card">
            <h3 className="form-card-title">🔗 辨識依據／來源</h3>
            {plant.sources.map((s, i) => (
              <a key={i} className="source-link" href={s.url} target="_blank" rel="noopener noreferrer">
                <div>
                  <div className="source-title">{s.title || hostOf(s.url)}</div>
                  <div className="source-url">{s.url}</div>
                </div>
                <span>↗</span>
              </a>
            ))}
          </section>
        )}

        {plant.observations.length > 0 && (
          <section className="form-card">
            <h3 className="form-card-title">👀 觀察紀錄</h3>
            {[...plant.observations]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((o) => (
                <div className="obs-item" key={o.id}>
                  <div className="obs-head">
                    {o.date} {o.place && `· ${o.place}`}
                  </div>
                  {o.note && <div className="obs-note">{o.note}</div>}
                </div>
              ))}
          </section>
        )}

        {plant.notes && (
          <section className="form-card">
            <h3 className="form-card-title">📝 個人筆記</h3>
            <div className="detail-value">{plant.notes}</div>
          </section>
        )}

        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={() => setConfirmDelete(true)}>
          刪除這筆植物
        </button>
      </main>

      {confirmDelete && (
        <ConfirmDialog
          title="刪除植物"
          message={`確定要刪除「${plant.name || '未命名'}」嗎？照片與所有資料都會一併刪除，無法復原。`}
          confirmLabel="刪除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
