import { DateTime } from 'luxon'
import Person from '#models/person'
import LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'

namespace IPerson {
  /**
   * Repository interface
   */
  export interface Repository extends LucidRepositoryInterface<typeof Person> {
    /**
     * Find person by national ID (CPF)
     */
    findByNationalId(nationalId: string): Promise<Person | null>

    /**
     * Find or create person with related details
     */
    findOrCreate(data: CreatePayload): Promise<Person>

    /**
     * Find people by mother's name
     */
    findByMotherName(motherName: string): Promise<Person[]>

    /**
     * Create person with details
     */
    createWithDetails(data: CreatePayload, details?: PersonDetailPayload): Promise<Person>

    /**
     * Search people by name, national ID, or mother name
     */
    search(query: string): Promise<Person[]>
  }

  /**
   * Create person payload
   */
  export interface CreatePayload {
    full_name: string
    national_id?: string | null
    birth_date?: DateTime | null
    gender?: 'M' | 'F' | 'O' | null
    is_living?: boolean
    birth_place?: string | null
    death_date?: DateTime | null
    death_place?: string | null
    mother_name?: string | null
    father_name?: string | null
    profile_photo_url?: string | null
    created_by?: number
  }

  /**
   * Update person payload
   */
  export interface UpdatePayload {
    full_name?: string
    national_id?: string | null
    birth_date?: DateTime | null
    gender?: 'M' | 'F' | 'O' | null
    is_living?: boolean
    birth_place?: string | null
    death_date?: DateTime | null
    death_place?: string | null
    mother_name?: string | null
    father_name?: string | null
    profile_photo_url?: string | null
    updated_by?: number
  }

  /**
   * Create person detail payload
   */
  export interface PersonDetailPayload {
    person_id: string
    phone_numbers?: Array<{
      type: 'mobile' | 'home' | 'work'
      number: string
      is_primary: boolean
    }> | null
    emails?: Array<{
      email: string
      is_primary: boolean
    }> | null
    addresses?: Array<{
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
    income?: number | null
    education_level?: string | null
    marital_status?: string | null
    blood_type?: string | null
    social_media?: {
      facebook?: string
      instagram?: string
      twitter?: string
      linkedin?: string
    } | null
    documents?: {
      cpf?: string
      rg?: string
      voter_id?: string
      passport?: string
      pis?: string
    } | null
    api_data?: Record<string, any> | null
  }
}

export default IPerson
