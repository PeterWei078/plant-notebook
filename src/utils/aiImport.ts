import { optionsRepo } from '../db/optionsRepo'
import { KEY_FEATURE_COUNT, type IdStatus, type Plant, type SourceLink } from '../db/types'
import { sanitizeMonths } from './months'

/**
 * Plant data produced by the `/plant` Claude Code skill (.claude/skills/plant/SKILL.md).
 * Keep this shape in sync with the skill's output spec.
 */
export interface AiPlant {
  name: string
  scientificName?: string
  family?: string
  aliases?: string | string[]
  englishName?: string
  plantType?: string
  environments?: string[]
  keyFeatures?: string[]
  floweringMonths?: unknown[]
  fruitingMonths?: unknown[]
  cautions?: string
  notes?: string
  sources?: SourceLink[]
  idStatus?: IdStatus
}

export const AI_FORMAT = 'plant-notebook/ai'

/** Accepts `{format, plants:[...]}`, a bare array, or a single plant object — optionally wrapped in other text. */
export function parseAiText(text: string): AiPlant[] {
  const parsed = parseLooseJson(text)
  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { plants?: unknown }).plants)
      ? (parsed as { plants: unknown[] }).plants
      : [parsed]
  const plants = list.filter(
    (p): p is AiPlant => !!p && typeof p === 'object' && typeof (p as AiPlant).name === 'string' && !!(p as AiPlant).name.trim(),
  )
  if (!plants.length) throw new Error('找不到植物資料（需要含有 name 欄位）')
  return plants
}

function parseLooseJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // Tolerate surrounding prose or a ```json fence.
    const starts = [trimmed.indexOf('{'), trimmed.indexOf('[')].filter((i) => i >= 0)
    if (!starts.length) throw new Error('內容不是 JSON 格式')
    const start = Math.min(...starts)
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      throw new Error('內容不是 JSON 格式')
    }
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/**
 * Convert AI data into plant fields. Option names are matched against the user's lists;
 * names not yet in a list are added to it so nothing the skill found is silently dropped.
 * Only fields the AI actually filled are returned, so merging never blanks existing input.
 */
export async function aiPlantToFields(ai: AiPlant): Promise<Partial<Plant>> {
  const fields: Partial<Plant> = {}
  const setText = (key: 'name' | 'scientificName' | 'family' | 'englishName' | 'cautions' | 'notes', value: unknown) => {
    const v = str(value)
    if (v) fields[key] = v
  }
  setText('name', ai.name)
  setText('scientificName', ai.scientificName)
  setText('family', ai.family)
  setText('englishName', ai.englishName)
  setText('cautions', ai.cautions)
  setText('notes', ai.notes)

  const aliases = Array.isArray(ai.aliases) ? ai.aliases.map(str).filter(Boolean).join('、') : str(ai.aliases)
  if (aliases) fields.aliases = aliases

  const plantType = str(ai.plantType)
  if (plantType) fields.typeId = (await optionsRepo.findOrCreate('plantType', plantType)).id

  const envNames = (Array.isArray(ai.environments) ? ai.environments : []).map(str).filter(Boolean)
  if (envNames.length) {
    const ids: string[] = []
    for (const name of envNames) ids.push((await optionsRepo.findOrCreate('environment', name)).id)
    fields.environmentIds = [...new Set(ids)]
  }

  const features = (Array.isArray(ai.keyFeatures) ? ai.keyFeatures : []).map(str).filter(Boolean)
  if (features.length) {
    const padded = features.slice(0, KEY_FEATURE_COUNT)
    while (padded.length < KEY_FEATURE_COUNT) padded.push('')
    fields.keyFeatures = padded
  }

  const flowering = sanitizeMonths(ai.floweringMonths)
  if (flowering.length) fields.floweringMonths = flowering
  const fruiting = sanitizeMonths(ai.fruitingMonths)
  if (fruiting.length) fields.fruitingMonths = fruiting

  const sources = (Array.isArray(ai.sources) ? ai.sources : [])
    .map((s) => ({ title: str(s?.title), url: str(s?.url) }))
    .filter((s) => /^https?:\/\//.test(s.url))
  if (sources.length) fields.sources = sources

  // AI results are never treated as confirmed — the user verifies them first.
  fields.idStatus = ai.idStatus === 'pending' ? 'pending' : 'tentative'
  return fields
}
