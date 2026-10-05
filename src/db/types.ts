export type IdStatus = 'pending' | 'tentative' | 'confirmed'
export type Familiarity = 'untested' | 'unfamiliar' | 'okay' | 'familiar'

export const ID_STATUS_LABELS: Record<IdStatus, string> = {
  pending: '待辨識',
  tentative: '暫定',
  confirmed: '已確認',
}

export const FAMILIARITY_LABELS: Record<Familiarity, string> = {
  untested: '未測驗',
  unfamiliar: '不熟悉',
  okay: '普通',
  familiar: '熟悉',
}

export const PHOTO_LABELS = ['全株', '葉', '花', '果', '樹皮', '其他'] as const

export const MAX_PHOTOS = 3
export const KEY_FEATURE_COUNT = 3

export interface PlantPhoto {
  id: string
  blob: Blob
  label: string
}

export interface SourceLink {
  title: string
  url: string
}

export interface Observation {
  id: string
  date: string // yyyy-mm-dd
  place: string
  note: string
}

export interface Plant {
  id: string
  name: string
  scientificName: string
  family: string
  aliases: string
  englishName: string
  photos: PlantPhoto[]
  coverPhotoId: string | null
  typeId: string | null // optionItems with listKey 'plantType'
  environmentIds: string[] // optionItems with listKey 'environment'
  keyFeatures: string[] // always KEY_FEATURE_COUNT entries
  floweringMonths: number[] // 1-12
  fruitingMonths: number[] // 1-12
  idStatus: IdStatus
  familiarity: Familiarity
  sources: SourceLink[]
  observations: Observation[]
  notes: string
  cautions: string
  favorite: boolean
  lastQuizAt: number | null
  createdAt: number
  updatedAt: number
}

/**
 * User-editable option lists share one table, keyed by `listKey`.
 * Adding another customizable single/multi-select field later only needs a new key here
 * plus its defaults — no schema change.
 */
export type OptionListKey = 'plantType' | 'environment'

export const OPTION_LIST_LABELS: Record<OptionListKey, string> = {
  plantType: '植物類型',
  environment: '常見環境',
}

export interface OptionItem {
  id: string
  listKey: OptionListKey
  name: string
  order: number
}

export const DEFAULT_OPTIONS: Record<OptionListKey, string[]> = {
  plantType: ['喬木', '灌木', '草本', '藤本', '蕨類', '多肉', '水生', '竹類'],
  environment: ['路旁', '公園', '庭園', '林地', '溪邊', '海岸', '田野', '山坡', '盆栽'],
}

export function emptyPlant(): Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    scientificName: '',
    family: '',
    aliases: '',
    englishName: '',
    photos: [],
    coverPhotoId: null,
    typeId: null,
    environmentIds: [],
    keyFeatures: Array(KEY_FEATURE_COUNT).fill(''),
    floweringMonths: [],
    fruitingMonths: [],
    idStatus: 'pending',
    familiarity: 'untested',
    sources: [],
    observations: [],
    notes: '',
    cautions: '',
    favorite: false,
    lastQuizAt: null,
  }
}

/** Fill in any fields missing from older stored/imported records. */
export function normalizePlant(raw: Partial<Plant> & { id: string }): Plant {
  const base = emptyPlant()
  const now = Date.now()
  const keyFeatures = [...(raw.keyFeatures ?? [])]
  while (keyFeatures.length < KEY_FEATURE_COUNT) keyFeatures.push('')
  return {
    ...base,
    ...raw,
    keyFeatures: keyFeatures.slice(0, KEY_FEATURE_COUNT),
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  }
}

export function coverPhoto(plant: Pick<Plant, 'photos' | 'coverPhotoId'>): PlantPhoto | undefined {
  return plant.photos.find((p) => p.id === plant.coverPhotoId) ?? plant.photos[0]
}
