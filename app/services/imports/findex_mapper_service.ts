import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import {
  FindexPersonResponse,
  FindexMotherSearchResponse,
  FindexRelative,
} from '#interfaces/findex_interface'
import IPerson from '#interfaces/person_interface'
import IImport from '#interfaces/import_interface'

/**
 * Service to map Findex API data to application models
 */
@inject()
export default class FindexMapperService {
  /**
   * Map Findex person response to Person create payload
   */
  mapToPerson(data: FindexPersonResponse): IPerson.CreatePayload {
    // Parse birth date from DD/MM/YYYY format
    let birthDate: DateTime | null = null
    if (data.NASCIMENTO && data.NASCIMENTO !== 'SEM INFORMAÇÃO') {
      birthDate = DateTime.fromFormat(data.NASCIMENTO, 'dd/MM/yyyy')
      if (!birthDate.isValid) {
        birthDate = null
      }
    }

    return {
      full_name: this.normalizeName(data.NOME) || '',
      national_id: data.CPF,
      birth_date: birthDate,
      gender: this.mapGender(data.SEXO),
      mother_name: this.normalizeName(data.NOME_MAE),
      father_name: this.normalizeName(data.NOME_PAI),
    }
  }

  /**
   * Map Findex mother search response to Person create payload
   */
  mapMotherSearchToPerson(data: FindexMotherSearchResponse): IPerson.CreatePayload {
    // Parse birth date from DD/MM/YYYY format
    let birthDate: DateTime | null = null
    if (data.NASCIMENTO) {
      birthDate = DateTime.fromFormat(data.NASCIMENTO, 'dd/MM/yyyy')
      if (!birthDate.isValid) {
        birthDate = null
      }
    }

    return {
      full_name: this.normalizeName(data.NOME) || '',
      national_id: data.CPF,
      birth_date: birthDate,
      gender: this.mapGender(data.SEXO),
      mother_name: this.normalizeName(data.MAE),
      father_name: data.PAI ? this.normalizeName(data.PAI) : null,
    }
  }

  /**
   * Map Findex person response to PersonDetail create payload
   */
  mapToPersonDetail(data: FindexPersonResponse, personId: string): IPerson.PersonDetailPayload {
    const phoneNumbers = data.TELEFONES.filter(
      (phone) => phone.NUMBER && phone.NUMBER !== 'SEM INFORMAÇÃO'
    ).map((phone, index) => ({
      type: this.guessPhoneType(phone.NUMBER),
      number: this.normalizePhone(phone.NUMBER),
      is_primary: index === 0,
    }))

    const emails = data.EMAIL.filter(
      (email) => email.EMAIL && email.EMAIL !== 'SEM INFORMAÇÃO'
    ).map((email, index) => ({
      email: email.EMAIL.toLowerCase(),
      is_primary: index === 0,
    }))

    // Try to extract address information
    const addresses = data.ENDERECO.filter(
      (addr) => addr.LOGRADOURO && addr.LOGRADOURO !== 'SEM INFORMAÇÃO'
    ).map((addr) => ({
      type: 'home' as const,
      street: addr.LOGRADOURO || '',
      number: addr.LOGRADOURO_NUMERO || 's/n',
      complement: addr.COMPLEMENTO !== 'SEM INFORMAÇÃO' ? addr.COMPLEMENTO : undefined,
      neighborhood: addr.BAIRRO || '',
      city: addr.CIDADE || '',
      state: addr.UF || '',
      country: 'Brasil',
      zip_code: this.normalizeCEP(addr.CEP) || '',
    }))

    // Parse income
    let income: number | null = null
    if (data.RENDA && data.RENDA !== 'SEM INFORMAÇÃO') {
      income = Number.parseFloat(data.RENDA.replace(',', '.'))
      if (Number.isNaN(income)) income = null
    }

    return {
      person_id: personId,
      phone_numbers: phoneNumbers.length > 0 ? phoneNumbers : null,
      emails: emails.length > 0 ? emails : null,
      addresses: addresses.length > 0 ? addresses : null,
      income,
      marital_status: this.normalizeMaritalStatus(data.ESTADO_CIVIL),
      documents: {
        cpf: data.CPF,
        rg: data.RG !== 'SEM INFORMAÇÃO' ? data.RG : undefined,
        voter_id: data.TITULO_ELEITOR !== 'SEM INFORMAÇÃO' ? data.TITULO_ELEITOR : undefined,
        pis: data.PIS !== 'SEM INFORMAÇÃO' ? data.PIS : undefined,
      },
      api_data: {
        poder_aquisitivo: data.PODER_AQUISITIVO,
        fx_poder_aquisitivo: data.FX_PODER_AQUISITIVO,
        csb8: data.CSB8,
        csb8_faixa: data.CSB8_FAIXA,
        peso: data.PESO,
      },
    }
  }

