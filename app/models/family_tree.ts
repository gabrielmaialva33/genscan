import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class FamilyTree extends BaseModel {
  static table = 'family_trees'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare owner_id: string

  @column()
  declare privacy: 'private' | 'public' | 'family'

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare settings: {
    theme?: string
    default_layout?: string
    node_colors?: Record<string, string>
    show_photos?: boolean
    show_dates?: boolean
  } | null

  @column()
  declare cover_image_url: string | null

  @column()
  declare members_count: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => User, {
    foreignKey: 'owner_id',
  })
  declare owner: BelongsTo<typeof User>

  // Will be added after creating the other models
  // @hasMany(() => FamilyTreeMember)
  // declare members: HasMany<typeof FamilyTreeMember>

  // @hasMany(() => Relationship)
  // declare relationships: HasMany<typeof Relationship>

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
  static withOwner(query: any) {
    query.preload('owner')
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  isPublic(): boolean {
    return this.privacy === 'public'
  }

  async canView(userId: string): Promise<boolean> {
    if (this.isPublic()) return true
    if (this.owner_id === userId) return true

    // TODO: Check if user is a member after FamilyTreeMember model
    return false
  }

  async canEdit(userId: string): Promise<boolean> {
    if (this.owner_id === userId) return true

    // TODO: Check if user has edit permissions after FamilyTreeMember model
    return false
  }

  async incrementMembersCount(): Promise<void> {
    this.members_count += 1
    await this.save()
  }
}
