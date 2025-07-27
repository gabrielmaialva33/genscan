import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

interface SiblingValidationContext {
  motherName?: string
  fatherName?: string
  knownPerson: {
    cpf: string
    birthDate?: DateTime | string | null
    motherName?: string
    fatherName?: string
  }
  candidateSibling: {
    cpf: string
    name: string
    birthDate?: string
    motherName?: string
    fatherName?: string
  }
}

interface SiblingValidationResult {
  isValid: boolean
  confidenceScore: number // 0-100
  reasons: string[]
  foundByMother: boolean
  foundByFather: boolean
}

interface ConfidenceFactors {
  motherNameMatch: number
  fatherNameMatch: number
  foundByBothParents: number
  reasonableAgeDiff: number
  sameLastName: number
}

/**
 * Service to validate sibling relationships and calculate confidence scores
 */
@inject()
export default class SiblingValidationService {
  private readonly confidenceFactors: ConfidenceFactors = {
    motherNameMatch: 30,
    fatherNameMatch: 50,
    foundByBothParents: 20,
    reasonableAgeDiff: 20,
    sameLastName: 10,
  }

  private readonly MAX_SIBLING_AGE_DIFFERENCE = 20 // years
  private readonly MIN_CONFIDENCE_SCORE = 70

  /**
   * Validate if two people are likely siblings
   */
  async validateSibling(context: SiblingValidationContext): Promise<SiblingValidationResult> {
    let score = 0
    const reasons: string[] = []
    const foundByMother = this.isFoundByMother(context)
    const foundByFather = this.isFoundByFather(context)

    // Check if same person (by CPF)
    if (context.knownPerson.cpf === context.candidateSibling.cpf) {
      return {
        isValid: false,
        confidenceScore: 0,
        reasons: ['Same person (CPF match)'],
        foundByMother,
        foundByFather,
      }
    }

    // Validation 1: Mother name match
    if (this.validateMotherName(context)) {
      score += this.confidenceFactors.motherNameMatch
      reasons.push('Mother name matches')
    }

    // Validation 2: Father name match (more reliable)
    if (this.validateFatherName(context)) {
      score += this.confidenceFactors.fatherNameMatch
      reasons.push('Father name matches')
    }

    // Validation 3: Found by both parent searches
    if (foundByMother && foundByFather) {
      score += this.confidenceFactors.foundByBothParents
      reasons.push('Found in both mother and father searches')
    }

    // Validation 4: Age difference
    const ageDiff = this.calculateAgeDifference(context)
    if (ageDiff !== null && ageDiff <= this.MAX_SIBLING_AGE_DIFFERENCE) {
      score += this.confidenceFactors.reasonableAgeDiff
      reasons.push(`Age difference: ${ageDiff} years`)
    } else if (ageDiff !== null && ageDiff > this.MAX_SIBLING_AGE_DIFFERENCE) {
      // Penalize large age differences
      score -= 10
      reasons.push(`Large age difference: ${ageDiff} years`)
    }

    // Validation 5: Same last name
    if (this.haveSameLastName(context)) {
      score += this.confidenceFactors.sameLastName
      reasons.push('Same last name')
    }

    // Log validation result
    logger.info(
      `Sibling validation: ${context.candidateSibling.name} - Score: ${score}, Valid: ${score >= this.MIN_CONFIDENCE_SCORE}`
    )

    return {
      isValid: score >= this.MIN_CONFIDENCE_SCORE,
      confidenceScore: Math.min(100, Math.max(0, score)),
      reasons,
      foundByMother,
      foundByFather,
    }
  }

  /**
   * Validate multiple sibling candidates and return sorted by confidence
   */
  async validateMultipleSiblings(
    knownPerson: SiblingValidationContext['knownPerson'],
    candidates: SiblingValidationContext['candidateSibling'][],
    parentInfo: { motherName?: string; fatherName?: string }
  ): Promise<
    Array<SiblingValidationResult & { candidate: SiblingValidationContext['candidateSibling'] }>
  > {
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const validation = await this.validateSibling({
          motherName: parentInfo.motherName,
          fatherName: parentInfo.fatherName,
          knownPerson,
          candidateSibling: candidate,
        })
        return { ...validation, candidate }
      })
    )

    // Sort by confidence score (highest first) and filter valid ones
    return results.filter((r) => r.isValid).sort((a, b) => b.confidenceScore - a.confidenceScore)
  }

  /**
   * Check if mother names match
   */
  private validateMotherName(context: SiblingValidationContext): boolean {
    if (!context.motherName || !context.candidateSibling.motherName) {
      return false
    }

    const normalizedKnown = this.normalizeName(context.motherName)
    const normalizedCandidate = this.normalizeName(context.candidateSibling.motherName)

    return normalizedKnown === normalizedCandidate
  }

  /**
   * Check if father names match
   */
  private validateFatherName(context: SiblingValidationContext): boolean {
    if (!context.fatherName || !context.candidateSibling.fatherName) {
      return false
    }

    const normalizedKnown = this.normalizeName(context.fatherName)
    const normalizedCandidate = this.normalizeName(context.candidateSibling.fatherName)

    return normalizedKnown === normalizedCandidate
  }

  /**
   * Calculate age difference between two people
   */
  private calculateAgeDifference(context: SiblingValidationContext): number | null {
    if (!context.knownPerson.birthDate || !context.candidateSibling.birthDate) {
      return null
    }

    try {
      let knownBirthDate: DateTime
      if (typeof context.knownPerson.birthDate === 'string') {
        knownBirthDate = DateTime.fromFormat(context.knownPerson.birthDate, 'dd/MM/yyyy')
      } else if (context.knownPerson.birthDate instanceof DateTime) {
        knownBirthDate = context.knownPerson.birthDate
      } else {
        return null
      }

      const candidateBirthDate = DateTime.fromFormat(
        context.candidateSibling.birthDate,
        'dd/MM/yyyy'
      )

      if (!knownBirthDate.isValid || !candidateBirthDate.isValid) {
        return null
      }

      const diff = Math.abs(knownBirthDate.diff(candidateBirthDate, 'years').years)
      return Math.round(diff)
    } catch (error) {
      logger.error('Error calculating age difference', error)
      return null
    }
  }

  /**
   * Check if found by mother search
   */
  private isFoundByMother(context: SiblingValidationContext): boolean {
    return !!context.motherName && !!context.candidateSibling.motherName
  }

  /**
   * Check if found by father search
   */
  private isFoundByFather(context: SiblingValidationContext): boolean {
    return !!context.fatherName && !!context.candidateSibling.fatherName
  }

  /**
   * Check if two people have the same last name
   */
  private haveSameLastName(context: SiblingValidationContext): boolean {
    const knownLastName = this.extractLastName(context.knownPerson.motherName || '')
    const candidateLastName = this.extractLastName(context.candidateSibling.name)

    if (!knownLastName || !candidateLastName) {
      return false
    }

    return knownLastName.toUpperCase() === candidateLastName.toUpperCase()
  }

  /**
   * Extract last name from full name
   */
  private extractLastName(fullName: string): string | null {
    const parts = fullName.trim().split(' ')
    return parts.length > 1 ? parts[parts.length - 1] : null
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
  }

  /**
   * Get minimum confidence score
   */
  getMinConfidenceScore(): number {
    return this.MIN_CONFIDENCE_SCORE
  }

  /**
   * Get maximum siblings age difference
   */
  getMaxSiblingAgeDifference(): number {
    return this.MAX_SIBLING_AGE_DIFFERENCE
  }
}
