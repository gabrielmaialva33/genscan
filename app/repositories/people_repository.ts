import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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
   * Override create to handle birth_date properly
   */
  async create(data: IPerson.CreatePayload): Promise<Person> {
    // Log the incoming data
    logger.debug('PeopleRepository.create called with:', {
      ...data,
      birth_date: data.birth_date
        ? {
            value: data.birth_date.toString(),
            type: typeof data.birth_date,
            isDateTime: data.birth_date instanceof DateTime,
          }
        : null,
    })

    // Ensure birth_date is handled properly
    const createData: any = { ...data }

    // If birth_date is a DateTime object, we let Lucid handle it
    // If it's a string, convert to DateTime first
    if (data.birth_date && !(data.birth_date instanceof DateTime)) {
      createData.birth_date = DateTime.fromISO(data.birth_date as any)
    }

    const person = await this.model.create(createData)

    logger.debug('PeopleRepository.create result:', {
      id: person.id,
      full_name: person.full_name,
      birth_date: person.birth_date ? person.birth_date.toString() : null,
      birth_date_sql: person.birth_date ? person.birth_date.toSQLDate() : null,
    })

    return person
  }

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
    details?: IPerson.CreatePersonDetailPayload
  ): Promise<Person> {
    const person = await this.create(data)

    if (details) {
      await PersonDetail.create({
        ...details,
        person_id: person.id,
      } as IPerson.PersonDetailPayload)
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
      .preload('family_tree_memberships', (query) => {
        query.preload('family_tree')
      })
      .preload('relationships', (query) => {
        query.preload('related_person')
      })
      .preload('related_relationships', (query) => {
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
      query.preload('related_person')
    })

    await person.load('related_relationships', (query) => {
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
          parents.push(rel.related_person)
          break
        case 'child':
          children.push(rel.related_person)
          break
        case 'sibling':
          siblings.push(rel.related_person)
          break
        case 'spouse':
          spouse = rel.related_person
          break
      }
    })

    // Process incoming relationships (inverse)
    person.related_relationships.forEach((rel) => {
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

  /**
   * Get all people in a family tree
   */
  async getByFamilyTree(familyTreeId: string): Promise<Person[]> {
    return this.model
      .query()
      .whereHas('relationships', (query) => {
        query.where('family_tree_id', familyTreeId)
      })
      .orWhereHas('related_relationships', (query) => {
        query.where('family_tree_id', familyTreeId)
      })
      .distinct()
  }
}
