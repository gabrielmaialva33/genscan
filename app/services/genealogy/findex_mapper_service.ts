import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  FindexPersonResponse,
  FindexMotherSearchResponse,
  FindexRelative,
} from '#interfaces/findex_interface'
import IPerson from '#interfaces/person_interface'
import IFamilyDiscovery from '#interfaces/family_discovery_interface'

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
        logger.warn(`Invalid birth date format for CPF ${data.CPF}: ${data.NASCIMENTO}`)
        birthDate = null
      } else {
        logger.debug(
          `Parsed birth date for ${data.CPF}: ${birthDate.toISODate()} from ${data.NASCIMENTO}`
        )
      }
    }

    const payload = {
      full_name: this.normalizeName(data.NOME) || '',
      national_id: data.CPF,
      birth_date: birthDate,
      gender: this.mapGender(data.SEXO),
      mother_name: this.normalizeName(data.NOME_MAE),
      father_name: this.normalizeName(data.NOME_PAI),
    }

    logger.debug(`Mapped person payload for ${data.CPF}:`, {
      ...payload,
      birth_date: payload.birth_date?.toISODate() || null,
    })

    return payload
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
      (email) => email.EMAIL && email.EMAIL !== 'SEM INFORMAÇÃO' && email.EMAIL.includes('@')
    ).map((email, index) => ({
      email: email.EMAIL.toLowerCase().trim(),
      is_primary: index === 0,
    }))

    // Try to extract address information - handle multiple addresses
    const addresses = data.ENDERECO.filter(
      (addr) => addr.LOGRADOURO && addr.LOGRADOURO !== 'SEM INFORMAÇÃO'
    ).map((addr, index) => ({
      type: (index === 0 ? 'home' : index === 1 ? 'work' : 'other') as 'home' | 'work' | 'other',
      street: addr.LOGRADOURO || '',
      number: addr.LOGRADOURO_NUMERO !== 'SEM INFORMAÇÃO' ? addr.LOGRADOURO_NUMERO : 's/n',
      complement:
        addr.COMPLEMENTO && addr.COMPLEMENTO !== 'SEM INFORMAÇÃO' ? addr.COMPLEMENTO : undefined,
      neighborhood: addr.BAIRRO !== 'SEM INFORMAÇÃO' ? addr.BAIRRO : '',
      city: addr.CIDADE !== 'SEM INFORMAÇÃO' ? addr.CIDADE : '',
      state: addr.UF !== 'SEM INFORMAÇÃO' ? addr.UF : '',
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
        rg: data.RG && data.RG !== 'SEM INFORMAÇÃO' ? data.RG : undefined,
        voter_id:
          data.TITULO_ELEITOR && data.TITULO_ELEITOR !== 'SEM INFORMAÇÃO'
            ? data.TITULO_ELEITOR
            : undefined,
        pis: data.PIS && data.PIS !== 'SEM INFORMAÇÃO' ? data.PIS : undefined,
        zone: data.ZONA && data.ZONA !== 'SEM INFORMAÇÃO' ? data.ZONA : undefined,
        section: data.SECAO && data.SECAO !== 'SEM INFORMAÇÃO' ? data.SECAO : undefined,
      },
      api_data: {
        poder_aquisitivo:
          data.PODER_AQUISITIVO !== 'SEM INFORMAÇÃO' ? data.PODER_AQUISITIVO : undefined,
        fx_poder_aquisitivo:
          data.FX_PODER_AQUISITIVO !== 'SEM INFORMAÇÃO' ? data.FX_PODER_AQUISITIVO : undefined,
        csb8: data.CSB8 !== 'SEM INFORMAÇÃO' ? data.CSB8 : undefined,
        csb8_faixa: data.CSB8_FAIXA !== 'SEM INFORMAÇÃO' ? data.CSB8_FAIXA : undefined,
        csba: data.CSBA !== 'SEM INFORMAÇÃO' ? data.CSBA : undefined,
        csba_faixa: data.CSBA_FAIXA !== 'SEM INFORMAÇÃO' ? data.CSBA_FAIXA : undefined,
        peso: data.PESO !== 'SEM INFORMAÇÃO' ? data.PESO : undefined,
      },
    }
  }

  /**
   * Map Findex relatives to relationship mappings
   */
  mapRelatives(relatives: FindexRelative[]): IFamilyDiscovery.RelativeMapping[] {
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
  private mapGender(sexo: string | null | undefined): 'M' | 'F' | 'O' | null {
    if (!sexo || sexo === 'SEM INFORMAÇÃO') return null

    const upperSexo = sexo.toUpperCase().trim()
    switch (upperSexo) {
      case 'M':
      case 'MASCULINO':
        return 'M'
      case 'F':
      case 'FEMININO':
        return 'F'
      case 'O':
      case 'OUTRO':
        return 'O'
      default:
        // Log unexpected gender values for debugging
        if (upperSexo && upperSexo !== 'null') {
          logger.warn(`Unexpected gender value from API: '${sexo}', returning null`)
        }
        // Return null for empty/invalid values to maintain data integrity
        return null
    }
  }

  /**
   * Map relationship type from Portuguese to system format
   * Note: This returns the relationship from the perspective of the API response
   * For example: If API says person B is "MAE" (mother) of person A,
   * then from A's perspective, B is their 'parent'
   */
  mapRelationshipType(
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
    const mapping: Record<string, IFamilyDiscovery.RelativeMapping['relationship_type']> = {
      // Parents
      'MAE': 'parent',
      'MÃE': 'parent',
      'PAI': 'parent',

      // Children
      'FILHA': 'child',
      'FILHO': 'child',
      'FILHA(O)': 'child',

      // Siblings
      'IRMA': 'sibling',
      'IRMÃO': 'sibling',
      'IRMÃ': 'sibling',
      'IRMA(O)': 'sibling',

      // Grandparents
      'AVO': 'grandparent',
      'AVÔ': 'grandparent',
      'AVÓ': 'grandparent',
      'AVO(A)': 'grandparent',

      // Grandchildren
      'NETO': 'grandchild',
      'NETA': 'grandchild',
      'NETO(A)': 'grandchild',

      // Uncles/Aunts
      'TIO': 'uncle_aunt',
      'TIA': 'uncle_aunt',
      'TIA(O)': 'uncle_aunt',

      // Nephews/Nieces
      'SOBRINHO': 'nephew_niece',
      'SOBRINHA': 'nephew_niece',
      'SOBRINHA(O)': 'nephew_niece',

      // Cousins
      'PRIMO': 'cousin',
      'PRIMA': 'cousin',
      'PRIMA(O)': 'cousin',

      // Spouses
      'ESPOSO': 'spouse',
      'ESPOSA': 'spouse',
      'CÔNJUGE': 'spouse',
      'MARIDO': 'spouse',
      'MULHER': 'spouse',
    }

    const normalized = vinculo.toUpperCase().trim()
    return mapping[normalized] || 'cousin' // Default to cousin if unknown
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
