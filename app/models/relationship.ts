import { DateTime } from 'luxon'
import {
  BaseModel,
  beforeSave,
  belongsTo,
  column,
  SnakeCaseNamingStrategy,
} from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Person from '#models/person'
import FamilyTree from '#models/family_tree'

export default class Relationship extends BaseModel {
  static table = 'relationships'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare person_id: string

  @column()
  declare related_person_id: string

  @column()
  declare relationship_type:
    | 'parent'
    | 'child'
    | 'spouse'
    | 'sibling'
    | 'grandparent'
    | 'grandchild'
    | 'uncle_aunt'
    | 'nephew_niece'
    | 'cousin'

  @column()
  declare family_tree_id: string

  @column.date()
  declare start_date: DateTime | null

  @column.date()
  declare end_date: DateTime | null

  @column()
  declare status: 'active' | 'ended' | 'deceased'

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => Person, {
    foreignKey: 'person_id',
  })
  declare person: BelongsTo<typeof Person>

  @belongsTo(() => Person, {
    foreignKey: 'related_person_id',
  })
  declare relatedPerson: BelongsTo<typeof Person>

  @belongsTo(() => FamilyTree, {
    foreignKey: 'family_tree_id',
  })
  declare familyTree: BelongsTo<typeof FamilyTree>

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */
  @beforeSave()
  static async validateRelationship(relationship: Relationship) {
    // Prevent self-relationships
    if (relationship.person_id === relationship.related_person_id) {
      throw new Error('A person cannot have a relationship with themselves')
    }

    // TODO: Add more validation logic for circular relationships
  }

  /**
   * ------------------------------------------------------
   * Query Scopes
   * ------------------------------------------------------
   */
  static forPerson(query: any, personId: string) {
    query.where('person_id', personId).orWhere('related_person_id', personId)
  }

  static forFamilyTree(query: any, familyTreeId: string) {
    query.where('family_tree_id', familyTreeId)
  }

  static withPeople(query: any) {
    query.preload('person').preload('relatedPerson')
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  getInverseRelationshipType(): string {
    const inverseMap: Record<string, string> = {
      parent: 'child',
      child: 'parent',
      spouse: 'spouse',
      sibling: 'sibling',
      grandparent: 'grandchild',
      grandchild: 'grandparent',
      uncle_aunt: 'nephew_niece',
      nephew_niece: 'uncle_aunt',
      cousin: 'cousin',
    }
    return inverseMap[this.relationship_type]
  }

  isActive(): boolean {
    return this.status === 'active'
  }
}
