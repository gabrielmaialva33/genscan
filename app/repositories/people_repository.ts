import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Person from '#models/person'
import PersonDetail from '#models/person_detail'
import IPerson from '#interfaces/person_interface'
import LucidRepository from '#shared/lucid/lucid_repository'

@inject()
export default class PeopleRepository
  extends LucidRepository<typeof Person>
  implements IPerson.Repository
{
  protected model = Person

  /**
   * Find person by national ID (CPF)
   */
  async findByNationalId(nationalId: string): Promise<Person | null> {
    return this.model.query().where('national_id', nationalId).first()
  }

  /**
   * Find or create person with related details
   */
  async findOrCreate(data: IPerson.CreatePayload): Promise<Person> {
    // First try to find by national ID if provided
    if (data.national_id) {
      const existing = await this.findByNationalId(data.national_id)
      if (existing) {
        // Update with new data if provided
        await existing.merge(data).save()
        return existing
      }
    }

    // If not found by national ID, check by name and birth date
    if (data.full_name && data.birth_date) {
      const existing = await this.model
        .query()
        .where('full_name', data.full_name)
        .where('birth_date', data.birth_date.toSQLDate()!)
        .first()

      if (existing) {
        // Update with new data including national ID
        await existing.merge(data).save()
        return existing
      }
    }

    // Create new person
    return this.create(data)
  }

  /**
   * Find people by mother's name
   */
  async findByMotherName(motherName: string): Promise<Person[]> {
    return this.model.query().whereILike('mother_name', `%${motherName}%`).exec()
  }

  /**
   * Create person with details
   */
  async createWithDetails(
    data: IPerson.CreatePayload,
    details?: IPerson.PersonDetailPayload
  ): Promise<Person> {
    const person = await this.create(data)

    if (details) {
      await PersonDetail.create({
        ...details,
        person_id: person.id,
      })
      await person.load('details')
    }

    return person
  }

  /**
   * Search people by name, national ID, or mother name
   */
  async search(query: string): Promise<Person[]> {
    const searchTerm = `%${query}%`

    return this.model
      .query()
      .where((builder) => {
        builder
          .whereILike('full_name', searchTerm)
          .orWhereILike('mother_name', searchTerm)
          .orWhereILike('father_name', searchTerm)
          .orWhere('national_id', query.replace(/\D/g, '')) // Clean CPF for exact match
      })
      .limit(50)
      .exec()
  }

  /**
   * Get person with all relationships
   */
  async getWithRelationships(id: string): Promise<Person | null> {
    return this.model
      .query()
      .where('id', id)
      .preload('details')
      .preload('familyTreeMemberships', (query) => {
        query.preload('familyTree')
      })
      .preload('relationships', (query) => {
        query.preload('relatedPerson')
      })
      .preload('relatedRelationships', (query) => {
        query.preload('person')
      })
      .first()
  }

  /**
   * Update person birth date
   */
  async updateBirthDate(id: string, birthDate: DateTime): Promise<void> {
    await this.model.query().where('id', id).update({ birth_date: birthDate.toSQLDate()! })
  }

  /**
   * Mark person as deceased
   */
  async markAsDeceased(id: string, deathDate?: DateTime, deathPlace?: string): Promise<void> {
    const updateData: any = { is_living: false }
    if (deathDate) updateData.death_date = deathDate.toSQLDate()
    if (deathPlace) updateData.death_place = deathPlace

    await this.model.query().where('id', id).update(updateData)
  }

  /**
   * Get family members (parents, children, siblings)
   */
  async getFamilyMembers(personId: string): Promise<{
    parents: Person[]
    children: Person[]
    siblings: Person[]
    spouse: Person | null
  }> {
    const person = await this.find(personId)
    if (!person) {
      return { parents: [], children: [], siblings: [], spouse: null }
    }

    // Load relationships
    await person.load('relationships', (query) => {
      query.whereIn('relationship_type', ['parent', 'child', 'sibling', 'spouse'])
      query.preload('relatedPerson')
    })

    await person.load('relatedRelationships', (query) => {
      query.whereIn('relationship_type', ['parent', 'child', 'sibling', 'spouse'])
      query.preload('person')
    })

    const parents: Person[] = []
    const children: Person[] = []
    const siblings: Person[] = []
    let spouse: Person | null = null

    // Process outgoing relationships
    person.relationships.forEach((rel) => {
      switch (rel.relationship_type) {
        case 'parent':
          parents.push(rel.relatedPerson)
          break
        case 'child':
          children.push(rel.relatedPerson)
          break
        case 'sibling':
          siblings.push(rel.relatedPerson)
          break
        case 'spouse':
          spouse = rel.relatedPerson
          break
      }
    })

    // Process incoming relationships (inverse)
    person.relatedRelationships.forEach((rel) => {
      switch (rel.relationship_type) {
        case 'child': // If someone has this person as child, they are parent
          parents.push(rel.person)
          break
        case 'parent': // If someone has this person as parent, they are child
          children.push(rel.person)
          break
        case 'sibling':
          siblings.push(rel.person)
          break
        case 'spouse':
          spouse = rel.person
          break
      }
    })

    return {
      parents: [...new Map(parents.map((p) => [p.id, p])).values()], // Remove duplicates
      children: [...new Map(children.map((p) => [p.id, p])).values()],
      siblings: [...new Map(siblings.map((p) => [p.id, p])).values()],
      spouse,
    }
  }
}
