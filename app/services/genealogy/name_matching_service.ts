import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

/**
 * Service for intelligent name matching and similarity calculation
 * Used only when needed to avoid unnecessary API calls
 */
@inject()
export default class NameMatchingService {
  /**
   * Calculate similarity between two names using Levenshtein distance
   */
  calculateSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0

    const normalized1 = this.normalizeForComparison(name1)
    const normalized2 = this.normalizeForComparison(name2)

    // Exact match
    if (normalized1 === normalized2) return 1

    // Check if one name contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2
      const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2
      return shorter.length / longer.length
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalized1, normalized2)
    const maxLength = Math.max(normalized1.length, normalized2.length)
    const similarity = 1 - distance / maxLength

    return Math.max(0, similarity)
  }

  /**
   * Check if two names are likely the same person
   */
  areNamesSimilar(name1: string, name2: string, threshold: number = 0.85): boolean {
    const similarity = this.calculateSimilarity(name1, name2)

    if (similarity >= threshold) {
      logger.debug(`Names are similar: "${name1}" ≈ "${name2}" (${similarity.toFixed(2)})`)
      return true
    }

    return false
  }

  /**
   * Normalize name for comparison
   */
  private normalizeForComparison(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^A-Z\s]/g, '') // Keep only letters and spaces
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    // Initialize first column
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i]
    }

    // Initialize first row
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        }
      }
    }

    return matrix[str1.length][str2.length]
  }

  /**
   * Extract common parts between two names
   */
  extractCommonParts(name1: string, name2: string): string[] {
    const parts1 = this.normalizeForComparison(name1).split(' ')
    const parts2 = this.normalizeForComparison(name2).split(' ')

    return parts1.filter((part) => parts2.includes(part) && part.length > 2)
  }
}
