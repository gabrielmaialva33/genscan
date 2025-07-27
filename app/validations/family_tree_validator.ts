import vine from '@vinejs/vine'

export const createFamilyTreeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().maxLength(1000).optional(),
    privacy: vine.enum(['private', 'public', 'family']),
    settings: vine
      .object({
        theme: vine.string().optional(),
        default_layout: vine.string().optional(),
        node_colors: vine.record(vine.string()).optional(),
        show_photos: vine.boolean().optional(),
        show_dates: vine.boolean().optional(),
      })
      .optional(),
    cover_image_url: vine.string().url().optional(),
  })
)

export const updateFamilyTreeValidator = vine.withMetaData<{ treeId: string }>().compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().maxLength(1000).nullable().optional(),
    privacy: vine.enum(['private', 'public', 'family']).optional(),
    settings: vine
      .object({
        theme: vine.string().optional(),
        default_layout: vine.string().optional(),
        node_colors: vine.record(vine.string()).optional(),
        show_photos: vine.boolean().optional(),
        show_dates: vine.boolean().optional(),
      })
      .optional(),
    cover_image_url: vine.string().url().nullable().optional(),
  })
)

export const inviteMemberValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    role: vine.enum(['viewer', 'editor', 'admin']),
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
