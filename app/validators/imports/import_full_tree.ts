import vine from '@vinejs/vine'

/**
 * Validates import full tree request
 */
export const importFullTreeValidator = vine.compile(
  vine.object({
    cpf: vine
      .string()
      .trim()
      .regex(/^[0-9]{11}$/)
      .transform((value) => value.replace(/\D/g, '')),

    family_tree_id: vine.string().uuid(),

    max_depth: vine
      .number()
      .min(1)
      .max(5) // Maximum 5 levels deep for safety
      .optional()
      .transform((value) => value ?? 3), // Default 3 levels

    max_people: vine
      .number()
      .min(1)
      .max(1000) // Maximum 1000 people per import for safety
      .optional()
      .transform((value) => value ?? 500), // Default 500 people

    merge_duplicates: vine
      .boolean()
      .optional()
      .transform((value) => value ?? true), // Default true
  })
)
