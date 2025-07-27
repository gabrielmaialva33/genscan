import factory from '@adonisjs/lucid/factories'

import FamilyTree from '#models/family_tree'
import { FamilyTreeMemberFactory } from './family_tree_member_factory.js'
import { RelationshipFactory } from './relationship_factory.js'

export const FamilyTreeFactory = factory
  .define(FamilyTree, async ({ faker }) => {
    return {
      name: `${faker.person.lastName()} Family Tree`,
      description: faker.lorem.paragraph(),
      owner_id: faker.string.uuid(),
      privacy: 'private' as const,
      settings: {
        theme: 'light',
        default_layout: 'tree',
        show_photos: true,
        show_dates: true,
      },
      cover_image_url: faker.image.url(),
      members_count: 0,
    }
  })
  .state('public', (tree) => {
    tree.privacy = 'public'
  })
  .state('family', (tree) => {
    tree.privacy = 'family'
  })
  .state('dark', (tree) => {
    tree.settings = { ...tree.settings, theme: 'dark' }
  })
  .relation('members', () => FamilyTreeMemberFactory)
  .relation('relationships', () => RelationshipFactory)
  .build()
