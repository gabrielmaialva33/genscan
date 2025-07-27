import vine from '@vinejs/vine'

export const addMemberValidator = vine.compile(
  vine.object({
    user_id: vine.string(),
    person_id: vine.string().uuid().optional(),
    role: vine.enum(['owner', 'admin', 'editor', 'viewer']),
    permissions: vine.object({
      can_add_people: vine.boolean(),
      can_edit_people: vine.boolean(),
      can_delete_people: vine.boolean(),
      can_invite_members: vine.boolean(),
      can_export: vine.boolean(),
    }),
  })
)

export const updateMemberPermissionsValidator = vine.withMetaData<{ memberId: string }>().compile(
  vine.object({
    role: vine.enum(['admin', 'editor', 'viewer']).optional(),
    permissions: vine
      .object({
        can_add_people: vine.boolean(),
        can_edit_people: vine.boolean(),
        can_delete_people: vine.boolean(),
        can_invite_members: vine.boolean(),
        can_export: vine.boolean(),
      })
      .optional(),
  })
)

export const acceptInvitationValidator = vine.compile(
  vine.object({
    invitation_token: vine.string().trim(),
  })
)