  /**
   * Map Findex relatives to relationship mappings
   */
  mapRelatives(relatives: FindexRelative[]): IImport.RelativeMapping[] {
    return relatives.map((relative) => ({
      api_cpf: relative.CPF_VINCULO,
      api_name: this.normalizeName(relative.NOME_VINCULO) || '',
      api_relationship: relative.VINCULO,
      is_new: true,
      relationship_type: this.mapRelationshipType(relative.VINCULO),
    }))
  }

  /**
   * Map gender from API format
   */
  private mapGender(sexo: string): 'M' | 'F' | null {
    switch (sexo) {
      case 'M':
        return 'M'
      case 'F':
        return 'F'
      default:
        return null
    }
  }

  /**
   * Map relationship type from Portuguese to system format
   */
  private mapRelationshipType(
    vinculo: string
  ):
    | 'parent'
    | 'child'
    | 'spouse'
    | 'sibling'
    | 'grandparent'
    | 'grandchild'
    | 'uncle_aunt'
    | 'nephew_niece'
    | 'cousin' {
    const mapping: Record<string, IImport.RelativeMapping['relationship_type']> = {
      'MAE': 'parent',
      'PAI': 'parent',
      'IRMA(O)': 'sibling',
      'AVO': 'grandparent',
      'AVO(A)': 'grandparent',
      'TIA(O)': 'uncle_aunt',
      'PRIMA(O)': 'cousin',
      'SOBRINHA(O)': 'nephew_niece',
    }

    return mapping[vinculo] || 'cousin' // Default to cousin if unknown
  }

  /**
   * Normalize name (proper case, remove extra spaces)
   */
  private normalizeName(name: string | null | undefined): string | null {
    if (!name || name === 'SEM INFORMAÇÃO') return null

    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove non-numeric characters
    return phone.replace(/\D/g, '')
  }

  /**
   * Guess phone type based on number format
   */
  private guessPhoneType(phone: string): 'mobile' | 'home' | 'work' {
    const cleaned = phone.replace(/\D/g, '')
    // If starts with 9 or has 11 digits, likely mobile
    if (cleaned.length === 11 || (cleaned.length === 9 && cleaned[0] === '9')) {
      return 'mobile'
    }
    return 'home'
  }

  /**
   * Normalize CEP (zip code)
   */
  private normalizeCEP(cep: string | null): string | null {
    if (!cep || cep === 'SEM INFORMAÇÃO') return null
    return cep.replace(/\D/g, '')
  }

  /**
   * Normalize marital status
   */
  private normalizeMaritalStatus(status: string | null): string | null {
    if (!status || status === 'SEM INFORMAÇÃO') return null

    const mapping: Record<string, string> = {
      'SOLTEIRO': 'single',
      'CASADO': 'married',
      'DIVORCIADO': 'divorced',
      'VIUVO': 'widowed',
      'UNIAO ESTAVEL': 'domestic_partnership',
    }

    return mapping[status.toUpperCase()] || status.toLowerCase()
  }

  /**
   * Check if two people are likely the same based on CPF or name/birth
   */
  isLikelyDuplicate(
    person1: { national_id?: string | null; full_name: string; birth_date?: DateTime | null },
    person2: { national_id?: string | null; full_name: string; birth_date?: DateTime | null }
  ): boolean {
    // If both have CPF and they match, definitely duplicate
    if (person1.national_id && person2.national_id) {
      return person1.national_id === person2.national_id
    }

    // Check by name and birth date
    const namesMatch =
      this.normalizeName(person1.full_name) === this.normalizeName(person2.full_name)
    const birthDatesMatch =
      person1.birth_date &&
      person2.birth_date &&
      person1.birth_date.toISODate() === person2.birth_date.toISODate()

    return !!(namesMatch && birthDatesMatch)
  }
}
