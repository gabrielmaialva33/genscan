import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import FamilyTree from '#models/family_tree'

export default class DataImport extends BaseModel {
  static table = 'data_imports'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: number

  @column()
  declare family_tree_id: string

  @column()
  declare import_type: 'national_id' | 'mother_name' | 'manual' | 'csv'

  @column()
  declare search_value: string

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare api_request: Record<string, any> | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare api_response: Record<string, any> | null

  @column()
  declare persons_created: number

  @column()
  declare relationships_created: number

  @column()
  declare persons_updated: number

  @column()
  declare duplicates_found: number

  @column()
  declare status: 'pending' | 'processing' | 'success' | 'partial' | 'failed'

  @column()
  declare error_message: string | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare import_summary: {
    created_person_ids?: string[]
    created_relationship_ids?: string[]
    updated_person_ids?: string[]
    errors?: Array<{ person: string; error: string }>
  } | null

  @column.dateTime()
  declare started_at: DateTime | null

  @column.dateTime()
  declare completed_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => FamilyTree, {
    foreignKey: 'family_tree_id',
  })
  declare familyTree: BelongsTo<typeof FamilyTree>

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Query Scopes
   * ------------------------------------------------------
   */
  static forUser(query: any, userId: string) {
    query.where('user_id', userId)
  }

  static forFamilyTree(query: any, familyTreeId: string) {
    query.where('family_tree_id', familyTreeId)
  }

  static byStatus(query: any, status: string) {
    query.where('status', status)
  }

  static recent(query: any) {
    query.orderBy('created_at', 'desc')
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  getDuration(): number | null {
    if (!this.started_at || !this.completed_at) return null
    return this.completed_at.diff(this.started_at, 'seconds').seconds
  }

  getSuccessRate(): number {
    const total = this.persons_created + this.persons_updated + this.duplicates_found
    if (total === 0) return 0
    return ((this.persons_created + this.persons_updated) / total) * 100
  }

  async markAsProcessing(): Promise<void> {
    this.status = 'processing'
    this.started_at = DateTime.now()
    await this.save()
  }

  async markAsCompleted(summary: DataImport['import_summary']): Promise<void> {
    this.status = 'success'
    this.completed_at = DateTime.now()
    this.import_summary = summary
    await this.save()
  }

  async markAsFailed(error: string): Promise<void> {
    this.status = 'failed'
    this.completed_at = DateTime.now()
    this.error_message = error
    await this.save()
  }

  isCompleted(): boolean {
    return ['success', 'partial', 'failed'].includes(this.status)
  }

  isProcessing(): boolean {
    return this.status === 'processing'
  }
}
