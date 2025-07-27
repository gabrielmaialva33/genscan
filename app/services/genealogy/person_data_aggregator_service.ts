import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import FindexClient from '#services/integrations/findex_client'
import SiblingValidationService from '#services/genealogy/sibling_validation_service'
import NameMatchingService from '#services/genealogy/name_matching_service'
import DateValidationService from '#services/genealogy/date_validation_service'
import CpfDiscoveryService from '#services/genealogy/cpf_discovery_service'
import { FindexPersonResponse } from '#interfaces/findex_interface'
import IPerson from '#interfaces/person_interface'

interface AggregationContext {
  cpf?: string
  motherName?: string
  fatherName?: string
  fullName?: string
  birthDate?: string
}

interface AggregatedPersonData {
  person: Partial<IPerson.CreatePayload>
  relatives: Array<{
    cpf: string
    name: string
    relationship: string
  }>
  siblings: Array<{
    cpf: string
    name: string
    birthDate?: string
  }>
  additionalInfo: {
    hasMultipleSources: boolean
    sourcesUsed: string[]
    dataQuality: 'high' | 'medium' | 'low'
  }
}

/**
 * Service to aggregate person data by combining information from multiple API sources
 */
@inject()
export default class PersonDataAggregatorService {
  private readonly MAX_SIBLINGS_PER_SEARCH = 10

  constructor(
    private findexClient: FindexClient,
    private siblingValidation: SiblingValidationService,
    private nameMatching: NameMatchingService,
    private dateValidation: DateValidationService,
    private cpfDiscovery: CpfDiscoveryService
  ) {}

  /**
   * Aggregate person data using all available sources
   */
  async aggregatePersonData(context: AggregationContext): Promise<AggregatedPersonData | null> {
    const sourcesUsed: string[] = []
    let aggregatedData: AggregatedPersonData = {
      person: {},
      relatives: [],
      siblings: [],
      additionalInfo: {
        hasMultipleSources: false,
        sourcesUsed: [],
        dataQuality: 'low',
      },
    }

    try {
      // First, try to get data by CPF if available
      if (context.cpf && context.cpf !== 'SEM INFORMAÇÃO') {
        const cpfData = await this.aggregateFromCPF(context.cpf)
        if (cpfData) {
          aggregatedData = this.mergePersonData(aggregatedData, cpfData)
          sourcesUsed.push('cpf_search')
        }
      }

      // Search for siblings using parent names (mother and/or father)
      const motherName = aggregatedData.person.mother_name || context.motherName
      const fatherName = aggregatedData.person.father_name || context.fatherName

      if (
        (motherName && motherName !== 'SEM INFORMAÇÃO') ||
        (fatherName && fatherName !== 'SEM INFORMAÇÃO')
      ) {
        const parentSearchData = await this.aggregateFromParentSearches(
          {
            motherName,
            fatherName,
            cpf: context.cpf,
            birthDate: context.birthDate,
          },
          aggregatedData.person
        )

        if (parentSearchData) {
          aggregatedData = this.mergePersonData(aggregatedData, parentSearchData)
          sourcesUsed.push('parent_search_validated')
        }
      }

      // If we still don't have enough data and have a name, try searching by mother name of known relatives
      if (aggregatedData.relatives.length === 0 && context.fullName) {
        const expandedSearch = await this.expandSearchThroughRelatives(aggregatedData)
        if (expandedSearch) {
          aggregatedData = this.mergePersonData(aggregatedData, expandedSearch)
          sourcesUsed.push('expanded_search')
        }
      }

      // Update metadata
      aggregatedData.additionalInfo.sourcesUsed = sourcesUsed
      aggregatedData.additionalInfo.hasMultipleSources = sourcesUsed.length > 1
      aggregatedData.additionalInfo.dataQuality = this.assessDataQuality(aggregatedData)

      logger.info(
        `Aggregated data for ${context.cpf || context.fullName}: ${sourcesUsed.length} sources used, ${aggregatedData.relatives.length} relatives found, ${aggregatedData.siblings.length} siblings found`
      )

      return aggregatedData
    } catch (error) {
      logger.error('Failed to aggregate person data', error)
      return null
    }
  }

