import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import FindexClient from '#services/integrations/findex_client'
import FindexCacheService from '#services/integrations/findex_cache_service'
import FindexMapperService from '#services/imports/findex_mapper_service'
import RelationshipInferenceService from '#services/imports/relationship_inference_service'
import DataEnrichmentService from '#services/imports/data_enrichment_service'
import PeopleRepository from '#repositories/people_repository'
import PersonDetail from '#models/person_detail'
import FamilyTreeMember from '#models/family_tree_member'
import RelationshipsRepository from '#repositories/relationships_repository'
import DataImportsRepository from '#repositories/data_imports_repository'
import IImport from '#interfaces/import_interface'
import IPerson from '#interfaces/person_interface'

interface TreeNode {
  cpf: string
  name: string
  level: number
  person_id?: string
  processed: boolean
  parent_cpf?: string
  relationship_to_parent?: string // Original API relationship (MAE, PAI, FILHA(O), etc)
  source?: 'cpf_search' | 'mother_search' | 'relative'
}

interface ImportFullTreePayload {
  cpf: string
  family_tree_id: string
  user_id: number
  max_depth?: number
  max_people?: number
  merge_duplicates?: boolean
}

interface ImportFullTreeResult extends IImport.ImportResult {
  total_levels: number
  tree_structure: TreeNode[]
}

/**
 * Service to import full genealogy tree from a starting CPF
 * Uses BFS (Breadth-First Search) to explore the tree level by level
 */
@inject()
export default class ImportFullTreeService {
  private readonly DEFAULT_MAX_DEPTH = 3
  private readonly DEFAULT_MAX_PEOPLE = 500
  private readonly BATCH_SIZE = 10 // Process in batches to avoid overwhelming the API

  constructor(
    private findexClient: FindexClient,
    private cacheService: FindexCacheService,
    private findexMapper: FindexMapperService,
    private relationshipInference: RelationshipInferenceService,
    private dataEnrichment: DataEnrichmentService,
    private peopleRepository: PeopleRepository,
    private relationshipsRepository: RelationshipsRepository,
    private importsRepository: DataImportsRepository
  ) {}

