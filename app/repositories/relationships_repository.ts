import { inject } from '@adonisjs/core'
import Relationship from '#models/relationship'
import LucidRepository from '#shared/lucid/lucid_repository'

@inject()
export default class RelationshipsRepository extends LucidRepository<typeof Relationship> {
  protected model = Relationship

  /**
   * Find relationships for a person
   */
  async findByPersonId(personId: string): Promise<Relationship[]> {
    return this.model
      .query()
      .where('person_id', personId)
      .orWhere('related_person_id', personId)
      .preload('person')
      .preload('relatedPerson')
      .exec()
  }

  /**
   * Find relationships in a family tree
   */
  async findByFamilyTreeId(familyTreeId: string): Promise<Relationship[]> {
    return this.model
      .query()
      .where('family_tree_id', familyTreeId)
      .preload('person')
      .preload('relatedPerson')
      .exec()
  }

  /**
   * Find specific relationship between two people
   */
  async findBetweenPeople(
    personId: string,
    relatedPersonId: string,
    familyTreeId: string
  ): Promise<Relationship | null> {
    return this.model
      .query()
      .where('family_tree_id', familyTreeId)
      .where((query) => {
        query
          .where((subQuery) => {
            subQuery.where('person_id', personId).where('related_person_id', relatedPersonId)
          })
          .orWhere((subQuery) => {
            subQuery.where('person_id', relatedPersonId).where('related_person_id', personId)
          })
      })
      .first()
  }

  /**
   * Create bidirectional relationship
   */
  async createBidirectional(
    personId: string,
    relatedPersonId: string,
    relationshipType: Relationship['relationship_type'],
    familyTreeId: string,
    notes?: string
  ): Promise<{ forward: Relationship; inverse: Relationship }> {
    // Create forward relationship
    const forward = await this.create({
      person_id: personId,
      related_person_id: relatedPersonId,
      relationship_type: relationshipType,
      family_tree_id: familyTreeId,
      status: 'active',
      notes,
    })

    // Determine inverse relationship type
    const inverseType = this.getInverseRelationshipType(relationshipType)

    // Create inverse relationship
    const inverse = await this.create({
      person_id: relatedPersonId,
      related_person_id: personId,
      relationship_type: inverseType,
      family_tree_id: familyTreeId,
      status: 'active',
      notes,
    })

    return { forward, inverse }
  }

  /**
   * Get inverse relationship type
   */
  private getInverseRelationshipType(
    type: Relationship['relationship_type']
  ): Relationship['relationship_type'] {
    const inverseMap: Record<string, Relationship['relationship_type']> = {
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
    return inverseMap[type]
  }

  /**
   * Delete relationship and its inverse
   */
  async deleteBidirectional(relationshipId: string): Promise<void> {
    const relationship = await this.find(relationshipId)
    if (!relationship) return

    // Find and delete inverse relationship
    const inverse = await this.model
      .query()
      .where('person_id', relationship.related_person_id)
      .where('related_person_id', relationship.person_id)
      .where('family_tree_id', relationship.family_tree_id)
      .first()

    if (inverse) {
      await inverse.delete()
    }

    await relationship.delete()
  }

  /**
   * Get family connections (parents, children, siblings, spouse)
   */
  async getFamilyConnections(
    personId: string,
    familyTreeId: string
  ): Promise<{
    parents: Relationship[]
    children: Relationship[]
    siblings: Relationship[]
    spouse: Relationship | null
  }> {
    const relationships = await this.model
      .query()
      .where('family_tree_id', familyTreeId)
      .where((query) => {
        query.where('person_id', personId).orWhere('related_person_id', personId)
      })
      .whereIn('relationship_type', ['parent', 'child', 'sibling', 'spouse'])
      .preload('person')
      .preload('relatedPerson')
      .exec()

    const parents: Relationship[] = []
    const children: Relationship[] = []
    const siblings: Relationship[] = []
    let spouse: Relationship | null = null

    relationships.forEach((rel) => {
      if (rel.person_id === personId) {
        // Outgoing relationships
        switch (rel.relationship_type) {
          case 'parent':
            parents.push(rel)
            break
          case 'child':
            children.push(rel)
            break
          case 'sibling':
            siblings.push(rel)
            break
          case 'spouse':
            spouse = rel
            break
        }
      } else {
        // Incoming relationships (need to consider inverse)
        switch (rel.relationship_type) {
          case 'child': // If someone has personId as child, they are parent
            parents.push(rel)
            break
          case 'parent': // If someone has personId as parent, they are child
            children.push(rel)
            break
          case 'sibling':
            siblings.push(rel)
            break
          case 'spouse':
            spouse = rel
            break
        }
      }
    })

    return { parents, children, siblings, spouse }
  }

  /**
   * Find all ancestors of a person
   */
  async findAncestors(
    personId: string,
    familyTreeId: string,
    maxGenerations: number = 10
  ): Promise<Set<string>> {
    const ancestors = new Set<string>()
    const toProcess = [personId]
    let generation = 0

    while (toProcess.length > 0 && generation < maxGenerations) {
      const currentGen = [...toProcess]
      toProcess.length = 0

      for (const currentId of currentGen) {
        // Find parents
        const parentRels = await this.model
          .query()
          .where('family_tree_id', familyTreeId)
          .where((query) => {
            query
              .where((q) => {
                q.where('person_id', currentId).where('relationship_type', 'parent')
              })
              .orWhere((q) => {
                q.where('related_person_id', currentId).where('relationship_type', 'child')
              })
          })
          .exec()

        parentRels.forEach((rel) => {
          const parentId = rel.person_id === currentId ? rel.related_person_id : rel.person_id
          if (!ancestors.has(parentId)) {
            ancestors.add(parentId)
            toProcess.push(parentId)
          }
        })
      }

      generation++
    }

    return ancestors
  }

  /**
   * Find all descendants of a person
   */
  async findDescendants(
    personId: string,
    familyTreeId: string,
    maxGenerations: number = 10
  ): Promise<Set<string>> {
    const descendants = new Set<string>()
    const toProcess = [personId]
    let generation = 0

    while (toProcess.length > 0 && generation < maxGenerations) {
      const currentGen = [...toProcess]
      toProcess.length = 0

      for (const currentId of currentGen) {
        // Find children
        const childRels = await this.model
          .query()
          .where('family_tree_id', familyTreeId)
          .where((query) => {
            query
              .where((q) => {
                q.where('person_id', currentId).where('relationship_type', 'child')
              })
              .orWhere((q) => {
                q.where('related_person_id', currentId).where('relationship_type', 'parent')
              })
          })
          .exec()

        childRels.forEach((rel) => {
          const childId = rel.person_id === currentId ? rel.related_person_id : rel.person_id
          if (!descendants.has(childId)) {
            descendants.add(childId)
            toProcess.push(childId)
          }
        })
      }

      generation++
    }

    return descendants
  }
}
