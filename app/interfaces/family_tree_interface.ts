import { DateTime } from 'luxon'
import FamilyTree from '#models/family_tree'
import LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'

namespace IFamilyTree {
  /**
   * Repository interface
   */
  export interface Repository extends LucidRepositoryInterface<typeof FamilyTree> {
    /**
     * Find family trees for a specific user
     */
    findByUserId(userId: string): Promise<FamilyTree[]>

    /**
     * Find family tree with members and people
     */
    findWithMembers(id: string): Promise<FamilyTree | null>

    /**
     * Check if user has access to family tree
     */
    userHasAccess(familyTreeId: string, userId: string): Promise<boolean>

    /**
     * Get user's role in family tree
     */
    getUserRole(
      familyTreeId: string,
      userId: string
    ): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null>
  }

  /**
   * Create family tree payload
   */
  export interface CreatePayload {
    name: string
    description?: string | null
    created_by: number
    is_public?: boolean
    settings?: {
      default_view?: 'tree' | 'list' | 'timeline'
      show_living_only?: boolean
      theme?: string
    } | null
  }

  /**
   * Update family tree payload
   */
  export interface UpdatePayload {
    name?: string
    description?: string | null
    is_public?: boolean
    settings?: {
      default_view?: 'tree' | 'list' | 'timeline'
      show_living_only?: boolean
      theme?: string
    } | null
  }

  /**
   * Add member payload
   */
  export interface AddMemberPayload {
    user_id: number
    family_tree_id: string
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    invited_by: number
    person_id?: string | null
    permissions?: {
      can_add_people?: boolean
      can_edit_people?: boolean
      can_delete_people?: boolean
      can_invite_members?: boolean
      can_export?: boolean
    } | null
  }

  /**
   * Export options
   */
  export interface ExportOptions {
    format: 'json' | 'gedcom' | 'pdf'
    include_living?: boolean
    include_photos?: boolean
    include_documents?: boolean
  }

  /**
   * Family tree statistics
   */
  export interface Statistics {
    total_people: number
    total_relationships: number
    total_generations: number
    oldest_person?: {
      id: string
      name: string
      birth_date: DateTime
    }
    youngest_person?: {
      id: string
      name: string
      birth_date: DateTime
    }
    most_children?: {
      id: string
      name: string
      children_count: number
    }
  }
}

export default IFamilyTree
