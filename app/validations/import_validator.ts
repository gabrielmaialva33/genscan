import vine from '@vinejs/vine'

export const importFromCpfValidator = vine.compile(
  vine.object({
    cpf: vine.string().trim().minLength(11).maxLength(14),
    family_tree_id: vine.string().uuid(),
    import_relatives: vine.boolean().optional(),
    merge_duplicates: vine.boolean().optional(),
  })
)

export const importFromMotherValidator = vine.compile(
  vine.object({
    mother_name: vine.string().trim().minLength(3).maxLength(255),
    family_tree_id: vine.string().uuid(),
    import_relatives: vine.boolean().optional(),
    merge_duplicates: vine.boolean().optional(),
  })
)

export const searchByMotherValidator = vine.compile(
  vine.object({
    mother_name: vine.string().trim().minLength(3).maxLength(255),
    limit: vine.number().min(1).max(100).optional(),
  })
)

export const searchByCpfValidator = vine.compile(
  vine.object({
    cpf: vine.string().trim().minLength(11).maxLength(14),
  })
)
