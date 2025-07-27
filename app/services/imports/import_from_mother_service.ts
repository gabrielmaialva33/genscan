import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import FindexClient from '#services/integrations/findex_client'
import FindexMapperService from '#services/imports/findex_mapper_service'
import ImportFromCPFService from '#services/imports/import_from_cpf_service'
import PeopleRepository from '#repositories/people_repository'
import RelationshipsRepository from '#repositories/relationships_repository'
import DataImportsRepository from '#repositories/data_imports_repository'
import IImport from '#interfaces/import_interface'

/**
 * Service to import family data from mother's name using Findex API
 */
@inject()
export default class ImportFromMotherService {
  constructor(
    private findexClient: FindexClient,
    private findexMapper: FindexMapperService,
    private importFromCPFService: ImportFromCPFService,
    private peopleRepository: PeopleRepository,
    private relationshipsRepository: RelationshipsRepository,
    private importsRepository: DataImportsRepository
  ) {}

  /**
   * Import children and family from mother's name
   */
  async run(payload: IImport.ImportFromMotherPayload): Promise<IImport.ImportResult> {
    const {
      mother_name,
      family_tree_id,
      user_id,
      import_relatives = true,
      merge_duplicates = true,
    } = payload

    // Create import record
    const dataImport = await this.importsRepository.createImport(
      'mother_name',
      mother_name,
      user_id,
      family_tree_id
    )

    try {
      await this.importsRepository.markAsProcessing(dataImport.id)

      // Fetch data from API
      logger.info(`Fetching children for mother: ${mother_name}`)
      const apiData = await this.findexClient.searchByMotherName(mother_name)

      // Save API request/response
      dataImport.api_request = { mae: mother_name }
      dataImport.api_response = apiData
      await dataImport.save()

      if (!apiData || apiData.length === 0) {
        logger.warn(`No children found for mother: ${mother_name}`)
        await this.importsRepository.markAsCompleted(dataImport.id, {
          errors: [{ person: mother_name, error: 'No children found' }],
        })

        return {
          import_id: dataImport.id,
          status: 'success',
          persons_created: 0,
          relationships_created: 0,
          persons_updated: 0,
          duplicates_found: 0,
        }
      }

      const progress: IImport.ImportResult = {
        import_id: dataImport.id,
        status: 'success',
        persons_created: 0,
        relationships_created: 0,
        persons_updated: 0,
        duplicates_found: 0,
        errors: [],
      }

      const createdPersonIds: string[] = []
      const siblings: Array<{ id: string; cpf: string }> = []

      // Process each child
      for (const childData of apiData) {
        try {
          // Map basic person data
          const personData = this.findexMapper.mapMotherSearchToPerson(childData)
          personData.created_by = user_id

          // Check if person already exists
          let person = await this.peopleRepository.findByNationalId(childData.CPF)
          let isNewPerson = false

          if (!person) {
            // Check for duplicates by name and birth date
            if (merge_duplicates && personData.full_name && personData.birth_date) {
              const potentialDuplicates = await this.peopleRepository.search(personData.full_name)
              const duplicate = potentialDuplicates.find((p) =>
                this.findexMapper.isLikelyDuplicate(personData, p)
              )

              if (duplicate) {
                person = duplicate
                await person.merge(personData).save()
                progress.duplicates_found++
                logger.info(`Merged child with existing person: ${person.id}`)
              }
            }

            if (!person) {
              person = await this.peopleRepository.create(personData)
              isNewPerson = true
              progress.persons_created++
              logger.info(`Created new person from mother search: ${person.id}`)
            }
          } else {
            // Update existing person
            await person.merge(personData).save()
            progress.persons_updated++
            logger.info(`Updated existing person from mother search: ${person.id}`)
          }

          createdPersonIds.push(person.id)
          siblings.push({ id: person.id, cpf: childData.CPF })

          // If import_relatives is true, fetch full data for each child
          if (import_relatives) {
            try {
              const fullImportResult = await this.importFromCPFService.run({
                cpf: childData.CPF,
                family_tree_id,
                user_id,
                import_relatives: true,
                merge_duplicates,
              })

              // Aggregate results (subtract the person we already counted)
              if (isNewPerson && fullImportResult.persons_created > 0) {
                progress.persons_created += fullImportResult.persons_created - 1
              } else {
                progress.persons_created += fullImportResult.persons_created
              }

              progress.relationships_created += fullImportResult.relationships_created
              progress.persons_updated += fullImportResult.persons_updated
              progress.duplicates_found += fullImportResult.duplicates_found

              if (fullImportResult.errors && fullImportResult.errors.length > 0) {
                progress.errors?.push(...fullImportResult.errors)
              }
            } catch (cpfError) {
              logger.error(`Failed to import full data for CPF ${childData.CPF}`, cpfError)
              progress.errors?.push({
                person: childData.NOME,
                error: `Failed to import full data: ${cpfError instanceof Error ? cpfError.message : 'Unknown error'}`,
              })
            }
          }
        } catch (error) {
          logger.error(`Failed to process child ${childData.NOME}`, error)
          progress.errors?.push({
            person: childData.NOME,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          progress.status = 'partial'
        }
      }

      // Create sibling relationships between all children
      if (siblings.length > 1) {
        for (let i = 0; i < siblings.length; i++) {
          for (let j = i + 1; j < siblings.length; j++) {
            try {
              const existingRelationship = await this.relationshipsRepository.findBetweenPeople(
                siblings[i].id,
                siblings[j].id,
                family_tree_id
              )

              if (!existingRelationship) {
                await this.relationshipsRepository.createBidirectional(
                  siblings[i].id,
                  siblings[j].id,
                  'sibling',
                  family_tree_id,
                  `Siblings - same mother: ${mother_name}`
                )
                progress.relationships_created += 2 // Bidirectional
              }
            } catch (error) {
              logger.error(
                `Failed to create sibling relationship between ${siblings[i].cpf} and ${siblings[j].cpf}`,
                error
              )
            }
          }
        }
      }

      // Update import record
      await this.importsRepository.updateProgress(dataImport.id, progress)
      await this.importsRepository.markAsCompleted(dataImport.id, {
        created_person_ids: createdPersonIds,
        errors: progress.errors,
      })

      return progress
    } catch (error) {
      logger.error('Import from mother name failed', error)
      await this.importsRepository.markAsFailed(
        dataImport.id,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }
}
