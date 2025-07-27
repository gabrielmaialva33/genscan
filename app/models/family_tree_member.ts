import { DateTime } from 'luxon'
import {
  BaseModel,
  beforeCreate,
  belongsTo,
  column,
  SnakeCaseNamingStrategy,
} from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import FamilyTree from '#models/family_tree'
import Person from '#models/person'

export default class FamilyTreeMember extends BaseModel {
  static table = 'family_tree_members'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare family_tree_id: string

  @column()
  declare user_id: string

  @column()
  declare person_id: string | null

  @column()
  declare role: 'owner' | 'admin' | 'editor' | 'viewer'

  @column()
  declare invited_by: string

  @column()
  declare invitation_token: string | null

  @column.dateTime()
  declare invited_at: DateTime

  @column.dateTime()
  declare accepted_at: DateTime | null

  @column.dateTime()
  declare last_accessed_at: DateTime | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare permissions: {
    can_add_people?: boolean
    can_edit_people?: boolean
    can_delete_people?: boolean
    can_invite_members?: boolean
    can_export?: boolean
  } | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => FamilyTree, {
    foreignKey: 'family_tree_id',
  })
  declare familyTree: BelongsTo<typeof FamilyTree>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'invited_by',
  })
  declare inviter: BelongsTo<typeof User>

  @belongsTo(() => Person, {
    foreignKey: 'person_id',
  })
  declare person: BelongsTo<typeof Person>

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */
  @beforeCreate()
  static async generateTokens(member: FamilyTreeMember) {
    member.invited_at = DateTime.now()

    // Generate invitation token if not accepted
    if (!member.accepted_at && !member.invitation_token) {
      member.invitation_token = randomUUID()
    }
  }

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

  static accepted(query: any) {
    query.whereNotNull('accepted_at')
  }

  static pending(query: any) {
    query.whereNull('accepted_at')
  }

  static withRelations(query: any) {
    query.preload('user').preload('familyTree').preload('person')
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  canEdit(): boolean {
    return ['owner', 'admin', 'editor'].includes(this.role)
  }

  canDelete(): boolean {
    return ['owner', 'admin'].includes(this.role)
  }

  canInvite(): boolean {
    return ['owner', 'admin'].includes(this.role) || this.permissions?.can_invite_members === true
  }

  async accept(): Promise<void> {
    this.accepted_at = DateTime.now()
    this.invitation_token = null
    await this.save()
  }

  async updateLastAccess(): Promise<void> {
    this.last_accessed_at = DateTime.now()
    await this.save()
  }

  hasPermission(permission: keyof NonNullable<FamilyTreeMember['permissions']>): boolean {
    // Owners have all permissions
    if (this.role === 'owner') return true

    // Check role-based permissions
    if (this.role === 'admin') {
      return ['can_add_people', 'can_edit_people', 'can_invite_members', 'can_export'].includes(
        permission
      )
    }

    if (this.role === 'editor') {
      return ['can_add_people', 'can_edit_people'].includes(permission)
    }

    // Check custom permissions
    return this.permissions?.[permission] === true
  }

  isOwner(): boolean {
    return this.role === 'owner'
  }

  isAccepted(): boolean {
    return this.accepted_at !== null
  }
}
