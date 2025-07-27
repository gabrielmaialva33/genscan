import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import FindexClient from '#services/integrations/findex_client'
import NameMatchingService from '#services/genealogy/name_matching_service'
import DateValidationService from '#services/genealogy/date_validation_service'

interface DiscoveryContext {
  personName: string
  spouseName?: string
  childrenNames?: string[]
  birthDate?: string
  knownCpf?: string
}

interface DiscoveredCpf {
  cpf: string
  name: string
  confidence: number
  discoveryMethod: string
  nameVariations: string[]
}

/**
 * Service for discovering missing CPFs through reverse searches
 * Uses spouse and children information to find parent CPFs
 */
@inject()
export default class CpfDiscoveryService {
  private discoveryCache = new Map<string, DiscoveredCpf>()

  constructor(
    private findexClient: FindexClient,
    private nameMatching: NameMatchingService,
    private dateValidation: DateValidationService
  ) {}

  /**
   * Discover CPF for a parent using spouse and children information
   */
  async discoverParentCpf(context: DiscoveryContext): Promise<DiscoveredCpf | null> {
    const cacheKey = this.getCacheKey(context)
    if (this.discoveryCache.has(cacheKey)) {
      return this.discoveryCache.get(cacheKey)!
    }

    logger.info(`Starting CPF discovery for: ${context.personName}`)

    let bestCandidate: DiscoveredCpf | null = null

    // Strategy 1: Search through spouse
    if (context.spouseName) {
      const spouseCandidate = await this.discoverThroughSpouse(context)
      if (spouseCandidate) {
        bestCandidate = spouseCandidate
      }
    }

    // Strategy 2: Search through children
    if (context.childrenNames && context.childrenNames.length > 0) {
      const childrenCandidate = await this.discoverThroughChildren(context)
      if (childrenCandidate) {
        if (!bestCandidate || childrenCandidate.confidence > bestCandidate.confidence) {
          bestCandidate = childrenCandidate
        }
      }
    }

    // Strategy 3: Search by variations if we found name variations
    if (bestCandidate && bestCandidate.nameVariations.length > 1) {
      const variationCandidate = await this.searchByNameVariations(
        bestCandidate.nameVariations,
        context
      )
      if (variationCandidate && variationCandidate.confidence > bestCandidate.confidence) {
        bestCandidate = variationCandidate
      }
    }

    if (bestCandidate) {
      this.discoveryCache.set(cacheKey, bestCandidate)
      logger.info(
        `CPF discovered for ${context.personName}: ${bestCandidate.cpf} ` +
          `(confidence: ${bestCandidate.confidence}%, method: ${bestCandidate.discoveryMethod})`
      )
    }

    return bestCandidate
  }

  /**
   * Discover parent CPF through spouse searches
   */
  private async discoverThroughSpouse(context: DiscoveryContext): Promise<DiscoveredCpf | null> {
    if (!context.spouseName) return null

    try {
      logger.debug(`Searching for ${context.personName} through spouse ${context.spouseName}`)

      // Search by spouse as father
      const asFatherResults = await this.findexClient.searchByFatherName(context.spouseName)
      const motherNameVariations = new Set<string>()
      const candidateCpfs = new Map<string, number>()

      // Analyze results where spouse is listed as father
      for (const child of asFatherResults) {
        const motherName = this.normalizeValue(child.MAE)
        if (motherName) {
          motherNameVariations.add(motherName)

          // Check if this mother name matches our target
          if (this.nameMatching.areNamesSimilar(motherName, context.personName, 0.8)) {
            // If we have children names, validate
            if (context.childrenNames && context.childrenNames.length > 0) {
              const childName = this.normalizeValue(child.NOME)
              const isKnownChild = context.childrenNames.some(
                (known) => childName && this.nameMatching.areNamesSimilar(known, childName, 0.85)
              )
              if (isKnownChild) {
                // High confidence - known child
                candidateCpfs.set(motherName, (candidateCpfs.get(motherName) || 0) + 20)
              }
            } else {
              // Medium confidence - no children to validate
              candidateCpfs.set(motherName, (candidateCpfs.get(motherName) || 0) + 10)
            }
          }
        }
      }

      // Search by spouse as mother
      const asMotherResults = await this.findexClient.searchByMotherName(context.spouseName)
      const fatherNameVariations = new Set<string>()

      for (const child of asMotherResults) {
        const fatherName = this.normalizeValue(child.PAI)
        if (fatherName) {
          fatherNameVariations.add(fatherName)

          if (this.nameMatching.areNamesSimilar(fatherName, context.personName, 0.8)) {
            if (context.childrenNames && context.childrenNames.length > 0) {
              const childName = this.normalizeValue(child.NOME)
              const isKnownChild = context.childrenNames.some(
                (known) => childName && this.nameMatching.areNamesSimilar(known, childName, 0.85)
              )
              if (isKnownChild) {
                candidateCpfs.set(fatherName, (candidateCpfs.get(fatherName) || 0) + 20)
              }
            } else {
              candidateCpfs.set(fatherName, (candidateCpfs.get(fatherName) || 0) + 10)
            }
          }
        }
      }

      // Find best candidate and search for their CPF
      if (candidateCpfs.size > 0) {
        const [bestName, score] = Array.from(candidateCpfs.entries()).sort((a, b) => b[1] - a[1])[0]

        // Search for the discovered name variation
        const searchResults = await this.searchPersonByName(bestName, context)
        if (searchResults) {
          return {
            ...searchResults,
            confidence: Math.min(90, 60 + score),
            discoveryMethod: 'spouse_search',
            nameVariations: [
              ...Array.from(motherNameVariations),
              ...Array.from(fatherNameVariations),
            ].filter((name) => this.nameMatching.areNamesSimilar(name, context.personName, 0.7)),
          }
        }
      }

      return null
    } catch (error) {
      logger.error(`Error discovering through spouse: ${context.spouseName}`, error)
      return null
    }
  }

