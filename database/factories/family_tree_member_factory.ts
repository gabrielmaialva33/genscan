import factory from '@adonisjs/lucid/factories'
import FamilyTreeMember from '#models/family_tree_member'
import { DateTime } from 'luxon'

export const FamilyTreeMemberFactory = factory
  .define(FamilyTreeMember, async ({ faker }) => {
    const role = faker.helpers.arrayElement(['owner', 'admin', 'editor', 'viewer']) as
      | 'owner'
      | 'admin'
      | 'editor'
      | 'viewer'
    const invitationStatus = faker.helpers.arrayElement(['pending', 'accepted', 'rejected']) as
      | 'pending'
      | 'accepted'
      | 'rejected'

    return {
      family_tree_id: faker.string.uuid(),
      user_id: faker.number.int({ min: 1, max: 1000 }),
      person_id: faker.datatype.boolean({ probability: 0.8 }) ? faker.string.uuid() : null,
      role: role,
      invited_by: faker.number.int({ min: 1, max: 1000 }),
      invitation_token: invitationStatus === 'pending' ? faker.string.alphanumeric(32) : null,
      permissions: {
        can_edit: role !== 'viewer',
        can_delete: role === 'owner' || role === 'admin',
        can_invite: role === 'owner' || role === 'admin',
        can_export: true,
      },
      invitation_status: invitationStatus,
      invitation_sent_at:
        invitationStatus !== 'accepted'
          ? DateTime.fromJSDate(faker.date.recent({ days: 30 }))
          : null,
      joined_at:
        invitationStatus === 'accepted'
          ? DateTime.fromJSDate(faker.date.recent({ days: 20 }))
          : null,
    }
  })
  .build()
