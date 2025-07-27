import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

/**
 * Service for validating family relationships based on birth dates
 * Helps prevent false positives by ensuring age differences are plausible
 */
@inject()
export default class DateValidationService {
  /**
   * Validate parent-child relationship based on ages
   * Parents should be between 15-60 years older than their children
   */
  validateParentChildAge(
    parentBirth: string | DateTime | null,
    childBirth: string | DateTime | null
  ): { isValid: boolean; ageDifference?: number; reason?: string } {
    if (!parentBirth || !childBirth) {
      return { isValid: true, reason: 'Missing birth dates, cannot validate' }
    }

    try {
      const parentDate = this.parseDate(parentBirth)
      const childDate = this.parseDate(childBirth)

      if (!parentDate || !childDate) {
        return { isValid: true, reason: 'Invalid date format' }
      }

      const ageDifference = childDate.diff(parentDate, 'years').years

      if (ageDifference < 15) {
        return {
          isValid: false,
          ageDifference,
          reason: `Parent too young (${ageDifference} years) when child was born`,
        }
      }

      if (ageDifference > 60) {
        return {
          isValid: false,
          ageDifference,
          reason: `Parent too old (${ageDifference} years) when child was born`,
        }
      }

      return { isValid: true, ageDifference }
    } catch (error) {
      logger.error('Error validating parent-child age', error)
      return { isValid: true, reason: 'Error during validation' }
    }
  }

  /**
   * Validate sibling relationship based on ages
   * Siblings typically have less than 20 years age difference
   */
  validateSiblingAge(
    birth1: string | DateTime | null,
    birth2: string | DateTime | null
  ): { isValid: boolean; ageDifference?: number; reason?: string } {
    if (!birth1 || !birth2) {
      return { isValid: true, reason: 'Missing birth dates, cannot validate' }
    }

    try {
      const date1 = this.parseDate(birth1)
      const date2 = this.parseDate(birth2)

      if (!date1 || !date2) {
        return { isValid: true, reason: 'Invalid date format' }
      }

      const ageDifference = Math.abs(date1.diff(date2, 'years').years)

      if (ageDifference > 25) {
        return {
          isValid: false,
          ageDifference,
          reason: `Siblings too far apart in age (${ageDifference} years)`,
        }
      }

      return { isValid: true, ageDifference }
    } catch (error) {
      logger.error('Error validating sibling age', error)
      return { isValid: true, reason: 'Error during validation' }
    }
  }

  /**
   * Validate grandparent-grandchild relationship based on ages
   * Grandparents should be between 40-90 years older than grandchildren
   */
  validateGrandparentAge(
    grandparentBirth: string | DateTime | null,
    grandchildBirth: string | DateTime | null
  ): { isValid: boolean; ageDifference?: number; reason?: string } {
    if (!grandparentBirth || !grandchildBirth) {
      return { isValid: true, reason: 'Missing birth dates, cannot validate' }
    }

    try {
      const grandparentDate = this.parseDate(grandparentBirth)
      const grandchildDate = this.parseDate(grandchildBirth)

      if (!grandparentDate || !grandchildDate) {
        return { isValid: true, reason: 'Invalid date format' }
      }

      const ageDifference = grandchildDate.diff(grandparentDate, 'years').years

      if (ageDifference < 35) {
        return {
          isValid: false,
          ageDifference,
          reason: `Grandparent too young (${ageDifference} years) when grandchild was born`,
        }
      }

      if (ageDifference > 90) {
        return {
          isValid: false,
          ageDifference,
          reason: `Grandparent too old (${ageDifference} years) when grandchild was born`,
        }
      }

      return { isValid: true, ageDifference }
    } catch (error) {
      logger.error('Error validating grandparent age', error)
      return { isValid: true, reason: 'Error during validation' }
    }
  }

  /**
   * Validate spouse relationship based on ages
   * Spouses typically have less than 20 years age difference
   */
  validateSpouseAge(
    birth1: string | DateTime | null,
    birth2: string | DateTime | null
  ): { isValid: boolean; ageDifference?: number; reason?: string } {
    if (!birth1 || !birth2) {
      return { isValid: true, reason: 'Missing birth dates, cannot validate' }
    }

    try {
      const date1 = this.parseDate(birth1)
      const date2 = this.parseDate(birth2)

      if (!date1 || !date2) {
        return { isValid: true, reason: 'Invalid date format' }
      }

      const ageDifference = Math.abs(date1.diff(date2, 'years').years)

      if (ageDifference > 30) {
        return {
          isValid: false,
          ageDifference,
          reason: `Spouses too far apart in age (${ageDifference} years)`,
        }
      }

      return { isValid: true, ageDifference }
    } catch (error) {
      logger.error('Error validating spouse age', error)
      return { isValid: true, reason: 'Error during validation' }
    }
  }

  /**
   * General relationship validation based on relationship type
   */
  validateRelationshipByDates(
    person1Birth: string | DateTime | null,
    person2Birth: string | DateTime | null,
    relationshipType: string
  ): { isValid: boolean; ageDifference?: number; reason?: string } {
    switch (relationshipType.toLowerCase()) {
      case 'parent':
      case 'mae':
      case 'pai':
        return this.validateParentChildAge(person1Birth, person2Birth)

      case 'child':
      case 'filha(o)':
      case 'filho':
      case 'filha':
        return this.validateParentChildAge(person2Birth, person1Birth)

      case 'sibling':
      case 'irma(o)':
      case 'irmao':
      case 'irma':
        return this.validateSiblingAge(person1Birth, person2Birth)

      case 'grandparent':
      case 'avo':
      case 'avô':
        return this.validateGrandparentAge(person1Birth, person2Birth)

      case 'grandchild':
      case 'neto':
      case 'neta':
        return this.validateGrandparentAge(person2Birth, person1Birth)

      case 'spouse':
      case 'conjuge':
      case 'esposo':
      case 'esposa':
        return this.validateSpouseAge(person1Birth, person2Birth)

      default:
        return { isValid: true, reason: 'Unknown relationship type' }
    }
  }

  /**
   * Parse date from various formats
   */
  private parseDate(date: string | DateTime): DateTime | null {
    if (date instanceof DateTime) {
      return date.isValid ? date : null
    }

    if (!date || date === 'SEM INFORMAÇÃO') {
      return null
    }

    // Try multiple date formats
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy']

    for (const format of formats) {
      const parsed = DateTime.fromFormat(date, format)
      if (parsed.isValid) {
        return parsed
      }
    }

    // Try ISO format
    const isoDate = DateTime.fromISO(date)
    if (isoDate.isValid) {
      return isoDate
    }

    logger.warn(`Could not parse date: ${date}`)
    return null
  }

  /**
   * Calculate age at a specific date
   */
  calculateAgeAt(birthDate: string | DateTime, atDate: string | DateTime): number | null {
    const birth = this.parseDate(birthDate)
    const at = this.parseDate(atDate)

    if (!birth || !at) {
      return null
    }

    return Math.floor(at.diff(birth, 'years').years)
  }

  /**
   * Check if birth dates suggest same generation (cousins, siblings)
   */
  isSameGeneration(
    birth1: string | DateTime | null,
    birth2: string | DateTime | null,
    maxYearsDifference: number = 15
  ): boolean {
    if (!birth1 || !birth2) {
      return false
    }

    const date1 = this.parseDate(birth1)
    const date2 = this.parseDate(birth2)

    if (!date1 || !date2) {
      return false
    }

    return Math.abs(date1.diff(date2, 'years').years) <= maxYearsDifference
  }
}