  /**
   * Aggregate data from CPF search
   */
  private async aggregateFromCPF(cpf: string): Promise<AggregatedPersonData | null> {
    try {
      const cpfData = await this.findexClient.searchByCPF(cpf)
      if (!cpfData) return null

      // Parse birth date
      let birthDate: DateTime | null = null
      if (cpfData.NASCIMENTO && cpfData.NASCIMENTO !== 'SEM INFORMAÇÃO') {
        birthDate = DateTime.fromFormat(cpfData.NASCIMENTO, 'dd/MM/yyyy')
        if (!birthDate.isValid) {
          logger.warn(`Invalid birth date format for CPF ${cpf}: ${cpfData.NASCIMENTO}`)
          birthDate = null
        }
      }

      return {
        person: {
          full_name: this.normalizeValue(cpfData.NOME) || undefined,
          national_id: cpfData.CPF,
          mother_name: this.normalizeValue(cpfData.NOME_MAE) || undefined,
          father_name: this.normalizeValue(cpfData.NOME_PAI) || undefined,
          gender: cpfData.SEXO as 'M' | 'F' | null,
          birth_date: birthDate || undefined,
        },
        relatives: this.extractRelativesFromCPFData(cpfData),
        siblings: [], // Will be filled by mother search
        additionalInfo: {
          hasMultipleSources: false,
          sourcesUsed: ['cpf_search'],
          dataQuality: 'high',
        },
      }
    } catch (error) {
      logger.error(`Failed to aggregate from CPF ${cpf}`, error)
      return null
    }
  }