  /**
   * Discover parent CPF through children searches
   */
  private async discoverThroughChildren(context: DiscoveryContext): Promise<DiscoveredCpf | null> {
    if (!context.childrenNames || context.childrenNames.length === 0) return null

    try {
      const nameVariations = new Map<string, number>()
      const cpfCandidates = new Map<string, { name: string; count: number }>()

      // Search for each known child
      for (const childName of context.childrenNames) {
        logger.debug(`Searching parents through child: ${childName}`)

        // Get child data by name
        const childResults = await this.findexClient.searchByMotherName(childName)

        // This child might be listed as someone's parent
        for (const person of childResults) {
          // Check if this person could be our grandchild (child's child)
          const personMotherName = this.normalizeValue(person.MAE)
          const personFatherName = this.normalizeValue(person.PAI)

          // If the child name matches as mother or father, we found a grandchild
          if (
            (personMotherName &&
              this.nameMatching.areNamesSimilar(personMotherName, childName, 0.85)) ||
            (personFatherName &&
              this.nameMatching.areNamesSimilar(personFatherName, childName, 0.85))
          ) {
            // Now search for this grandchild's data to find grandparents
            if (person.CPF && person.CPF !== 'SEM INFORMAÇÃO') {
              const grandchildData = await this.findexClient.searchByCPF(person.CPF)
              if (grandchildData?.PARENTES) {
                // Look for grandparents in the relatives
                for (const relative of grandchildData.PARENTES) {
                  if (
                    relative.VINCULO === 'AVO(A)' ||
                    relative.VINCULO === 'AVO' ||
                    relative.VINCULO === 'AVÔ' ||
                    relative.VINCULO === 'AVÓ'
                  ) {
                    const relativeName = this.normalizeValue(relative.NOME_VINCULO)
                    if (
                      relativeName &&
                      this.nameMatching.areNamesSimilar(relativeName, context.personName, 0.8)
                    ) {
                      if (relative.CPF_VINCULO && relative.CPF_VINCULO !== 'SEM INFORMAÇÃO') {
                        cpfCandidates.set(relative.CPF_VINCULO, {
                          name: relativeName,
                          count: (cpfCandidates.get(relative.CPF_VINCULO)?.count || 0) + 1,
                        })
                      }
                      nameVariations.set(relativeName, (nameVariations.get(relativeName) || 0) + 1)
                    }
                  }
                }
              }
            }
          }
        }

        // Also search as father
        const fatherResults = await this.findexClient.searchByFatherName(childName)
        for (const person of fatherResults) {
          if (person.CPF && person.CPF !== 'SEM INFORMAÇÃO') {
            const grandchildData = await this.findexClient.searchByCPF(person.CPF)
            if (grandchildData?.PARENTES) {
              for (const relative of grandchildData.PARENTES) {
                if (relative.VINCULO === 'AVO' || relative.VINCULO === 'AVÔ') {
                  const relativeName = this.normalizeValue(relative.NOME_VINCULO)
                  if (
                    relativeName &&
                    this.nameMatching.areNamesSimilar(relativeName, context.personName, 0.8)
                  ) {
                    if (relative.CPF_VINCULO && relative.CPF_VINCULO !== 'SEM INFORMAÇÃO') {
                      cpfCandidates.set(relative.CPF_VINCULO, {
                        name: relativeName,
                        count: (cpfCandidates.get(relative.CPF_VINCULO)?.count || 0) + 1,
                      })
                    }
                    nameVariations.set(relativeName, (nameVariations.get(relativeName) || 0) + 1)
                  }
                }
              }
            }
          }
        }
      }

      // Find best CPF candidate
      if (cpfCandidates.size > 0) {
        const [bestCpf, data] = Array.from(cpfCandidates.entries()).sort(
          (a, b) => b[1].count - a[1].count
        )[0]

        return {
          cpf: bestCpf,
          name: data.name,
          confidence: Math.min(85, 50 + data.count * 10),
          discoveryMethod: 'children_search',
          nameVariations: Array.from(nameVariations.keys()),
        }
      }

      // If no direct CPF found, try searching by name variations
      if (nameVariations.size > 0) {
        const [bestNameVariation] = Array.from(nameVariations.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0]

        const searchResult = await this.searchPersonByName(bestNameVariation, context)
        if (searchResult) {
          return {
            ...searchResult,
            discoveryMethod: 'children_name_variation',
            nameVariations: Array.from(nameVariations.keys()),
          }
        }
      }

      return null
    } catch (error) {
      logger.error(`Error discovering through children: ${context.childrenNames.join(', ')}`, error)
      return null
    }
  }

