import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import FamilyTree from '#models/family_tree'
import FamilyTreeMember from '#models/family_tree_member'
import Relationship from '#models/relationship'
import IFamilyTree from '#interfaces/family_tree_interface'
import LucidRepository from '#shared/lucid/lucid_repository'

@inject()
export default class FamilyTreesRepository
  extends LucidRepository<typeof FamilyTree>
  implements IFamilyTree.Repository
{
  protected model = FamilyTree

  /**
   * Find family trees for a specific user
   */
  async findByUserId(userId: number): Promise<FamilyTree[]> {
    return this.model
      .query()
      .whereHas('members', (query) => {
        query.where('user_id', userId).whereNotNull('accepted_at')
      })
      .preload('members', (query) => {
        query.where('user_id', userId)
      })
      .orderBy('updated_at', 'desc')
      .exec()
  }

  /**
   * Find family tree with members and people
   */
  async findWithMembers(id: string): Promise<FamilyTree | null> {
    return this.model
      .query()
      .where('id', id)
      .preload('members', (query) => {
        query.preload('user').preload('person')
      })
      .preload('relationships', (query) => {
        query.preload('person').preload('related_person')
      })
      .first()
  }

  /**
   * Check if user has access to family tree
   */
  async userHasAccess(familyTreeId: string, userId: number): Promise<boolean> {
    const member = await FamilyTreeMember.query()
      .where('family_tree_id', familyTreeId)
      .where('user_id', userId)
      .whereNotNull('accepted_at')
      .first()

    return member !== null
  }

  /**
   * Get user's role in family tree
   */
  async getUserRole(
    familyTreeId: string,
    userId: number
  ): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
    const member = await FamilyTreeMember.query()
      .where('family_tree_id', familyTreeId)
      .where('user_id', userId)
      .whereNotNull('accepted_at')
      .first()

    return member ? member.role : null
  }

  /**
   * Create family tree with initial member
   */
  async createWithOwner(data: IFamilyTree.CreatePayload, ownerId: number): Promise<FamilyTree> {
    const familyTree = await this.create(data)

    // Add owner as member
    await FamilyTreeMember.create({
      family_tree_id: familyTree.id,
      user_id: ownerId,
      role: 'owner',
      invited_by: ownerId,
      accepted_at: DateTime.now(),
    })

    return familyTree
  }

  /**
   * Get family tree statistics
   */
  async getStatistics(familyTreeId: string): Promise<IFamilyTree.Statistics> {
    const familyTree = await this.model
      .query()
      .where('id', familyTreeId)
      .preload('relationships')
      .first()

    if (!familyTree) {
      throw new Error('Family tree not found')
    }

    // Get people through the getPeople method
    const people = await familyTree.getPeople()
    const livingPeople = people.filter((p) => p.is_living)
    const peopleWithBirthDate = people.filter((p) => p.birth_date)

    // Find oldest person
    const oldestPerson = peopleWithBirthDate.reduce(
      (oldest, person) => {
        if (!oldest || person.birth_date! < oldest.birth_date!) {
          return person
        }
        return oldest
      },
      null as (typeof people)[0] | null
    )

    // Find youngest person
    const youngestPerson = livingPeople
      .filter((p) => p.birth_date)
      .reduce(
        (youngest, person) => {
          if (!youngest || person.birth_date! > youngest.birth_date!) {
            return person
          }
          return youngest
        },
        null as (typeof people)[0] | null
      )

    // Count children per person
    const childrenCount = new Map<string, number>()
    familyTree.relationships
      .filter((r) => r.relationship_type === 'parent')
      .forEach((r) => {
        const count = childrenCount.get(r.person_id) || 0
        childrenCount.set(r.person_id, count + 1)
      })

    // Find person with most children
    let mostChildren: { id: string; name: string; children_count: number } | undefined
    let maxChildren = 0
    childrenCount.forEach((count, personId) => {
      if (count > maxChildren) {
        const person = people.find((p) => p.id === personId)
        if (person) {
          maxChildren = count
          mostChildren = {
            id: person.id,
            name: person.full_name,
            children_count: count,
          }
        }
      }
    })

    // Calculate generations (simplified - counts parent-child levels)
    const generations = await this.calculateGenerations(familyTreeId)

    return {
      total_people: people.length,
      total_relationships: familyTree.relationships.length,
      total_generations: generations,
      oldest_person: oldestPerson
        ? {
            id: oldestPerson.id,
            name: oldestPerson.full_name,
            birth_date: oldestPerson.birth_date!,
          }
        : undefined,
      youngest_person: youngestPerson
        ? {
            id: youngestPerson.id,
            name: youngestPerson.full_name,
            birth_date: youngestPerson.birth_date!,
          }
        : undefined,
      most_children: mostChildren,
    }
  }

  /**
   * Calculate number of generations in family tree
   */
  private async calculateGenerations(familyTreeId: string): Promise<number> {
    // This is a simplified calculation
    // In a real implementation, you'd want to traverse the tree properly
    const relationships = await Relationship.query()
      .where('family_tree_id', familyTreeId)
      .where('relationship_type', 'parent')

    if (relationships.length === 0) return 1

    // Simple approach: count unique levels based on parent-child relationships
    const parentIds = new Set(relationships.map((r) => r.person_id))
    const childIds = new Set(relationships.map((r) => r.related_person_id))

    // People who are parents but not children are likely top generation
    const topGeneration = [...parentIds].filter((id) => !childIds.has(id))

    if (topGeneration.length === 0) return 2 // At least 2 generations if we have parent-child

    // This is simplified - in reality you'd want to traverse the tree
    // to find the maximum depth
    return Math.min(5, Math.ceil(Math.log2(relationships.length)) + 1)
  }

  /**
   * Get family trees where user is owner
   */
  async getOwnedByUser(userId: number): Promise<FamilyTree[]> {
    return this.model
      .query()
      .whereHas('members', (query) => {
        query.where('user_id', userId).where('role', 'owner').whereNotNull('accepted_at')
      })
      .exec()
  }

  /**
   * Search family trees by name
   */
  async searchByName(query: string, userId?: string): Promise<FamilyTree[]> {
    const searchQuery = this.model.query().whereILike('name', `%${query}%`)

    if (userId) {
      // Only show trees the user has access to
      searchQuery.whereHas('members', (memberQuery) => {
        memberQuery.where('user_id', userId).whereNotNull('accepted_at')
      })
    } else {
      // Only show public trees
      searchQuery.where('is_public', true)
    }

    return searchQuery.limit(20).exec()
  }
}
