import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Person from '#models/person'

export default class PersonDetail extends BaseModel {
  static table = 'person_details'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare person_id: string

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare phone_numbers: Array<{
    type: 'mobile' | 'home' | 'work'
    number: string
    is_primary: boolean
  }> | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare emails: Array<{
    email: string
    is_primary: boolean
  }> | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare addresses: Array<{
    type: 'home' | 'work' | 'other'
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    country: string
    zip_code: string
  }> | null

  @column()
  declare income: number | null

  @column()
  declare education_level: string | null

  @column()
  declare marital_status: string | null

  @column()
  declare blood_type: string | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare social_media: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  } | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare documents: {
    cpf?: string
    rg?: string
    voter_id?: string
    passport?: string
    pis?: string
  } | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare api_data: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => Person, {
    foreignKey: 'person_id',
  })
  declare person: BelongsTo<typeof Person>

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Query Scopes
   * ------------------------------------------------------
   */
  static forPerson(query: any, personId: string) {
    query.where('person_id', personId)
  }

  /**
   * ------------------------------------------------------
   * Helper Methods
   * ------------------------------------------------------
   */
  getPrimaryPhone(): string | null {
    if (!this.phone_numbers || this.phone_numbers.length === 0) return null
    const primary = this.phone_numbers.find((p) => p.is_primary)
    return primary ? primary.number : this.phone_numbers[0].number
  }

  getPrimaryEmail(): string | null {
    if (!this.emails || this.emails.length === 0) return null
    const primary = this.emails.find((e) => e.is_primary)
    return primary ? primary.email : this.emails[0].email
  }

  getFullAddress(type: 'home' | 'work' | 'other' = 'home'): string | null {
    if (!this.addresses || this.addresses.length === 0) return null
    const address = this.addresses.find((a) => a.type === type) || this.addresses[0]
    return `${address.street}, ${address.number}${address.complement ? ' ' + address.complement : ''}, ${address.neighborhood}, ${address.city}/${address.state} - ${address.zip_code}`
  }
}
