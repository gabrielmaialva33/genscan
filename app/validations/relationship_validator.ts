import vine from '@vinejs/vine'

export const createRelationshipValidator = vine.compile(
  vine.object({
    person_id: vine.string().uuid(),
    related_person_id: vine.string().uuid().notSameAs('person_id'),
    relationship_type: vine.enum([
      'parent',
      'child',
      'spouse',
      'sibling',
      'grandparent',
      'grandchild',
      'uncle_aunt',
      'nephew_niece',
      'cousin',
    ]),
    family_tree_id: vine.string().uuid(),
    start_date: vine.date().optional(),
    end_date: vine.date().optional(),
    status: vine.enum(['active', 'ended', 'deceased']).optional(),
    notes: vine.string().trim().optional(),
  })
)

export const updateRelationshipValidator = vine.withMetaData<{ relationshipId: string }>().compile(
  vine.object({
    start_date: vine.date().nullable().optional(),
    end_date: vine.date().nullable().optional(),
    status: vine.enum(['active', 'ended', 'deceased']).optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)

export const bulkCreateRelationshipsValidator = vine.compile(
  vine.object({
    family_tree_id: vine.string().uuid(),
    relationships: vine.array(
      vine.object({
        person_id: vine.string().uuid(),
        related_person_id: vine.string().uuid(),
        relationship_type: vine.enum([
          'parent',
          'child',
          'spouse',
          'sibling',
          'grandparent',
          'grandchild',
          'uncle_aunt',
          'nephew_niece',
          'cousin',
        ]),
        start_date: vine.date().optional(),
        end_date: vine.date().optional(),
        status: vine.enum(['active', 'ended', 'deceased']).optional(),
        notes: vine.string().trim().optional(),
      })
    ),
  })
)
