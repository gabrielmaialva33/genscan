import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Relationship from '#models/relationship'
import Person from '#models/person'
import FamilyTree from '#models/family_tree'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class RelationshipSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Clear existing relationships to avoid duplicates during development
    await Relationship.query().delete()
    logger.info('Cleared existing relationships...')

    // Get all family trees
    const familyTrees = await FamilyTree.query().orderBy('created_at', 'asc')

    if (familyTrees.length === 0) {
      logger.warn('No family trees found. Please run FamilyTreeSeeder first.')
      return
    }

    // Create relationships for each family tree
    for (const tree of familyTrees) {
      logger.debug(`  Creating relationships for tree: ${tree.name}`)

      // Get all people in this tree
      const people = await Person.query()
        .where('created_by', tree.owner_id)
        .orderBy('birth_date', 'asc')

      if (people.length === 0) {
        logger.warn(`  No people found for tree: ${tree.name}`)
        continue
      }

      await this.createFamilyRelationships(tree, people)
    }

    logger.debug('  ✓ Relationship seeding completed!')
  }

  private async createFamilyRelationships(tree: FamilyTree, people: Person[]) {
    // const relationships: Relationship[] = [] // Unused variable

    // Group people by generation based on birth year
    const generations = this.groupByGeneration(people)

    // Create marriages within same generation
    for (const [, genPeople] of Object.entries(generations)) {
      const males = genPeople.filter((p) => p.gender === 'M')
      const females = genPeople.filter((p) => p.gender === 'F')

      // Create spouse relationships
      const couples = Math.min(males.length, females.length)
      for (let i = 0; i < couples; i++) {
        if (males[i] && females[i]) {
          // Check if they might be siblings (same parent names)
          if (males[i].mother_name !== females[i].mother_name) {
            // Create bidirectional spouse relationship
            const marriageDate = this.calculateMarriageDate(males[i], females[i])

            // Check if relationship already exists
            const existingRelationship = await Relationship.query()
              .where('person_id', males[i].id)
              .where('related_person_id', females[i].id)
              .where('relationship_type', 'spouse')
              .where('family_tree_id', tree.id)
              .first()

            if (!existingRelationship) {
              try {
                await Relationship.create({
                  person_id: males[i].id,
                  related_person_id: females[i].id,
                  relationship_type: 'spouse',
                  family_tree_id: tree.id,
                  start_date: marriageDate,
                  status: 'active',
                })
              } catch (error) {
                logger.error(
                  `Failed to create spouse relationship: ${males[i].id} -> ${females[i].id}`
                )
                logger.error(`Error: ${error.message}`)
                throw error
              }
            }

            // Check if reverse relationship already exists
            const existingReverseRelationship = await Relationship.query()
              .where('person_id', females[i].id)
              .where('related_person_id', males[i].id)
              .where('relationship_type', 'spouse')
              .where('family_tree_id', tree.id)
              .first()

            if (!existingReverseRelationship) {
              await Relationship.create({
                person_id: females[i].id,
                related_person_id: males[i].id,
                relationship_type: 'spouse',
                family_tree_id: tree.id,
                start_date: marriageDate,
                status: 'active',
              })
            }

            logger.debug(
              `    ✓ Created spouse relationship: ${males[i].full_name} ↔ ${females[i].full_name}`
            )
          }
        }
      }
    }

    // Create parent-child relationships based on parent names
    for (const person of people) {
      // Find parents based on names
      if (person.mother_name) {
        const mother = people.find((p) => p.full_name === person.mother_name && p.gender === 'F')
        if (mother) {
          // Check if parent-child relationship already exists
          const existingParentRel = await Relationship.query()
            .where('person_id', mother.id)
            .where('related_person_id', person.id)
            .where('relationship_type', 'parent')
            .where('family_tree_id', tree.id)
            .first()

          if (!existingParentRel) {
            // Mother -> Child
            await Relationship.create({
              person_id: mother.id,
              related_person_id: person.id,
              relationship_type: 'parent',
              family_tree_id: tree.id,
              status: person.is_living ? 'active' : 'deceased',
            })
          }

          const existingChildRel = await Relationship.query()
            .where('person_id', person.id)
            .where('related_person_id', mother.id)
            .where('relationship_type', 'child')
            .where('family_tree_id', tree.id)
            .first()

          if (!existingChildRel) {
            // Child -> Mother
            await Relationship.create({
              person_id: person.id,
              related_person_id: mother.id,
              relationship_type: 'child',
              family_tree_id: tree.id,
              status: mother.is_living ? 'active' : 'deceased',
            })
          }

          logger.debug(`    ✓ Created parent-child: ${mother.full_name} → ${person.full_name}`)
        }
      }

      if (person.father_name) {
        const father = people.find((p) => p.full_name === person.father_name && p.gender === 'M')
        if (father) {
          // Check if parent-child relationship already exists
          const existingParentRel = await Relationship.query()
            .where('person_id', father.id)
            .where('related_person_id', person.id)
            .where('relationship_type', 'parent')
            .where('family_tree_id', tree.id)
            .first()

          if (!existingParentRel) {
            // Father -> Child
            await Relationship.create({
              person_id: father.id,
              related_person_id: person.id,
              relationship_type: 'parent',
              family_tree_id: tree.id,
              status: person.is_living ? 'active' : 'deceased',
            })
          }

          const existingChildRel = await Relationship.query()
            .where('person_id', person.id)
            .where('related_person_id', father.id)
            .where('relationship_type', 'child')
            .where('family_tree_id', tree.id)
            .first()

          if (!existingChildRel) {
            // Child -> Father
            await Relationship.create({
              person_id: person.id,
              related_person_id: father.id,
              relationship_type: 'child',
              family_tree_id: tree.id,
              status: father.is_living ? 'active' : 'deceased',
            })
          }

          logger.debug(`    ✓ Created parent-child: ${father.full_name} → ${person.full_name}`)
        }
      }
    }

    // Create sibling relationships
    const processedSiblings = new Set<string>()

    for (const person of people) {
      if (person.mother_name && person.father_name) {
        // Find siblings (same parents)
        const siblings = people.filter(
          (p) =>
            p.id !== person.id &&
            p.mother_name === person.mother_name &&
            p.father_name === person.father_name
        )

        for (const sibling of siblings) {
          const relationshipKey = [person.id, sibling.id].sort().join('-')

          if (!processedSiblings.has(relationshipKey)) {
            processedSiblings.add(relationshipKey)

            // Create bidirectional sibling relationships
            await Relationship.create({
              person_id: person.id,
              related_person_id: sibling.id,
              relationship_type: 'sibling',
              family_tree_id: tree.id,
              status: sibling.is_living ? 'active' : 'deceased',
            })

            await Relationship.create({
              person_id: sibling.id,
              related_person_id: person.id,
              relationship_type: 'sibling',
              family_tree_id: tree.id,
              status: person.is_living ? 'active' : 'deceased',
            })

            logger.debug(`    ✓ Created sibling: ${person.full_name} ↔ ${sibling.full_name}`)
          }
        }
      }
    }

    // Create grandparent relationships
    const processedGrandparents = new Set<string>()

    for (const person of people) {
      // Find grandparents through parents
      const parents = await Relationship.query()
        .where('related_person_id', person.id)
        .where('relationship_type', 'parent')
        .where('family_tree_id', tree.id)
        .preload('person')

      for (const parentRel of parents) {
        // Find parent's parents
        const grandparents = await Relationship.query()
          .where('related_person_id', parentRel.person_id)
          .where('relationship_type', 'parent')
          .where('family_tree_id', tree.id)
          .preload('person')

        for (const gpRel of grandparents) {
          const relationshipKey = `${gpRel.person_id}-${person.id}-grandparent`

          if (!processedGrandparents.has(relationshipKey)) {
            processedGrandparents.add(relationshipKey)
            processedGrandparents.add(`${person.id}-${gpRel.person_id}-grandchild`)

            // Grandparent -> Grandchild
            await Relationship.create({
              person_id: gpRel.person_id,
              related_person_id: person.id,
              relationship_type: 'grandparent',
              family_tree_id: tree.id,
              status: person.is_living && gpRel.person.is_living ? 'active' : 'deceased',
            })

            // Grandchild -> Grandparent
            await Relationship.create({
              person_id: person.id,
              related_person_id: gpRel.person_id,
              relationship_type: 'grandchild',
              family_tree_id: tree.id,
              status: person.is_living && gpRel.person.is_living ? 'active' : 'deceased',
            })

            logger.debug(
              `    ✓ Created grandparent: ${gpRel.person.full_name} → ${person.full_name}`
            )
          }
        }
      }
    }

    const totalRelationships = await Relationship.query()
      .where('family_tree_id', tree.id)
      .count('* as total')

    logger.debug(
      `    ✓ Total relationships created for tree: ${totalRelationships[0].$extras.total}`
    )
  }

  private groupByGeneration(people: Person[]): Record<string, Person[]> {
    const generations: Record<string, Person[]> = {}

    people.forEach((person) => {
      if (person.birth_date) {
        const decade = Math.floor(person.birth_date.year / 20) * 20
        const key = `${decade}s`

        if (!generations[key]) {
          generations[key] = []
        }

        generations[key].push(person)
      }
    })

    return generations
  }

  private calculateMarriageDate(person1: Person, person2: Person): DateTime | null {
    if (!person1.birth_date || !person2.birth_date) return null

    const olderPerson = person1.birth_date < person2.birth_date ? person1 : person2
    const marriageAge = 25 + Math.floor(Math.random() * 10) // 25-35 years old

    return olderPerson.birth_date!.plus({ years: marriageAge })
  }
}
