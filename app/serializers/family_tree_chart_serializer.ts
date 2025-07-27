import { inject } from '@adonisjs/core'
import Person from '#models/person'
import Relationship from '#models/relationship'
import FamilyTree from '#models/family_tree'

/**
 * Chart node format expected by a family-chart library
 */
interface ChartNode {
  id: string
  data: {
    first_name: string
    last_name: string
    birthday?: string
    avatar?: string
    gender: 'M' | 'F' | 'O'
  }
  rels: {
    father?: string
    mother?: string
    spouses?: string[]
    children?: string[]
  }
  main?: boolean
}

@inject()
export default class FamilyTreeChartSerializer {
  // Cache for people lookup during serialization
  private peopleMap: Map<string, Person> = new Map()

  /**
   * Serialize people and relationships to family-chart format
   */
  serialize(people: Person[], relationships: Relationship[], familyTree: FamilyTree): ChartNode[] {
    // Build a people map for a quick lookup
    this.peopleMap = new Map(people.map((p) => [p.id, p]))

    // Build a relationship map for a quick lookup
    const relMap = this.buildRelationshipMap(relationships)

    // Convert each person to a chart node
    const nodes = people.map((person) => this.personToChartNode(person, relMap, familyTree))

    // Clear cache
    this.peopleMap.clear()

    return nodes
  }

  /**
   * Convert a person model to chart node format
   */
  private personToChartNode(
    person: Person,
    relMap: Map<string, Relationship[]>,
    familyTree: FamilyTree
  ): ChartNode {
    const personRels = relMap.get(person.id) || []

    return {
      id: person.id,
      data: {
        first_name: this.extractFirstName(person.full_name),
        last_name: this.extractLastName(person.full_name),
        birthday: person.birth_date?.year?.toString(),
        avatar: person.photo_url || this.getDefaultAvatar(person.gender, person.full_name),
        gender: this.mapGender(person.gender),
      },
      rels: this.buildRels(person.id, personRels),
      // Mark owner as main person
      main: person.created_by === familyTree.owner_id,
    }
  }

  /**
   * Build relationships object for a person
   */
  private buildRels(personId: string, relationships: Relationship[]) {
    const rels: ChartNode['rels'] = {
      spouses: [],
      children: [],
    }

    // Use Sets to avoid duplicates
    const spousesSet = new Set<string>()
    const childrenSet = new Set<string>()

    relationships.forEach((rel) => {
      // Determine the direction of relationship
      const isPersonFirst = rel.person_id === personId
      const otherPersonId = isPersonFirst ? rel.related_person_id : rel.person_id

      switch (rel.relationship_type) {
        case 'parent':
          if (isPersonFirst) {
            // This person is parent of other
            childrenSet.add(otherPersonId)
          } else {
            // Other person is parent of this
            const otherPerson = this.peopleMap.get(otherPersonId)
            if (otherPerson?.gender === 'M') {
              rels.father = otherPersonId
            } else if (otherPerson?.gender === 'F') {
              rels.mother = otherPersonId
            }
          }
          break

        case 'child':
          if (isPersonFirst) {
            // This person is child of other
            const otherPerson = this.peopleMap.get(otherPersonId)
            if (otherPerson?.gender === 'M') {
              rels.father = otherPersonId
            } else if (otherPerson?.gender === 'F') {
              rels.mother = otherPersonId
            }
          } else {
            // Other person is child of this
            childrenSet.add(otherPersonId)
          }
          break

        case 'spouse':
          spousesSet.add(otherPersonId)
          break

        case 'sibling':
          // Siblings are not directly represented in family-chart
          // They are inferred from shared parents
          break
      }
    })

    // Convert Sets to arrays
    if (spousesSet.size > 0) {
      rels.spouses = Array.from(spousesSet)
    } else {
      delete rels.spouses
    }

    if (childrenSet.size > 0) {
      rels.children = Array.from(childrenSet)
    } else {
      delete rels.children
    }

    return rels
  }

  /**
   * Build a map of person_id to their relationships
   */
  private buildRelationshipMap(relationships: Relationship[]): Map<string, Relationship[]> {
    const map = new Map<string, Relationship[]>()

    relationships.forEach((rel) => {
      // Add to person_id
      if (!map.has(rel.person_id)) {
        map.set(rel.person_id, [])
      }
      map.get(rel.person_id)!.push(rel)

      // Add to related_person_id (for bidirectional lookup)
      if (!map.has(rel.related_person_id)) {
        map.set(rel.related_person_id, [])
      }
      map.get(rel.related_person_id)!.push(rel)
    })

    return map
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(fullName: string): string {
    const parts = fullName.trim().split(' ')
    return parts[0] || ''
  }

  /**
   * Extract last name from full name
   */
  private extractLastName(fullName: string): string {
    const parts = fullName.trim().split(' ')
    return parts.slice(1).join(' ')
  }

  /**
   * Map gender to family-chart format
   */
  private mapGender(gender?: string | null): 'M' | 'F' | 'O' {
    if (gender === 'M' || gender === 'F') {
      return gender
    }
    return 'O' // Other/Unknown
  }

  /**
   * Get default avatar based on gender using Avatar Placeholder API
   */
  private getDefaultAvatar(gender?: string | null, fullName?: string): string {
    // Use Avatar Placeholder API based on gender and username
    if (gender === 'M') {
      return fullName
        ? `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(fullName)}`
        : 'https://avatar.iran.liara.run/public/boy'
    } else if (gender === 'F') {
      return fullName
        ? `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(fullName)}`
        : 'https://avatar.iran.liara.run/public/girl'
    }

    // For other/unknown gender, use generic avatar
    return 'https://avatar.iran.liara.run/public'
  }
}
