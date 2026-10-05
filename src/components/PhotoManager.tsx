import { useRef, useState } from 'react'
import { MAX_PHOTOS, PHOTO_LABELS, type PlantPhoto } from '../db/types'
import { compressImage } from '../utils/image'
import { generateId } from '../utils/id'
import { BlobImage } from './BlobImage'

interface PhotoManagerProps {
  photos: PlantPhoto[]
  coverPhotoId: string | null
  onChange: (photos: PlantPhoto[], coverPhotoId: string | null) => void
}

/**
 * Up to MAX_PHOTOS representative photos; one of them is the cover.
 * The file input deliberately has no `capture` attribute — on iOS that would skip the photo-library option.
 */
export function PhotoManager({ photos, coverPhotoId, onChange }: PhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const effectiveCover = photos.some((p) => p.id === coverPhotoId) ? coverPhotoId : (photos[0]?.id ?? null)
  const selected = photos.find((p) => p.id === selectedId)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    try {
      const added: PlantPhoto[] = []
      for (const file of files) {
        added.push({ id: generateId(), blob: await compressImage(file), label: '' })
      }
      const next = [...photos, ...added]
      onChange(next, effectiveCover ?? next[0].id)
      setSelectedId(added[0].id)
    } finally {
      setBusy(false)
    }
  }

  function remove(id: string) {
    const next = photos.filter((p) => p.id !== id)
    onChange(next, effectiveCover === id ? (next[0]?.id ?? null) : effectiveCover)
    if (selectedId === id) setSelectedId(null)
  }

  function setLabel(id: string, label: string) {
    onChange(
      photos.map((p) => (p.id === id ? { ...p, label: p.label === label ? '' : label } : p)),
      effectiveCover,
    )
  }

  return (
    <div>
      <div className="photo-slots">
        {photos.map((p) => (
          <div
            key={p.id}
            className={`photo-slot${p.id === effectiveCover ? ' cover' : ''}`}
            onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
          >
            <BlobImage blob={p.blob} alt={p.label || '植物照片'} />
            {p.id === effectiveCover && <span className="cover-tag">封面</span>}
            {p.label && <span className="photo-label">{p.label}</span>}
            <button
              type="button"
              className="photo-remove"
              aria-label="移除照片"
              onClick={(e) => {
                e.stopPropagation()
                remove(p.id)
              }}
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button type="button" className="photo-add" onClick={() => inputRef.current?.click()} disabled={busy}>
            <span className="plus">{busy ? '⏳' : '📷'}</span>
            <span>{busy ? '處理中…' : '拍照／選照片'}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />

      {selected ? (
        <div className="photo-editor">
          <span className="field-label">這張照片拍的是</span>
          <div className="chip-wrap">
            {PHOTO_LABELS.map((label) => (
              <button
                type="button"
                key={label}
                className={`chip${selected.label === label ? ' active' : ''}`}
                onClick={() => setLabel(selected.id, label)}
              >
                {label}
              </button>
            ))}
          </div>
          {selected.id !== effectiveCover && (
            <button type="button" className="link-btn" onClick={() => onChange(photos, selected.id)}>
              ★ 設為封面
            </button>
          )}
        </div>
      ) : (
        photos.length > 0 && <p className="hint">點選照片可標註部位（全株／葉／花／果…）或設為封面</p>
      )}
    </div>
  )
}
