import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import DataImport from '#models/data_import'
import IImport from '#interfaces/import_interface'
import LucidRepository from '#shared/lucid/lucid_repository'

@inject()
export default class DataImportsRepository
  extends LucidRepository<typeof DataImport>
  implements IImport.Repository
{
  protected model = DataImport

  /**
   * Find imports by user
   */
  async findByUserId(userId: string): Promise<DataImport[]> {
    return this.model
      .query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .preload('familyTree')
      .exec()
  }

  /**
   * Find imports by family tree
   */
  async findByFamilyTreeId(familyTreeId: string): Promise<DataImport[]> {
    return this.model
      .query()
      .where('family_tree_id', familyTreeId)
      .orderBy('created_at', 'desc')
      .preload('user')
      .exec()
  }

  /**
   * Get import with details
   */
  async findWithDetails(id: string): Promise<DataImport | null> {
    return this.model.query().where('id', id).preload('user').preload('familyTree').first()
  }

  /**
   * Update import progress
   */
  async updateProgress(
    id: string,
    progress: {
      persons_created?: number
      relationships_created?: number
      persons_updated?: number
      duplicates_found?: number
    }
  ): Promise<void> {
    const dataImport = await this.find(id)
    if (!dataImport) return

    if (progress.persons_created !== undefined) {
      dataImport.persons_created = progress.persons_created
    }
    if (progress.relationships_created !== undefined) {
      dataImport.relationships_created = progress.relationships_created
    }
    if (progress.persons_updated !== undefined) {
      dataImport.persons_updated = progress.persons_updated
    }
    if (progress.duplicates_found !== undefined) {
      dataImport.duplicates_found = progress.duplicates_found
    }

    await dataImport.save()
  }

  /**
   * Create import record
   */
  async createImport(
    type: DataImport['import_type'],
    searchValue: string,
    userId: string,
    familyTreeId: string
  ): Promise<DataImport> {
    return this.create({
      import_type: type,
      search_value: searchValue,
      user_id: userId,
      family_tree_id: familyTreeId,
      status: 'pending',
      persons_created: 0,
      relationships_created: 0,
      persons_updated: 0,
      duplicates_found: 0,
    })
  }

  /**
   * Mark import as processing
   */
  async markAsProcessing(id: string): Promise<void> {
    const dataImport = await this.find(id)
    if (!dataImport) return

    await dataImport.markAsProcessing()
  }

  /**
   * Mark import as completed
   */
  async markAsCompleted(
    id: string,
    summary: {
      created_person_ids?: string[]
      created_relationship_ids?: string[]
      updated_person_ids?: string[]
      errors?: Array<{ person: string; error: string }>
    }
  ): Promise<void> {
    const dataImport = await this.find(id)
    if (!dataImport) return

    await dataImport.markAsCompleted(summary)
  }

  /**
   * Mark import as failed
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    const dataImport = await this.find(id)
    if (!dataImport) return

    await dataImport.markAsFailed(error)
  }

  /**
   * Get recent imports for user
   */
  async getRecentForUser(userId: string, limit: number = 10): Promise<DataImport[]> {
    return this.model
      .query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('familyTree')
      .exec()
  }

  /**
   * Get import statistics for user
   */
  async getStatisticsForUser(userId: string): Promise<{
    total_imports: number
    successful_imports: number
    failed_imports: number
    total_people_imported: number
    total_relationships_created: number
  }> {
    const imports = await this.model.query().where('user_id', userId).exec()

    const stats = imports.reduce(
      (acc, imp) => {
        acc.total_imports++
        if (imp.status === 'success') acc.successful_imports++
        if (imp.status === 'failed') acc.failed_imports++
        acc.total_people_imported += imp.persons_created + imp.persons_updated
        acc.total_relationships_created += imp.relationships_created
        return acc
      },
      {
        total_imports: 0,
        successful_imports: 0,
        failed_imports: 0,
        total_people_imported: 0,
        total_relationships_created: 0,
      }
    )

    return stats
  }

  /**
   * Check if similar import was done recently
   */
  async findRecentSimilar(
    type: DataImport['import_type'],
    searchValue: string,
    familyTreeId: string,
    hoursAgo: number = 24
  ): Promise<DataImport | null> {
    const since = DateTime.now().minus({ hours: hoursAgo })

    return this.model
      .query()
      .where('import_type', type)
      .where('search_value', searchValue)
      .where('family_tree_id', familyTreeId)
      .where('created_at', '>=', since.toSQL())
      .where('status', 'success')
      .first()
  }

  /**
   * Clean old imports
   */
  async cleanOldImports(daysOld: number = 90): Promise<number> {
    const cutoffDate = DateTime.now().minus({ days: daysOld })

    const result = await this.model.query().where('created_at', '<', cutoffDate.toSQL()).delete()

    return result[0]
  }
}
