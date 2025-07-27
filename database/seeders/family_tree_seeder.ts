import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { FamilyTreeFactory } from '#database/factories/family_tree_factory'
import User from '#models/user'
import FamilyTree from '#models/family_tree'
import FamilyTreeMember from '#models/family_tree_member'
import logger from '@adonisjs/core/services/logger'

export default class FamilyTreeSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Check if family trees already exist
    const existingTrees = await FamilyTree.query().count('* as total')
    if (existingTrees[0].$extras.total > 0) {
      logger.info('Family trees already seeded, skipping...')
      return
    }

    // Get all users
    const users = await User.query().orderBy('created_at', 'asc')

    if (users.length === 0) {
      logger.warn('No users found. Please run UserSeeder first.')
      return
    }

    // Create family trees for each user
    for (const user of users.slice(0, 5)) {
      // First 5 users get family trees
      // Create a public historical family tree
      const publicTree = await FamilyTreeFactory.merge({
        name: `Família Real Portuguesa - ${user.full_name}`,
        description:
          'Árvore genealógica da família real portuguesa, incluindo a dinastia de Bragança e suas conexões com outras casas reais europeias.',
        owner_id: user.id,
        privacy: 'public',
        settings: {
          theme: 'classic',
          default_layout: 'tree',
          show_photos: true,
          show_dates: true,
          // show_places: true, // This property doesn't exist in the model
          // date_format: 'DD/MM/YYYY',
          // language: 'pt-BR',
        },
        cover_image_url: 'https://example.com/royal-portuguese-family.jpg',
        members_count: 0,
      }).create()

      // Add user as owner member
      await FamilyTreeMember.create({
        family_tree_id: publicTree.id,
        user_id: user.id,
        person_id: null, // Will be linked when creating people
        role: 'owner',
        invited_by: user.id,
        accepted_at: publicTree.created_at,
        invited_at: publicTree.created_at,
        permissions: {
          can_add_people: true,
          can_edit_people: true,
          can_delete_people: true,
          can_invite_members: true,
          can_export: true,
        },
      })

      logger.debug(`  ✓ Created public family tree: ${publicTree.name}`)

      // Create a private personal family tree
      const privateTree = await FamilyTreeFactory.merge({
        name: `Família ${user.full_name.split(' ').pop()}`,
        description: `Árvore genealógica privada da família ${user.full_name.split(' ').pop()}, incluindo ancestrais e descendentes diretos.`,
        owner_id: user.id,
        privacy: 'private',
        settings: {
          theme: 'modern',
          default_layout: 'fan',
          show_photos: true,
          show_dates: true,
          // show_places: true, // This property doesn't exist in the model
          // date_format: 'DD/MM/YYYY',
          // language: 'pt-BR',
        },
        members_count: 0,
      }).create()

      // Add user as owner member
      await FamilyTreeMember.create({
        family_tree_id: privateTree.id,
        user_id: user.id,
        person_id: null,
        role: 'owner',
        invited_by: user.id,
        accepted_at: publicTree.created_at,
        invited_at: privateTree.created_at,
        permissions: {
          can_add_people: true,
          can_edit_people: true,
          can_delete_people: true,
          can_invite_members: true,
          can_export: true,
        },
      })

      logger.debug(`  ✓ Created private family tree: ${privateTree.name}`)

      // Create a shared family tree (only for first 3 users)
      if (users.indexOf(user) < 3) {
        const sharedTree = await FamilyTreeFactory.merge({
          name: `Família Compartilhada - ${user.full_name}`,
          description:
            'Árvore genealógica compartilhada entre familiares para colaboração e preservação da história familiar.',
          owner_id: user.id,
          privacy: 'family',
          settings: {
            theme: 'warm',
            default_layout: 'pedigree',
            show_photos: true,
            show_dates: true,
            // show_places: false, // This property doesn't exist in the model
            // date_format: 'MM/DD/YYYY',
            // language: 'en-US',
          },
          members_count: 0,
        })
          .apply('dark')
          .create()

        // Add owner
        await FamilyTreeMember.create({
          family_tree_id: sharedTree.id,
          user_id: user.id,
          person_id: null,
          role: 'owner',
          invited_by: user.id,
          accepted_at: publicTree.created_at,
          invited_at: sharedTree.created_at,
          permissions: {
            can_add_people: true,
            can_edit_people: true,
            can_delete_people: true,
            can_invite_members: true,
            can_export: true,
          },
        })

        // Add other users as collaborators
        const collaborators = users.filter((u) => u.id !== user.id).slice(0, 2)
        for (const collaborator of collaborators) {
          await FamilyTreeMember.create({
            family_tree_id: sharedTree.id,
            user_id: collaborator.id,
            person_id: null,
            role: 'editor',
            invited_by: user.id,
            accepted_at: publicTree.created_at,
            invited_at: sharedTree.created_at,
            permissions: {
              can_add_people: true,
              can_edit_people: true,
              can_delete_people: false,
              can_invite_members: true,
              can_export: true,
            },
          })
        }

        logger.debug(
          `  ✓ Created shared family tree: ${sharedTree.name} with ${collaborators.length} collaborators`
        )
      }
    }

    // Update member counts
    const trees = await FamilyTree.all()
    for (const tree of trees) {
      const memberCount = await FamilyTreeMember.query()
        .where('family_tree_id', tree.id)
        .count('* as total')

      tree.members_count = memberCount[0].$extras.total
      await tree.save()
    }

    logger.debug('  ✓ Family tree seeding completed!')
  }
}
