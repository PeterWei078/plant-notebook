import { db } from './db'
import { generateId } from '../utils/id'
import type { OptionItem, OptionListKey } from './types'

export const optionsRepo = {
  async list(listKey?: OptionListKey): Promise<OptionItem[]> {
    const all = listKey ? await db.options.where('listKey').equals(listKey).toArray() : await db.options.toArray()
    return all.sort((a, b) => a.order - b.order)
  },

  async create(listKey: OptionListKey, name: string): Promise<OptionItem> {
    const existing = await db.options.where('listKey').equals(listKey).toArray()
    const maxOrder = existing.reduce((m, o) => Math.max(m, o.order), -1)
    const option: OptionItem = { id: generateId(), listKey, name, order: maxOrder + 1 }
    await db.options.add(option)
    return option
  },

  /** Returns the option with this name in the list, creating it if missing. */
  async findOrCreate(listKey: OptionListKey, name: string): Promise<OptionItem> {
    const existing = await db.options.where('listKey').equals(listKey).toArray()
    const match = existing.find((o) => o.name === name)
    return match ?? this.create(listKey, name)
  },

  async rename(id: string, name: string): Promise<void> {
    await db.options.update(id, { name })
  },

  /** Swap order with the neighbour in the given direction. */
  async move(id: string, direction: -1 | 1): Promise<void> {
    await db.transaction('rw', db.options, async () => {
      const option = await db.options.get(id)
      if (!option) return
      const siblings = (await db.options.where('listKey').equals(option.listKey).toArray()).sort(
        (a, b) => a.order - b.order,
      )
      const index = siblings.findIndex((o) => o.id === id)
      const neighbour = siblings[index + direction]
      if (!neighbour) return
      await db.options.update(option.id, { order: neighbour.order })
      await db.options.update(neighbour.id, { order: option.order })
    })
  },

  async remove(id: string): Promise<void> {
    await db.options.delete(id)
  },

  async replaceAll(options: OptionItem[]): Promise<void> {
    await db.options.clear()
    if (options.length) await db.options.bulkAdd(options)
  },

  async mergeAll(options: OptionItem[]): Promise<void> {
    if (options.length) await db.options.bulkPut(options)
  },
}