  /**
   * Import full genealogy tree starting from a CPF
   */
  async run(payload: ImportFullTreePayload): Promise<ImportFullTreeResult> {
    const {
      cpf,
      family_tree_id: familyTreeId,
      user_id: userId,
      max_depth: maxDepth = this.DEFAULT_MAX_DEPTH,
      max_people: maxPeople = this.DEFAULT_MAX_PEOPLE,
      merge_duplicates: mergeDuplicates = true,
    } = payload

    logger.info(`Starting full tree import from CPF ${cpf} with max depth ${maxDepth}`)

    // Create import record
    const dataImport = await this.importsRepository.createImport(
      'national_id',
      `tree:${cpf}:depth${maxDepth}`,
      userId,
      familyTreeId
    )

    try {
      await this.importsRepository.markAsProcessing(dataImport.id)

      // Initialize tracking structures
      const processedCPFs = new Set<string>()
      const queue: TreeNode[] = []
      const treeStructure: TreeNode[] = []
      const cpfToPersonId = new Map<string, string>()

      // Track import progress
      const progress: ImportFullTreeResult = {
        import_id: dataImport.id,
        status: 'success',
        persons_created: 0,
        relationships_created: 0,
        persons_updated: 0,
        duplicates_found: 0,
        errors: [],
        total_levels: 0,
        tree_structure: treeStructure,
      }

      // Add starting CPF to queue
      queue.push({
        cpf: cpf.replace(/\D/g, ''),
        name: 'Root Person',
        level: 0,
        processed: false,
      })

      // BFS traversal
      while (queue.length > 0 && processedCPFs.size < maxPeople) {
        const currentBatch = queue.splice(0, this.BATCH_SIZE)

        for (const node of currentBatch) {
          // Skip if already processed or exceeds depth
          if (processedCPFs.has(node.cpf) || node.level > maxDepth) {
            continue
          }

          try {
            // Process person
            const result = await this.processPerson(
              node,
              familyTreeId,
              userId,
              mergeDuplicates,
              processedCPFs,
              cpfToPersonId
            )

            if (result) {
              // Update progress
              progress.persons_created += result.isNew ? 1 : 0
              progress.persons_updated += result.isNew ? 0 : 1
              progress.duplicates_found += result.isDuplicate ? 1 : 0
              progress.total_levels = Math.max(progress.total_levels, node.level)

              // Add to tree structure
              treeStructure.push({
                ...node,
                person_id: result.personId,
                name: result.name,
                processed: true,
              })

              // Add relatives to queue if within depth limit
              if (node.level < maxDepth && result.relatives) {
                for (const relative of result.relatives) {
                  // Validate CPF before adding to queue
                  const cleanCpf = relative.api_cpf?.replace(/\D/g, '')
                  if (
                    cleanCpf &&
                    cleanCpf.length === 11 &&
                    relative.api_cpf !== 'SEM INFORMAÇÃO' &&
                    !processedCPFs.has(relative.api_cpf)
                  ) {
                    queue.push({
                      cpf: relative.api_cpf,
                      name: relative.api_name,
                      level: node.level + 1,
                      processed: false,
                      parent_cpf: node.cpf,
                      relationship_to_parent: relative.api_relationship,
                      source: 'relative',
                    })
                  }
                }
              }

              // Add siblings to queue if within depth limit
              if (node.level < maxDepth && result.siblings) {
                for (const sibling of result.siblings) {
                  const cleanCpf = sibling.cpf?.replace(/\D/g, '')
                  if (cleanCpf && cleanCpf.length === 11 && !processedCPFs.has(sibling.cpf)) {
                    queue.push({
                      cpf: sibling.cpf,
                      name: sibling.name,
                      level: node.level, // Siblings are at same level
                      processed: false,
                      parent_cpf: node.cpf,
                      relationship_to_parent: 'SIBLING',
                      source: 'mother_search',
                    })
                  }
                }
              }

              // Create relationships with intelligent mapping
              if (node.parent_cpf && cpfToPersonId.has(node.parent_cpf)) {
                const parentPersonId = cpfToPersonId.get(node.parent_cpf)!

                if (node.relationship_to_parent === 'SIBLING') {
                  // Handle sibling relationships
                  await this.createRelationshipIfNeeded(
                    parentPersonId,
                    result.personId,
                    familyTreeId,
                    progress,
                    'sibling'
                  )
                } else if (node.relationship_to_parent) {
                  // Use inference service to determine correct relationship
                  const inference = this.relationshipInference.inferRelationship({
                    fromPersonId: parentPersonId,
                    toPersonId: result.personId,
                    apiRelationship: node.relationship_to_parent,
                    fromPersonName: treeStructure.find((n) => n.person_id === parentPersonId)?.name,
                    toPersonName: result.name,
                    levelDifference: Math.abs(
                      node.level -
                        (treeStructure.find((n) => n.person_id === parentPersonId)?.level || 0)
                    ),
                  })

                  await this.createRelationshipIfNeeded(
                    parentPersonId,
                    result.personId,
                    familyTreeId,
                    progress,
                    inference.forward
                  )
                }
              }

              // Create sibling relationships discovered through mother search
              if (result.siblings && result.siblings.length > 0) {
                for (const sibling of result.siblings) {
                  if (cpfToPersonId.has(sibling.cpf)) {
                    const siblingPersonId = cpfToPersonId.get(sibling.cpf)!
                    await this.createRelationshipIfNeeded(
                      result.personId,
                      siblingPersonId,
                      familyTreeId,
                      progress,
                      'sibling'
                    )
                  }
                }
              }
            }
          } catch (error) {
            logger.error(`Failed to process CPF ${node.cpf} at level ${node.level}`, error)
            progress.errors?.push({
              person: `${node.name} (${node.cpf})`,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }

          // Mark as processed
          processedCPFs.add(node.cpf)

          // Log progress periodically
          if (processedCPFs.size % 10 === 0) {
            logger.info(
              `Tree import progress: ${processedCPFs.size} CPFs processed, ${queue.length} in queue`
            )
            await this.importsRepository.updateProgress(dataImport.id, progress)
          }
        }

        // Small delay between batches to avoid overwhelming the API
        if (queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      // Set final status
      if (progress.errors && progress.errors.length > 0) {
        progress.status = progress.persons_created > 0 ? 'partial' : 'failed'
      }

      // Update import record
      await this.importsRepository.updateProgress(dataImport.id, progress)
      await this.importsRepository.markAsCompleted(dataImport.id, {
        created_person_ids: Array.from(cpfToPersonId.values()),
        errors: progress.errors,
      })

      logger.info(
        `Full tree import completed: ${progress.persons_created} created, ` +
          `${progress.persons_updated} updated, ${progress.relationships_created} relationships, ` +
          `${progress.total_levels + 1} levels deep, ${processedCPFs.size} total people`
      )

      return progress
    } catch (error) {
      logger.error('Full tree import failed', error)
      await this.importsRepository.markAsFailed(
        dataImport.id,
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }

  /**
   * Process a single person node with data enrichment
   */
  private async processPerson(
    node: TreeNode,
    familyTreeId: string,
    userId: number,
    mergeDuplicates: boolean,
    processedCPFs: Set<string>,
    cpfToPersonId: Map<string, string>
  ): Promise<{
    personId: string
    name: string
    isNew: boolean
    isDuplicate: boolean
    relatives?: IImport.RelativeMapping[]
    siblings?: Array<{ cpf: string; name: string }>
  } | null> {
    try {
      // Check if already in our mapping
      if (cpfToPersonId.has(node.cpf)) {
        const existingPerson = await this.peopleRepository.find(cpfToPersonId.get(node.cpf)!)
        return {
          personId: cpfToPersonId.get(node.cpf)!,
          name: existingPerson?.full_name || node.name,
          isNew: false,
          isDuplicate: false,
        }
      }

      // Use data enrichment service to get comprehensive data
      const enrichedData = await this.dataEnrichment.enrichPersonData({
        cpf: node.cpf,
        fullName: node.name,
      })

      if (!enrichedData || !enrichedData.person.full_name) {
        logger.warn(`No enriched data found for CPF ${node.cpf}`)
        return null
      }

      // Prepare person data
      const personData = {
        ...enrichedData.person,
        created_by: userId,
      } as IPerson.CreatePayload

      // Check if person exists
      let person = await this.peopleRepository.findByNationalId(node.cpf)
      let isNew = false
      let isDuplicate = false

      if (!person) {
        // Check for duplicates
        if (mergeDuplicates && personData.full_name && personData.birth_date) {
          const potentialDuplicates = await this.peopleRepository.search(personData.full_name)
          const duplicate = potentialDuplicates.find((p) =>
            this.findexMapper.isLikelyDuplicate(personData, p)
          )

          if (duplicate) {
            person = duplicate
            await person.merge(personData).save()
            isDuplicate = true
            logger.info(`Merged with existing person: ${person.id}`)
          }
        }

        if (!person) {
          person = await this.peopleRepository.create(personData)
          isNew = true
          logger.info(`Created new person: ${person.id} (${personData.full_name})`)
        }
      } else {
        // Update existing with enriched data
        await person.merge(personData).save()
        logger.info(`Updated existing person: ${person.id} with enriched data`)
      }

      // Create or update details if we have CPF data
      if (enrichedData.additionalInfo.sourcesUsed.includes('cpf_search')) {
        const apiData = await this.findexClient.searchByCPF(node.cpf)
        if (apiData) {
          const detailsData = this.findexMapper.mapToPersonDetail(apiData, person.id)
          const existingDetails = await PersonDetail.findBy('person_id', person.id)

          if (existingDetails) {
            await existingDetails.merge(detailsData).save()
          } else {
            await PersonDetail.create(detailsData)
          }
        }
      }

      // Store mapping
      cpfToPersonId.set(node.cpf, person.id)

      // Associate person with family tree if not already
      const existingMembership = await FamilyTreeMember.query()
        .where('family_tree_id', familyTreeId)
        .where('person_id', person.id)
        .first()

      if (!existingMembership) {
        await FamilyTreeMember.create({
          family_tree_id: familyTreeId,
          person_id: person.id,
          user_id: userId,
          role: 'viewer',
          invited_by: userId,
          accepted_at: DateTime.now(),
        })
      }

      // Convert enriched relatives to import format
      const relatives = enrichedData.relatives.map((rel) => ({
        api_cpf: rel.cpf,
        api_name: rel.name,
        api_relationship: rel.relationship,
        is_new: !processedCPFs.has(rel.cpf),
        relationship_type: this.findexMapper.mapRelationshipType(rel.relationship),
      }))

      // Warm cache for relatives and siblings
      const allCpfs = [
        ...enrichedData.relatives.map((r) => ({ CPF_VINCULO: r.cpf })),
        ...enrichedData.siblings.map((s) => ({ CPF_VINCULO: s.cpf })),
      ]
      if (allCpfs.length > 0) {
        await this.cacheService.warmCacheForRelatives(allCpfs)
      }

      logger.info(
        `Processed ${person.full_name}: ${enrichedData.additionalInfo.sourcesUsed.join(', ')} sources, ` +
          `${enrichedData.relatives.length} relatives, ${enrichedData.siblings.length} siblings`
      )

      return {
        personId: person.id,
        name: person.full_name || personData.full_name || node.name,
        isNew,
        isDuplicate,
        relatives,
        siblings: enrichedData.siblings,
      }
    } catch (error) {
      logger.error(
        `Failed to process person ${node.cpf}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      )
      throw error
    }
  }

  /**
   * Create relationship between two people if it doesn't exist
   */
  private async createRelationshipIfNeeded(
    personId1: string,
    personId2: string,
    familyTreeId: string,
    progress: ImportFullTreeResult,
    relationshipType?:
      | 'parent'
      | 'child'
      | 'sibling'
      | 'cousin'
      | 'spouse'
      | 'grandparent'
      | 'grandchild'
      | 'uncle_aunt'
      | 'nephew_niece'
  ): Promise<void> {
    try {
      const existing = await this.relationshipsRepository.findBetweenPeople(
        personId1,
        personId2,
        familyTreeId
      )

      if (!existing) {
        // Default to cousin if no specific type provided
        const type = relationshipType || 'cousin'
        await this.relationshipsRepository.createBidirectional(
          personId1,
          personId2,
          type,
          familyTreeId,
          'Imported from full tree scan'
        )
        progress.relationships_created += 2 // Bidirectional
      }
    } catch (error) {
      logger.error(`Failed to create relationship between ${personId1} and ${personId2}`, error)
    }
  }
}