  /**
   * Aggregate data from parent searches with sibling validation
   */
  private async aggregateFromParentSearches(
    context: AggregationContext,
    knownPersonData?: Partial<IPerson.CreatePayload>
  ): Promise<AggregatedPersonData | null> {
    try {
      const siblingCandidates = new Map<string, any>()
      const { motherName, fatherName, cpf: excludeCpf, birthDate } = context
      let actualMotherName = motherName
      let motherNameDiscoveredByFather = false

      // IMPROVED STRATEGY: Search by father first if available (more specific, fewer results)
      // Also attempt to discover mother's CPF if missing
      let discoveredMotherCpf: string | null = null
      let discoveredFatherCpf: string | null = null

      if (fatherName && fatherName !== 'SEM INFORMAÇÃO') {
        logger.info(`Starting with father search: ${fatherName}`)
        const fatherResults = await this.findexClient.searchByFatherName(fatherName)
        logger.info(`Found ${fatherResults.length} people with father: ${fatherName}`)

        // Check if we find the person we're looking for to get the correct mother name
        if (excludeCpf) {
          const ourPerson = fatherResults.find((p) => p.CPF === excludeCpf)
          if (ourPerson && ourPerson.MAE && ourPerson.MAE !== 'SEM INFORMAÇÃO') {
            const discoveredMotherName = this.normalizeValue(ourPerson.MAE)

            // If the mother name is different from what we have, use the discovered one
            if (
              discoveredMotherName &&
              (!actualMotherName ||
                !this.nameMatching.areNamesSimilar(actualMotherName, discoveredMotherName))
            ) {
              logger.info(
                `Discovered different mother name via father search: "${discoveredMotherName}" (was: "${actualMotherName}")`
              )
              actualMotherName = discoveredMotherName
              motherNameDiscoveredByFather = true
            }
          }
        }

        // Try to discover mother's CPF using father and children information
        if (actualMotherName && !discoveredMotherCpf) {
          const motherDiscovery = await this.cpfDiscovery.discoverParentCpf({
            personName: actualMotherName,
            spouseName: fatherName,
            childrenNames: fatherResults
              .map((p) => this.normalizeValue(p.NOME))
              .filter(Boolean) as string[],
            birthDate: knownPersonData?.birth_date?.toISODate() || undefined,
          })

          if (motherDiscovery && motherDiscovery.confidence >= 70) {
            discoveredMotherCpf = motherDiscovery.cpf
            logger.info(
              `Discovered mother's CPF: ${discoveredMotherCpf} for ${actualMotherName} ` +
                `(confidence: ${motherDiscovery.confidence}%)`
            )
            // Update mother name with the discovered variation if more complete
            if (motherDiscovery.name && motherDiscovery.name.length > actualMotherName.length) {
              actualMotherName = motherDiscovery.name
            }
          }
        }

        // Add all siblings found by father
        fatherResults.forEach((person) => {
          if (person.CPF !== excludeCpf) {
            siblingCandidates.set(person.CPF, {
              cpf: person.CPF,
              name: this.normalizeValue(person.NOME) || '',
              birthDate: person.NASCIMENTO,
              motherName: this.normalizeValue(person.MAE),
              fatherName: this.normalizeValue(person.PAI),
              foundByMother: false,
              foundByFather: true,
              rawData: person,
            })
          }
        })
      }

      // Search by mother name (using the discovered name if found)
      if (actualMotherName && actualMotherName !== 'SEM INFORMAÇÃO') {
        logger.info(
          `Searching siblings by mother: ${actualMotherName}${motherNameDiscoveredByFather ? ' (discovered via father)' : ''}` +
            `${discoveredMotherCpf ? ` (CPF: ${discoveredMotherCpf})` : ''}`
        )

        // If we discovered the mother's CPF, search by it for more accurate results
        let motherResults: any[] = []
        if (discoveredMotherCpf) {
          const motherData = await this.findexClient.searchByCPF(discoveredMotherCpf)
          if (motherData) {
            // Get children from mother's data
            const childrenFromMother = await this.findexClient.searchByMotherName(
              motherData.NOME || actualMotherName
            )
            motherResults = childrenFromMother
          }
        } else {
          motherResults = await this.findexClient.searchByMotherName(actualMotherName)
        }

        logger.info(`Found ${motherResults.length} people with mother: ${actualMotherName}`)

        motherResults.forEach((person) => {
          if (person.CPF !== excludeCpf) {
            // Validate with dates if available
            let isValidSibling = true
            if (birthDate && person.NASCIMENTO) {
              const validation = this.dateValidation.validateSiblingAge(
                birthDate,
                person.NASCIMENTO
              )
              isValidSibling = validation.isValid
              if (!isValidSibling) {
                logger.debug(
                  `Skipping potential sibling due to age validation: ${validation.reason}`
                )
              }
            }

            if (isValidSibling) {
              if (siblingCandidates.has(person.CPF)) {
                // Already found by father, mark as found by both
                siblingCandidates.get(person.CPF).foundByMother = true
              } else {
                // New candidate found only by mother
                siblingCandidates.set(person.CPF, {
                  cpf: person.CPF,
                  name: this.normalizeValue(person.NOME) || '',
                  birthDate: person.NASCIMENTO,
                  motherName: this.normalizeValue(person.MAE),
                  fatherName: this.normalizeValue(person.PAI),
                  foundByMother: true,
                  foundByFather: false,
                  rawData: person,
                })
              }
            }
          }
        })
        logger.info(`Total candidates after mother search: ${siblingCandidates.size}`)
      }

      // If no mother name but we have father, try to discover mother through father's other children
      if (
        (!actualMotherName || actualMotherName === 'SEM INFORMAÇÃO') &&
        fatherName &&
        siblingCandidates.size > 0
      ) {
        logger.info('Attempting to discover mother through siblings found by father')
        const siblingMotherNames = new Map<string, number>()

        for (const candidate of siblingCandidates.values()) {
          if (candidate.motherName) {
            siblingMotherNames.set(
              candidate.motherName,
              (siblingMotherNames.get(candidate.motherName) || 0) + 1
            )
          }
        }

        // Find the most common mother name among siblings
        if (siblingMotherNames.size > 0) {
          const [mostCommonMotherName, count] = Array.from(siblingMotherNames.entries()).sort(
            (a, b) => b[1] - a[1]
          )[0]

          if (count >= 2) {
            // At least 2 siblings share this mother
            logger.info(
              `Discovered likely mother name: ${mostCommonMotherName} (shared by ${count} siblings)`
            )
            actualMotherName = mostCommonMotherName

            // Try to find mother's CPF
            const motherDiscovery = await this.cpfDiscovery.discoverParentCpf({
              personName: mostCommonMotherName,
              spouseName: fatherName,
              childrenNames: Array.from(siblingCandidates.values())
                .filter((s) => s.motherName === mostCommonMotherName)
                .map((s) => s.name),
            })

            if (motherDiscovery) {
              discoveredMotherCpf = motherDiscovery.cpf
              logger.info(`Discovered mother's CPF through siblings: ${discoveredMotherCpf}`)
            }
          }
        }
      }

      // Validate siblings
      const candidates = Array.from(siblingCandidates.values())
      if (candidates.length === 0) {
        return null
      }

      // Prepare known person data for validation
      const knownPerson = {
        cpf: excludeCpf || '',
        birthDate: birthDate || knownPersonData?.birth_date,
        motherName: motherName,
        fatherName: fatherName,
      }

      // Validate all candidates
      const validatedSiblings = await this.siblingValidation.validateMultipleSiblings(
        knownPerson,
        candidates,
        { motherName: actualMotherName || motherName, fatherName }
      )

      // Log validation results
      logger.info(
        `Sibling validation complete: ${validatedSiblings.length} valid siblings from ${candidates.length} candidates`
      )

      // Take only the top validated siblings
      const topSiblings = validatedSiblings
        .slice(0, this.MAX_SIBLINGS_PER_SEARCH)
        .map((result) => ({
          cpf: result.candidate.cpf,
          name: result.candidate.name,
          birthDate: result.candidate.birthDate,
          confidenceScore: result.confidenceScore,
          foundByBoth: result.foundByMother && result.foundByFather,
        }))

      // Get person data from search results if available
      const personData = excludeCpf
        ? candidates.find((c) => c.rawData?.CPF === excludeCpf)?.rawData
        : null

      // Parse birth date if available
      let personBirthDate: DateTime | null = null
      if (personData?.NASCIMENTO && personData.NASCIMENTO !== 'SEM INFORMAÇÃO') {
        personBirthDate = DateTime.fromFormat(personData.NASCIMENTO, 'dd/MM/yyyy')
        if (!personBirthDate.isValid) {
          logger.warn(`Invalid birth date format: ${personData.NASCIMENTO}`)
          personBirthDate = null
        }
      }

      // Include discovered parent CPFs in relatives if found
      const discoveredRelatives: Array<{ cpf: string; name: string; relationship: string }> = []

      if (discoveredMotherCpf && actualMotherName) {
        discoveredRelatives.push({
          cpf: discoveredMotherCpf,
          name: actualMotherName,
          relationship: 'MAE',
        })
      }

      if (discoveredFatherCpf && fatherName) {
        discoveredRelatives.push({
          cpf: discoveredFatherCpf,
          name: fatherName,
          relationship: 'PAI',
        })
      }

      return {
        person: personData
          ? {
              full_name: this.normalizeValue(personData.NOME) || undefined,
              national_id: personData.CPF,
              mother_name:
                actualMotherName || this.normalizeValue(personData.MAE || motherName) || undefined,
              father_name: this.normalizeValue(personData.PAI || fatherName) || undefined,
              gender: personData.SEXO as 'M' | 'F' | null,
              birth_date: personBirthDate || undefined,
            }
          : {},
        relatives: discoveredRelatives,
        siblings: topSiblings,
        additionalInfo: {
          hasMultipleSources: !!(motherName && fatherName),
          sourcesUsed: [
            'parent_search_validated',
            ...(discoveredMotherCpf ? ['cpf_discovery'] : []),
          ],
          dataQuality: this.assessDataQualityFromSiblings(topSiblings),
        },
      }
    } catch (error) {
      logger.error('Failed to aggregate from parent searches', error)
      return null
    }
  }

