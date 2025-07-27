import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import FindexClient from '#services/integrations/findex_client'
import { FindexPersonResponse } from '#interfaces/findex_interface'
import IPerson from '#interfaces/person_interface'

interface EnrichmentContext {
  cpf?: string
  motherName?: string
  fatherName?: string
  fullName?: string
  birthDate?: string
}

interface EnrichedPersonData {
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
 * Service to enrich person data by combining information from multiple API sources
 */
@inject()
export default class DataEnrichmentService {
  constructor(private findexClient: FindexClient) {}

  /**
   * Enrich person data using all available sources
   */
  async enrichPersonData(context: EnrichmentContext): Promise<EnrichedPersonData | null> {
    const sourcesUsed: string[] = []
    let enrichedData: EnrichedPersonData = {
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
        const cpfData = await this.enrichFromCPF(context.cpf)
        if (cpfData) {
          enrichedData = this.mergePersonData(enrichedData, cpfData)
          sourcesUsed.push('cpf_search')
        }
      }

      // If we have mother name, search for siblings
      const motherName = enrichedData.person.mother_name || context.motherName
      if (motherName && motherName !== 'SEM INFORMAÇÃO') {
        const motherSearchData = await this.enrichFromMotherSearch(motherName, context.cpf)
        if (motherSearchData) {
          enrichedData = this.mergePersonData(enrichedData, motherSearchData)
          sourcesUsed.push('mother_search')
        }
      }

      // If we still don't have enough data and have a name, try searching by mother name of known relatives
      if (enrichedData.relatives.length === 0 && context.fullName) {
        const expandedSearch = await this.expandSearchThroughRelatives(enrichedData)
        if (expandedSearch) {
          enrichedData = this.mergePersonData(enrichedData, expandedSearch)
          sourcesUsed.push('expanded_search')
        }
      }

      // Update metadata
      enrichedData.additionalInfo.sourcesUsed = sourcesUsed
      enrichedData.additionalInfo.hasMultipleSources = sourcesUsed.length > 1
      enrichedData.additionalInfo.dataQuality = this.assessDataQuality(enrichedData)

      logger.info(
        `Enriched data for ${context.cpf || context.fullName}: ${sourcesUsed.length} sources used, ${enrichedData.relatives.length} relatives found, ${enrichedData.siblings.length} siblings found`
      )

      return enrichedData
    } catch (error) {
      logger.error('Failed to enrich person data', error)
      return null
    }
  }

  /**
   * Enrich data from CPF search
   */
  private async enrichFromCPF(cpf: string): Promise<EnrichedPersonData | null> {
    try {
      const cpfData = await this.findexClient.searchByCPF(cpf)
      if (!cpfData) return null

      return {
        person: {
          full_name: this.normalizeValue(cpfData.NOME) || undefined,
          national_id: cpfData.CPF,
          mother_name: this.normalizeValue(cpfData.NOME_MAE) || undefined,
          father_name: this.normalizeValue(cpfData.NOME_PAI) || undefined,
          gender: cpfData.SEXO as 'M' | 'F' | null,
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
      logger.error(`Failed to enrich from CPF ${cpf}`, error)
      return null
    }
  }

  /**
   * Enrich data from mother name search
   */
  private async enrichFromMotherSearch(
    motherName: string,
    excludeCpf?: string
  ): Promise<EnrichedPersonData | null> {
    try {
      const motherSearchResults = await this.findexClient.searchByMotherName(motherName)
      if (!motherSearchResults || motherSearchResults.length === 0) return null

      // Find siblings (same mother, different CPF)
      const siblings = motherSearchResults
        .filter((person) => person.CPF !== excludeCpf)
        .map((person) => ({
          cpf: person.CPF,
          name: this.normalizeValue(person.NOME) || '',
          birthDate: person.NASCIMENTO,
        }))

      // If we find the person in the results, enrich their data
      const personData = excludeCpf
        ? motherSearchResults.find((p) => p.CPF === excludeCpf)
        : motherSearchResults[0]

      return {
        person: personData
          ? {
              full_name: this.normalizeValue(personData.NOME) || undefined,
              national_id: personData.CPF,
              mother_name: this.normalizeValue(personData.MAE) || undefined,
              father_name: this.normalizeValue(personData.PAI) || undefined,
              gender: personData.SEXO as 'M' | 'F' | null,
            }
          : {},
        relatives: [],
        siblings,
        additionalInfo: {
          hasMultipleSources: false,
          sourcesUsed: ['mother_search'],
          dataQuality: 'medium',
        },
      }
    } catch (error) {
      logger.error(`Failed to enrich from mother search ${motherName}`, error)
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
    currentData: EnrichedPersonData
  ): Promise<EnrichedPersonData | null> {
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
    existing: EnrichedPersonData,
    newData: EnrichedPersonData
  ): EnrichedPersonData {
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
   * Assess the quality of enriched data
   */
  private assessDataQuality(data: EnrichedPersonData): 'high' | 'medium' | 'low' {
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
   * Normalize value from API (remove "SEM INFORMAÇÃO", trim, etc)
   */
  private normalizeValue(value: string | null | undefined): string | null {
    if (!value || value === 'SEM INFORMAÇÃO' || value === 'null') return null
    return value.trim()
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

      const enrichedData = await this.enrichPersonData({ cpf })
      if (!enrichedData) continue

      // Add connections
      const cpfConnections = connections.get(cpf) || new Set<string>()

      // Add relatives
      for (const relative of enrichedData.relatives) {
        cpfConnections.add(relative.cpf)
        if (!processed.has(relative.cpf)) {
          queue.push({ cpf: relative.cpf, depth: depth + 1 })
        }
      }

      // Add siblings
      for (const sibling of enrichedData.siblings) {
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
}
