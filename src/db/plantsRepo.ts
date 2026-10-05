import { db } from './db'
import { generateId } from '../utils/id'
import type { Familiarity, Plant } from './types'

export type NewPlantInput = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>

export const plantsRepo = {
  async list(): Promise<Plant[]> {
    return db.plants.toArray()
  },

  async get(id: string): Promise<Plant | undefined> {
    return db.plants.get(id)
  },

  async create(input: NewPlantInput): Promise<Plant> {
    const now = Date.now()
    const plant: Plant = { ...input, id: generateId(), createdAt: now, updatedAt: now }
    await db.plants.add(plant)
    return plant
  },

  async update(id: string, changes: Partial<Omit<Plant, 'id' | 'createdAt'>>): Promise<void> {
    await db.plants.update(id, { ...changes, updatedAt: Date.now() })
  },

  async toggleFavorite(id: string): Promise<void> {
    const plant = await db.plants.get(id)
    if (plant) await db.plants.update(id, { favorite: !plant.favorite })
  },

  /** Quiz results don't bump updatedAt so they don't reorder the "recently edited" list. */
  async setFamiliarity(id: string, familiarity: Familiarity): Promise<void> {
    await db.plants.update(id, { familiarity, lastQuizAt: Date.now() })
  },

  async remove(id: string): Promise<void> {
    await db.plants.delete(id)
  },

  /** Detach a deleted option from every plant that references it. */
  async detachOption(optionId: string): Promise<void> {
    await db.plants.where('typeId').equals(optionId).modify({ typeId: null })
    await db.plants
      .where('environmentIds')
      .equals(optionId)
      .modify((p) => {
        p.environmentIds = p.environmentIds.filter((e) => e !== optionId)
      })
  },

  async replaceAll(plants: Plant[]): Promise<void> {
    await db.plants.clear()
    if (plants.length) await db.plants.bulkAdd(plants)
  },

  async mergeAll(plants: Plant[]): Promise<void> {
    if (plants.length) await db.plants.bulkPut(plants)
  },
}