  /**
   * Extract relatives from CPF data
   */
  private extractRelativesFromCPFData(
    cpfData: FindexPersonResponse
  ): Array<{ cpf: string; name: string; relationship: string }> {
    if (!cpfData.PARENTES || cpfData.PARENTES.length === 0) return []

    return cpfData.PARENTES.filter(
      (relative) =>
        relative.CPF_VINCULO &&
        relative.CPF_VINCULO !== 'SEM INFORMAÇÃO' &&
        relative.CPF_VINCULO.replace(/\D/g, '').length === 11
    ).map((relative) => ({
      cpf: relative.CPF_VINCULO,
      name: this.normalizeValue(relative.NOME_VINCULO) || '',
      relationship: relative.VINCULO,
    }))
  }

  /**
   * Expand search through relatives' connections
   */
  private async expandSearchThroughRelatives(
    currentData: AggregatedPersonData
  ): Promise<AggregatedPersonData | null> {
    try {
      const additionalRelatives: Array<{ cpf: string; name: string; relationship: string }> = []
      const processedCpfs = new Set<string>()

      // Search through each relative's connections
      for (const relative of currentData.relatives.slice(0, 3)) {
        // Limit to avoid too many API calls
        if (processedCpfs.has(relative.cpf)) continue
        processedCpfs.add(relative.cpf)

        const relativeData = await this.findexClient.searchByCPF(relative.cpf)
        if (relativeData?.PARENTES) {
          const newRelatives = this.extractRelativesFromCPFData(relativeData).filter(
            (r) => !processedCpfs.has(r.cpf)
          )
          additionalRelatives.push(...newRelatives)
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      return {
        person: currentData.person,
        relatives: [...currentData.relatives, ...additionalRelatives],
        siblings: currentData.siblings,
        additionalInfo: {
          hasMultipleSources: true,
          sourcesUsed: ['expanded_search'],
          dataQuality: 'low',
        },
      }
    } catch (error) {
      logger.error('Failed to expand search through relatives', error)
      return null
    }
  }

  /**
   * Merge person data from multiple sources
   */
  private mergePersonData(
    existing: AggregatedPersonData,
    newData: AggregatedPersonData
  ): AggregatedPersonData {
    // Merge person data, preferring non-null values
    const mergedPerson = { ...existing.person }
    for (const [key, value] of Object.entries(newData.person)) {
      if (value && value !== 'SEM INFORMAÇÃO' && !mergedPerson[key as keyof typeof mergedPerson]) {
        ;(mergedPerson as any)[key] = value
      }
    }

    // Merge relatives, avoiding duplicates
    const existingRelativeCpfs = new Set(existing.relatives.map((r) => r.cpf))
    const newRelatives = newData.relatives.filter((r) => !existingRelativeCpfs.has(r.cpf))

    // Merge siblings, avoiding duplicates
    const existingSiblingCpfs = new Set(existing.siblings.map((s) => s.cpf))
    const newSiblings = newData.siblings.filter((s) => !existingSiblingCpfs.has(s.cpf))

    return {
      person: mergedPerson,
      relatives: [...existing.relatives, ...newRelatives],
      siblings: [...existing.siblings, ...newSiblings],
      additionalInfo: {
        hasMultipleSources:
          existing.additionalInfo.hasMultipleSources || newData.additionalInfo.hasMultipleSources,
        sourcesUsed: [
          ...existing.additionalInfo.sourcesUsed,
          ...newData.additionalInfo.sourcesUsed,
        ],
        dataQuality: 'medium', // Will be reassessed
      },
    }
  }

  /**
   * Assess the quality of aggregateed data
   */
  private assessDataQuality(data: AggregatedPersonData): 'high' | 'medium' | 'low' {
    let score = 0

    // Check completeness of person data
    if (data.person.full_name) score += 2
    if (data.person.national_id) score += 2
    if (data.person.mother_name) score += 1
    if (data.person.father_name) score += 1

    // Check relatives and siblings
    if (data.relatives.length > 0) score += 2
    if (data.siblings.length > 0) score += 1

    // Check number of sources
    if (data.additionalInfo.sourcesUsed.length > 1) score += 2

    // Determine quality based on score
    if (score >= 8) return 'high'
    if (score >= 5) return 'medium'
    return 'low'
  }

  /**
   * Assess data quality from sibling validation results
   */
  private assessDataQualityFromSiblings(siblings: any[]): 'high' | 'medium' | 'low' {
    if (siblings.length === 0) return 'low'

    // Check if any siblings were found by both parents
    const foundByBoth = siblings.some((s) => s.foundByBoth)

    // Calculate average confidence score
    const avgConfidence =
      siblings.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / siblings.length

    if (foundByBoth && avgConfidence >= 80) return 'high'
    if (avgConfidence >= 70) return 'medium'
    return 'low'
  }

  /**
   * Normalize value from API (remove "SEM INFORMAÇÃO", trim, etc)
   */
  private normalizeValue(value: string | null | undefined): string | null {
    if (!value || value === 'SEM INFORMAÇÃO' || value === 'null') return null
    return value.trim()
  }

  /**
   * Discover parents through children search (reverse lookup)
   * This is useful when we have limited information about a person
   * but they might be listed as parents in their children's records
   */
  async discoverParentsThroughChildren(
    personName: string,
    approximateBirthYear?: number
  ): Promise<{
    possibleChildren: Array<{
      cpf: string
      name: string
      motherName: string | null
      fatherName: string | null
      birthDate?: string
    }>
    discoveredParentInfo: {
      motherNameVariations: string[]
      fatherNameVariations: string[]
      spouseNames: string[]
    }
  }> {
    try {
      const normalizedName = this.normalizeValue(personName)
      if (!normalizedName) {
        return {
          possibleChildren: [],
          discoveredParentInfo: {
            motherNameVariations: [],
            fatherNameVariations: [],
            spouseNames: [],
          },
        }
      }

      logger.info(`Starting reverse parent discovery for: ${normalizedName}`)

      // Search as mother
      const asMotherResults = await this.findexClient.searchByMotherName(normalizedName)

      // Search as father
      const asFatherResults = await this.findexClient.searchByFatherName(normalizedName)

      const possibleChildren: Map<string, any> = new Map()
      const motherNameVariations = new Set<string>()
      const fatherNameVariations = new Set<string>()
      const spouseNames = new Set<string>()

      // Process results where person is listed as mother
      asMotherResults.forEach((child) => {
        // If we have an approximate birth year, filter out unlikely matches
        if (approximateBirthYear && child.NASCIMENTO) {
          const childBirthYear = Number.parseInt(child.NASCIMENTO.substring(0, 4))
          const parentAge = childBirthYear - approximateBirthYear
          // Parent should be at least 15 and at most 60 when child was born
          if (parentAge < 15 || parentAge > 60) {
            return
          }
        }

        possibleChildren.set(child.CPF, {
          cpf: child.CPF,
          name: this.normalizeValue(child.NOME) || '',
          motherName: this.normalizeValue(child.MAE),
          fatherName: this.normalizeValue(child.PAI),
          birthDate: child.NASCIMENTO,
          parentRole: 'mother',
        })

        // Collect mother name variations
        const motherName = this.normalizeValue(child.MAE)
        if (motherName) motherNameVariations.add(motherName)

        // Collect spouse (father) names
        const fatherName = this.normalizeValue(child.PAI)
        if (fatherName) spouseNames.add(fatherName)
      })

      // Process results where person is listed as father
      asFatherResults.forEach((child) => {
        // If we have an approximate birth year, filter out unlikely matches
        if (approximateBirthYear && child.NASCIMENTO) {
          const childBirthYear = Number.parseInt(child.NASCIMENTO.substring(0, 4))
          const parentAge = childBirthYear - approximateBirthYear
          if (parentAge < 15 || parentAge > 60) {
            return
          }
        }

        if (possibleChildren.has(child.CPF)) {
          // Child found through both searches - high confidence
          possibleChildren.get(child.CPF).parentRole = 'both'
        } else {
          possibleChildren.set(child.CPF, {
            cpf: child.CPF,
            name: this.normalizeValue(child.NOME) || '',
            motherName: this.normalizeValue(child.MAE),
            fatherName: this.normalizeValue(child.PAI),
            birthDate: child.NASCIMENTO,
            parentRole: 'father',
          })
        }

        // Collect father name variations
        const fatherName = this.normalizeValue(child.PAI)
        if (fatherName) fatherNameVariations.add(fatherName)

        // Collect spouse (mother) names
        const motherName = this.normalizeValue(child.MAE)
        if (motherName) spouseNames.add(motherName)
      })

      const childrenArray = Array.from(possibleChildren.values())

      logger.info(
        `Reverse parent discovery complete: found ${childrenArray.length} possible children`
      )
      logger.info(
        `Discovered ${motherNameVariations.size} mother name variations, ${fatherNameVariations.size} father name variations`
      )

      return {
        possibleChildren: childrenArray,
        discoveredParentInfo: {
          motherNameVariations: Array.from(motherNameVariations),
          fatherNameVariations: Array.from(fatherNameVariations),
          spouseNames: Array.from(spouseNames),
        },
      }
    } catch (error) {
      logger.error('Failed to discover parents through children', error)
      return {
        possibleChildren: [],
        discoveredParentInfo: {
          motherNameVariations: [],
          fatherNameVariations: [],
          spouseNames: [],
        },
      }
    }
  }

  /**
   * Discover family connections through iterative searches
   */
  async discoverFamilyConnections(
    startingCpf: string,
    maxDepth: number = 2
  ): Promise<Map<string, Set<string>>> {
    const connections = new Map<string, Set<string>>()
    const processed = new Set<string>()
    const queue: Array<{ cpf: string; depth: number }> = [{ cpf: startingCpf, depth: 0 }]

    while (queue.length > 0) {
      const { cpf, depth } = queue.shift()!
      if (processed.has(cpf) || depth >= maxDepth) continue

      processed.add(cpf)

      const aggregatedData = await this.aggregatePersonData({ cpf })
      if (!aggregatedData) continue

      // Add connections
      const cpfConnections = connections.get(cpf) || new Set<string>()

      // Add relatives
      for (const relative of aggregatedData.relatives) {
        cpfConnections.add(relative.cpf)
        if (!processed.has(relative.cpf)) {
          queue.push({ cpf: relative.cpf, depth: depth + 1 })
        }
      }

      // Add siblings
      for (const sibling of aggregatedData.siblings) {
        cpfConnections.add(sibling.cpf)
        if (!processed.has(sibling.cpf)) {
          queue.push({ cpf: sibling.cpf, depth: depth + 1 })
        }
      }

      connections.set(cpf, cpfConnections)

      // Small delay between searches
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return connections
  }

  /**
   * Discover missing parent CPFs using available information
   */
  async discoverMissingParentCpfs(
    currentData: AggregatedPersonData,
    context: AggregationContext
  ): Promise<AggregatedPersonData> {
    const discoveredRelatives: Array<{ cpf: string; name: string; relationship: string }> = []

    try {
      // Check if we need to discover mother's CPF
      const motherName = currentData.person.mother_name || context.motherName
      const fatherName = currentData.person.father_name || context.fatherName
      const hasMotherCpf = currentData.relatives.some(
        (r) => r.relationship === 'MAE' && r.cpf && r.cpf !== 'SEM INFORMAÇÃO'
      )

      if (motherName && !hasMotherCpf) {
        logger.info(`Attempting to discover CPF for mother: ${motherName}`)

        const motherDiscovery = await this.cpfDiscovery.discoverParentCpf({
          personName: motherName,
          spouseName: fatherName,
          childrenNames: [
            ...(context.fullName ? [context.fullName] : []),
            ...currentData.siblings.map((s) => s.name),
          ].filter(Boolean),
          birthDate: context.birthDate,
        })

        if (motherDiscovery && motherDiscovery.confidence >= 70) {
          discoveredRelatives.push({
            cpf: motherDiscovery.cpf,
            name: motherDiscovery.name || motherName,
            relationship: 'MAE',
          })
          logger.info(
            `Successfully discovered mother's CPF: ${motherDiscovery.cpf} ` +
              `(confidence: ${motherDiscovery.confidence}%)`
          )
        }
      }

      // Check if we need to discover father's CPF
      const hasFatherCpf = currentData.relatives.some(
        (r) => r.relationship === 'PAI' && r.cpf && r.cpf !== 'SEM INFORMAÇÃO'
      )

      if (fatherName && !hasFatherCpf) {
        logger.info(`Attempting to discover CPF for father: ${fatherName}`)

        const fatherDiscovery = await this.cpfDiscovery.discoverParentCpf({
          personName: fatherName,
          spouseName: motherName,
          childrenNames: [
            ...(context.fullName ? [context.fullName] : []),
            ...currentData.siblings.map((s) => s.name),
          ].filter(Boolean),
          birthDate: context.birthDate,
        })

        if (fatherDiscovery && fatherDiscovery.confidence >= 70) {
          discoveredRelatives.push({
            cpf: fatherDiscovery.cpf,
            name: fatherDiscovery.name || fatherName,
            relationship: 'PAI',
          })
          logger.info(
            `Successfully discovered father's CPF: ${fatherDiscovery.cpf} ` +
              `(confidence: ${fatherDiscovery.confidence}%)`
          )
        }
      }

      return {
        person: currentData.person,
        relatives: discoveredRelatives,
        siblings: [],
        additionalInfo: {
          hasMultipleSources: false,
          sourcesUsed: ['cpf_discovery'],
          dataQuality: discoveredRelatives.length > 0 ? 'medium' : 'low',
        },
      }
    } catch (error) {
      logger.error('Failed to discover missing parent CPFs', error)
      return {
        person: currentData.person,
        relatives: [],
        siblings: [],
        additionalInfo: {
          hasMultipleSources: false,
          sourcesUsed: [],
          dataQuality: 'low',
        },
      }
    }
  }
}
