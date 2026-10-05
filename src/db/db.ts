import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_OPTIONS, type OptionItem, type OptionListKey, type Plant } from './types'

class AppDB extends Dexie {
  plants!: EntityTable<Plant, 'id'>
  options!: EntityTable<OptionItem, 'id'>

  constructor() {
    super('plant-notebook-db')
    // Add new versions with .upgrade() below this one; never edit a shipped version.
    this.version(1).stores({
      plants: 'id, name, typeId, *environmentIds, idStatus, familiarity, updatedAt',
      options: 'id, listKey, order',
    })
  }
}

export const db = new AppDB()

/**
 * Seeds each option list's defaults only if that list is empty. Runs in one transaction
 * because StrictMode double-invokes effects in dev; two concurrent check-then-insert calls
 * would otherwise both see an empty list and duplicate the defaults.
 */
export async function ensureDefaultOptions() {
  await db.transaction('rw', db.options, async () => {
    for (const listKey of Object.keys(DEFAULT_OPTIONS) as OptionListKey[]) {
      const count = await db.options.where('listKey').equals(listKey).count()
      if (count > 0) continue
      await db.options.bulkAdd(
        DEFAULT_OPTIONS[listKey].map((name, i) => ({
          id: `opt-${listKey}-${i}`,
          listKey,
          name,
          order: i,
        })),
      )
    }
  })
}
