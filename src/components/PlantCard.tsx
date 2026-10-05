import { Link } from 'react-router-dom'
import { coverPhoto, type Plant } from '../db/types'
import { BlobImage } from './BlobImage'
import { IdStatusBadge } from './Badges'

/** Home grid card — shows only the Chinese name; other names live on the detail page. */
export function PlantCard({ plant, typeName }: { plant: Plant; typeName: string | undefined }) {
  return (
    <Link to={`/plant/${plant.id}`} className="plant-card">
      <div className="plant-card-photo">
        <BlobImage blob={coverPhoto(plant)?.blob} alt={plant.name} />
        {plant.favorite && <span className="plant-card-fav">⭐</span>}
      </div>
      <div className="plant-card-body">
        <div className="plant-card-name">{plant.name || '（未命名）'}</div>
        <div className="plant-card-meta">
          <span>{typeName ?? '未分類'}</span>
          <IdStatusBadge status={plant.idStatus} />
        </div>
      </div>
    </Link>
  )
}