  /**
   * Search for person by name variations
   */
  private async searchByNameVariations(
    nameVariations: string[],
    context: DiscoveryContext
  ): Promise<DiscoveredCpf | null> {
    logger.debug(`Searching by ${nameVariations.length} name variations`)

    for (const variation of nameVariations) {
      if (this.nameMatching.areNamesSimilar(variation, context.personName, 0.7)) {
        const result = await this.searchPersonByName(variation, context)
        if (result) {
          return {
            ...result,
            discoveryMethod: 'name_variation',
            nameVariations,
          }
        }
      }
    }

    return null
  }

  /**
   * Search for a person by name and validate with context
   */
  private async searchPersonByName(
    name: string,
    context: DiscoveryContext
  ): Promise<DiscoveredCpf | null> {
    try {
      // Try searching as mother first
      const asMotherResults = await this.findexClient.searchByMotherName(name)

      for (const result of asMotherResults) {
        if (result.CPF && result.CPF !== 'SEM INFORMAÇÃO') {
          // Validate with date if available
          if (context.birthDate && result.NASCIMENTO) {
            const validation = this.dateValidation.validateParentChildAge(
              result.NASCIMENTO,
              context.birthDate
            )
            if (!validation.isValid) {
              continue
            }
          }

          // Additional validation with known children
          if (context.childrenNames && context.childrenNames.length > 0) {
            const childName = this.normalizeValue(result.NOME)
            const isKnownChild = context.childrenNames.some(
              (known) => childName && this.nameMatching.areNamesSimilar(known, childName, 0.85)
            )
            if (isKnownChild) {
              return {
                cpf: result.CPF,
                name: this.normalizeValue(result.MAE) || name,
                confidence: 85,
                discoveryMethod: 'name_search_validated',
                nameVariations: [name],
              }
            }
          }

          // Return with lower confidence if no validation possible
          return {
            cpf: result.CPF,
            name: this.normalizeValue(result.MAE) || name,
            confidence: 60,
            discoveryMethod: 'name_search',
            nameVariations: [name],
          }
        }
      }

      // Try as father
      const asFatherResults = await this.findexClient.searchByFatherName(name)
      for (const result of asFatherResults) {
        if (result.CPF && result.CPF !== 'SEM INFORMAÇÃO') {
          if (context.birthDate && result.NASCIMENTO) {
            const validation = this.dateValidation.validateParentChildAge(
              result.NASCIMENTO,
              context.birthDate
            )
            if (!validation.isValid) {
              continue
            }
          }

          return {
            cpf: result.CPF,
            name: this.normalizeValue(result.PAI) || name,
            confidence: 60,
            discoveryMethod: 'name_search',
            nameVariations: [name],
          }
        }
      }

      return null
    } catch (error) {
      logger.error(`Error searching person by name: ${name}`, error)
      return null
    }
  }

  /**
   * Discover missing CPFs in a family tree node
   */
  async discoverMissingCpfsInFamily(familyData: any): Promise<Map<string, DiscoveredCpf>> {
    const discoveries = new Map<string, DiscoveredCpf>()

    // Check mother
    if (familyData.mother_name && !familyData.mother_cpf) {
      const motherContext: DiscoveryContext = {
        personName: familyData.mother_name,
        spouseName: familyData.father_name,
        childrenNames: familyData.children?.map((c: any) => c.name) || [familyData.full_name],
        birthDate: familyData.birth_date,
      }

      const motherCpf = await this.discoverParentCpf(motherContext)
      if (motherCpf) {
        discoveries.set('mother', motherCpf)
      }
    }

    // Check father
    if (familyData.father_name && !familyData.father_cpf) {
      const fatherContext: DiscoveryContext = {
        personName: familyData.father_name,
        spouseName: familyData.mother_name,
        childrenNames: familyData.children?.map((c: any) => c.name) || [familyData.full_name],
        birthDate: familyData.birth_date,
      }

      const fatherCpf = await this.discoverParentCpf(fatherContext)
      if (fatherCpf) {
        discoveries.set('father', fatherCpf)
      }
    }

    return discoveries
  }

  /**
   * Get cache key for discovery context
   */
  private getCacheKey(context: DiscoveryContext): string {
    return `${context.personName}:${context.spouseName || ''}:${context.birthDate || ''}`
  }

  /**
   * Normalize value from API
   */
  private normalizeValue(value: string | null | undefined): string | null {
    if (!value || value === 'SEM INFORMAÇÃO' || value === 'null') return null
    return value.trim()
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.discoveryCache.clear()
    logger.info('CPF discovery cache cleared')
  }
}
