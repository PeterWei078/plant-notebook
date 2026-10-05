import { FAMILIARITY_LABELS, ID_STATUS_LABELS, type Familiarity, type IdStatus } from '../db/types'

export function IdStatusBadge({ status }: { status: IdStatus }) {
  return <span className={`badge badge-${status}`}>{ID_STATUS_LABELS[status]}</span>
}

export function FamiliarityBadge({ familiarity }: { familiarity: Familiarity }) {
  return <span className={`badge badge-${familiarity}`}>{FAMILIARITY_LABELS[familiarity]}</span>
}
