import factory from '@adonisjs/lucid/factories'
import Relationship from '#models/relationship'
import { DateTime } from 'luxon'

export const RelationshipFactory = factory
  .define(Relationship, async ({ faker }) => {
    const relationshipTypes = [
      'parent',
      'child',
      'spouse',
      'sibling',
      'grandparent',
      'grandchild',
      'uncle_aunt',
      'nephew_niece',
      'cousin',
    ] as const

    return {
      person_id: faker.string.uuid(),
      related_person_id: faker.string.uuid(),
      relationship_type: faker.helpers.arrayElement(relationshipTypes),
      family_tree_id: faker.string.uuid(),
      start_date: faker.datatype.boolean({ probability: 0.3 })
        ? DateTime.fromJSDate(faker.date.past({ years: 30 }))
        : null,
      end_date: null,
      status: faker.helpers.arrayElement(['active', 'ended', 'deceased']) as
        | 'active'
        | 'ended'
        | 'deceased',
      notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
    }
  })
  .build()
