import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export const createPersonValidator = vine.compile(
  vine.object({
    national_id: vine
      .string()
      .trim()
      .maxLength(20)
      .unique(async (db, value) => {
        const person = await db.from('people').where('national_id', value).first()
        return !person
      })
      .optional(),
    full_name: vine.string().trim().minLength(2).maxLength(255),
    birth_date: vine
      .date()
      .transform((value) => (value ? DateTime.fromJSDate(value) : value))
      .optional(),
    death_date: vine
      .date()
      .transform((value) => (value ? DateTime.fromJSDate(value) : value))
      .optional(),
    gender: vine.enum(['M', 'F', 'O']).optional(),
    birth_place: vine.string().trim().maxLength(255).optional(),
    death_place: vine.string().trim().maxLength(255).optional(),
    occupation: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().optional(),
    photo_url: vine.string().url().maxLength(500).optional(),
    mother_name: vine.string().trim().maxLength(255).optional(),
    father_name: vine.string().trim().maxLength(255).optional(),
    details: vine
      .object({
        phone_numbers: vine
          .array(
            vine.object({
              type: vine.enum(['mobile', 'home', 'work']),
              number: vine.string().trim(),
              is_primary: vine.boolean(),
            })
          )
          .optional(),
        emails: vine
          .array(
            vine.object({
              email: vine.string().email().trim(),
              is_primary: vine.boolean(),
            })
          )
          .optional(),
        addresses: vine
          .array(
            vine.object({
              type: vine.enum(['home', 'work', 'other']),
              street: vine.string().trim(),
              number: vine.string().trim().optional(),
              complement: vine.string().trim().optional(),
              neighborhood: vine.string().trim().optional(),
              city: vine.string().trim(),
              state: vine.string().trim(),
              country: vine.string().trim(),
              zip_code: vine.string().trim().optional(),
            })
          )
          .optional(),
        income: vine.number().positive().optional(),
        education_level: vine
          .enum(['elementary', 'high_school', 'bachelor', 'master', 'doctorate'])
          .optional(),
        marital_status: vine.enum(['single', 'married', 'divorced', 'widowed']).optional(),
        blood_type: vine.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
        social_media: vine
          .object({
            facebook: vine.string().trim().optional(),
            instagram: vine.string().trim().optional(),
            twitter: vine.string().trim().optional(),
            linkedin: vine.string().trim().optional(),
          })
          .optional(),
        documents: vine
          .object({
            cpf: vine.string().trim().optional(),
            rg: vine.string().trim().optional(),
            voter_id: vine.string().trim().optional(),
          })
          .optional(),
      })
      .optional(),
  })
)

export const updatePersonValidator = vine.withMetaData<{ personId: string }>().compile(
  vine.object({
    national_id: vine
      .string()
      .trim()
      .maxLength(20)
      .unique(async (db, value, field) => {
        const person = await db
          .from('people')
          .whereNot('id', field.meta.personId)
          .where('national_id', value)
          .first()
        return !person
      })
      .nullable()
      .optional(),
    full_name: vine.string().trim().minLength(2).maxLength(255).optional(),
    birth_date: vine
      .date()
      .transform((value) => (value ? DateTime.fromJSDate(value) : value))
      .nullable()
      .optional(),
    death_date: vine
      .date()
      .transform((value) => (value ? DateTime.fromJSDate(value) : value))
      .nullable()
      .optional(),
    gender: vine.enum(['M', 'F', 'O']).nullable().optional(),
    birth_place: vine.string().trim().maxLength(255).nullable().optional(),
    death_place: vine.string().trim().maxLength(255).nullable().optional(),
    occupation: vine.string().trim().maxLength(255).nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    photo_url: vine.string().url().maxLength(500).nullable().optional(),
    mother_name: vine.string().trim().maxLength(255).nullable().optional(),
    father_name: vine.string().trim().maxLength(255).nullable().optional(),
  })
)

export const searchPersonValidator = vine.compile(
  vine.object({
    query: vine.string().trim().minLength(2).optional(),
    family_tree_id: vine.string().uuid().optional(),
    gender: vine.enum(['M', 'F', 'O']).optional(),
    birth_year_from: vine.number().optional(),
    birth_year_to: vine.number().optional(),
    is_living: vine.boolean().optional(),
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
  })
)
