import { db } from '../db/db'
import { plantsRepo } from '../db/plantsRepo'
import { optionsRepo } from '../db/optionsRepo'
import { emptyPlant, normalizePlant, type OptionItem, type Plant, type PlantPhoto } from '../db/types'
import { blobToDataUrl, dataUrlToBlob } from './image'
import { aiPlantToFields, parseAiText } from './aiImport'

const APP_ID = 'plant-notebook'
const SCHEMA_VERSION = 1

interface ExportedPhoto extends Omit<PlantPhoto, 'blob'> {
  dataUrl: string
}

interface ExportedPlant extends Omit<Plant, 'photos'> {
  photos: ExportedPhoto[]
}

interface ExportFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  options: OptionItem[]
  plants: ExportedPlant[]
}

export async function exportToJson(): Promise<string> {
  const [options, plants] = await Promise.all([optionsRepo.list(), plantsRepo.list()])

  const exportedPlants: ExportedPlant[] = await Promise.all(
    plants.map(async ({ photos, ...rest }) => ({
      ...rest,
      photos: await Promise.all(photos.map(async ({ blob, ...p }) => ({ ...p, dataUrl: await blobToDataUrl(blob) }))),
    })),
  )

  const payload: ExportFile = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    options,
    plants: exportedPlants,
  }
  return JSON.stringify(payload, null, 2)
}

export function downloadJson(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `拈花惹草-備份-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportMode = 'replace' | 'merge'

export type ImportResult =
  | { kind: 'backup'; plantCount: number; optionCount: number }
  | { kind: 'ai'; added: number; skipped: string[] }

function isBackupFile(parsed: unknown): parsed is ExportFile {
  const p = parsed as ExportFile
  return !!p && p.app === APP_ID && Array.isArray(p.plants) && Array.isArray(p.options)
}

/**
 * Imports either a full backup (from 匯出) or a batch file produced by the `/plant` skill.
 * Skill batches only ever add plants — names that already exist are skipped, and `mode` is ignored.
 */
export async function importFromJson(json: string, mode: ImportMode): Promise<ImportResult> {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(json)
  } catch {
    // fall through to the AI parser, which tolerates wrapped JSON
  }
  if (isBackupFile(parsed)) return importBackup(parsed, mode)
  return importAiBatch(json)
}

async function importBackup(file: ExportFile, mode: ImportMode): Promise<ImportResult> {
  if (file.schemaVersion > SCHEMA_VERSION) throw new Error('這個備份檔來自較新版本的 App，請先更新 App')

  const plants: Plant[] = await Promise.all(
    file.plants.map(async ({ photos, ...rest }) =>
      normalizePlant({
        ...rest,
        photos: await Promise.all(
          (photos ?? []).map(async ({ dataUrl, ...p }) => ({ ...p, blob: await dataUrlToBlob(dataUrl) })),
        ),
      }),
    ),
  )

  await db.transaction('rw', db.plants, db.options, async () => {
    if (mode === 'replace') {
      await optionsRepo.replaceAll(file.options)
      await plantsRepo.replaceAll(plants)
    } else {
      await optionsRepo.mergeAll(file.options)
      await plantsRepo.mergeAll(plants)
    }
  })
  return { kind: 'backup', plantCount: plants.length, optionCount: file.options.length }
}

async function importAiBatch(text: string): Promise<ImportResult> {
  const aiPlants = parseAiText(text)
  const existingNames = new Set((await plantsRepo.list()).map((p) => p.name.trim()))
  const skipped: string[] = []
  let added = 0
  await db.transaction('rw', db.plants, db.options, async () => {
    for (const ai of aiPlants) {
      const name = ai.name.trim()
      if (existingNames.has(name)) {
        skipped.push(name)
        continue
      }
      await plantsRepo.create({ ...emptyPlant(), ...(await aiPlantToFields(ai)) })
      existingNames.add(name)
      added++
    }
  })
  return { kind: 'ai', added, skipped }
}
