import { DateTime } from 'luxon'
import {
  BaseModel,
  belongsTo,
  column,
  hasMany,
  hasOne,
  SnakeCaseNamingStrategy,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Person extends BaseModel {
  static table = 'people'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare national_id: string | null

  @column()
  declare full_name: string

  @column.date()
  declare birth_date: DateTime | null

  @column.date()
  declare death_date: DateTime | null

  @column()
  declare gender: 'M' | 'F' | 'O' | null

  @column()
  declare birth_place: string | null

  @column()
  declare death_place: string | null

  @column()
  declare occupation: string | null

  @column()
  declare notes: string | null

  @column()
  declare photo_url: string | null

  @column()
  declare created_by: string

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
    foreignKey: 'created_by',
  })
  declare creator: BelongsTo<typeof User>

  // Will be added after creating the other models
  // @hasMany(() => Relationship, { foreignKey: 'person_id' })
  // declare relationships: HasMany<typeof Relationship>

  // @hasOne(() => PersonDetail, { foreignKey: 'person_id' })
  // declare details: HasOne<typeof PersonDetail>

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
  static withCreator(query: any) {
    query.preload('creator')
  }

  static withDetails(query: any) {
    query.preload('details')
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  getAge(): number | null {
    if (!this.birth_date) return null
    const end = this.death_date || DateTime.now()
    return Math.floor(end.diff(this.birth_date, 'years').years)
  }

  isAlive(): boolean {
    return !this.death_date
  }

  getFullNameWithDates(): string {
    const birthYear = this.birth_date?.year
    const deathYear = this.death_date?.year

    if (birthYear && deathYear) {
      return `${this.full_name} (${birthYear}-${deathYear})`
    } else if (birthYear) {
      return `${this.full_name} (${birthYear}-)`
    }
    return this.full_name
  }
}
