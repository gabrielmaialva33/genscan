import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import FindexClient from '#services/integrations/findex_client'
import FindexMapperService from '#services/imports/findex_mapper_service'
import PeopleRepository from '#repositories/people_repository'
import PersonDetail from '#models/person_detail'
import RelationshipsRepository from '#repositories/relationships_repository'
import DataImportsRepository from '#repositories/data_imports_repository'
import IImport from '#interfaces/import_interface'

/**
 * Service to import person data from CPF using Findex API
 */
@inject()
export default class ImportFromCPFService {
  constructor(
    private findexClient: FindexClient,
    private findexMapper: FindexMapperService,
    private peopleRepository: PeopleRepository,
    private relationshipsRepository: RelationshipsRepository,
    private importsRepository: DataImportsRepository
  ) {}

  /**
   * Import person and relatives from CPF
   */
  async run(payload: IImport.ImportFromCPFPayload): Promise<IImport.ImportResult> {
    const {
      cpf,
      family_tree_id,
      user_id,
      import_relatives = true,
      merge_duplicates = true,
    } = payload

    // Check if similar import was done recently
    const recentImport = await this.importsRepository.findRecentSimilar(
      'national_id',
      cpf,
      family_tree_id,
      24 // 24 hours
    )

    if (recentImport && recentImport.status === 'success') {
      logger.info(`Recent successful import found for CPF ${cpf}, skipping API call`)
      return {
        import_id: recentImport.id,
        status: 'success',
        persons_created: recentImport.persons_created,
        relationships_created: recentImport.relationships_created,
        persons_updated: recentImport.persons_updated,
        duplicates_found: recentImport.duplicates_found,
      }
    }

    // Create import record
    const dataImport = await this.importsRepository.createImport(
      'national_id',
      cpf,
      user_id,
      family_tree_id
    )

    try {
      await this.importsRepository.markAsProcessing(dataImport.id)

      // Fetch data from API
      logger.info(`Fetching data for CPF: ${cpf}`)
      const apiData = await this.findexClient.searchByCPF(cpf)

      // Save API request/response
      dataImport.api_request = { cpf }
      dataImport.api_response = apiData
      await dataImport.save()

      // Map and create/update main person
      const personData = this.findexMapper.mapToPerson(apiData)
      personData.created_by = user_id

      let person = await this.peopleRepository.findByNationalId(cpf)
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
            logger.info(`Merged data with existing person: ${person.id}`)
          }
        }

        if (!person) {
          person = await this.peopleRepository.create(personData)
          isNewPerson = true
          logger.info(`Created new person: ${person.id}`)
        }
      } else {
        // Update existing person
        await person.merge(personData).save()
        logger.info(`Updated existing person: ${person.id}`)
      }

      // Create or update person details
      const detailsData = this.findexMapper.mapToPersonDetail(apiData, person.id)
      const existingDetails = await PersonDetail.findBy('person_id', person.id)

      if (existingDetails) {
        await existingDetails.merge(detailsData).save()
      } else {
        await PersonDetail.create(detailsData)
      }

      // Track import progress
      const progress: IImport.ImportResult = {
        import_id: dataImport.id,
        status: 'success',
        persons_created: isNewPerson ? 1 : 0,
        relationships_created: 0,
        persons_updated: isNewPerson ? 0 : 1,
        duplicates_found: 0,
        errors: [],
      }

      // Import relatives if requested
      if (import_relatives && apiData.PARENTES && apiData.PARENTES.length > 0) {
        const mappedRelatives = this.findexMapper.mapRelatives(apiData.PARENTES)
        const relativeResults = await this.importRelatives(
          mappedRelatives,
          person.id,
          family_tree_id,
          user_id,
          merge_duplicates
        )

        progress.persons_created += relativeResults.persons_created
        progress.relationships_created += relativeResults.relationships_created
        progress.persons_updated += relativeResults.persons_updated
        progress.duplicates_found += relativeResults.duplicates_found

        if (relativeResults.errors.length > 0) {
          progress.errors = relativeResults.errors
          progress.status = 'partial'
        }
      }

      // Update import record
      await this.importsRepository.updateProgress(dataImport.id, progress)
      await this.importsRepository.markAsCompleted(dataImport.id, {
        created_person_ids: [person.id],
        created_relationship_ids: [],
        errors: progress.errors,
      })

      return progress
    } catch (error) {
      logger.error('Import from CPF failed', error)
      await this.importsRepository.markAsFailed(
        dataImport.id,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }

  /**
   * Import relatives from API data
   */
  private async importRelatives(
    relatives: IImport.RelativeMapping[],
    mainPersonId: string,
    familyTreeId: string,
    userId: string,
    mergeDuplicates: boolean
  ): Promise<{
    persons_created: number
    relationships_created: number
    persons_updated: number
    duplicates_found: number
    errors: Array<{ person: string; error: string }>
  }> {
    const results = {
      persons_created: 0,
      relationships_created: 0,
      persons_updated: 0,
      duplicates_found: 0,
      errors: [] as Array<{ person: string; error: string }>,
    }

    for (const relative of relatives) {
      try {
        // Check if person already exists
        let relativePerson = await this.peopleRepository.findByNationalId(relative.api_cpf)

        if (!relativePerson) {
          // Try to get more data about the relative
          try {
            const relativeApiData = await this.findexClient.searchByCPF(relative.api_cpf)
            const relativePersonData = this.findexMapper.mapToPerson(relativeApiData)
            relativePersonData.created_by = userId

            // Check for duplicates
            if (mergeDuplicates && relativePersonData.full_name && relativePersonData.birth_date) {
              const potentialDuplicates = await this.peopleRepository.search(
                relativePersonData.full_name
              )
              const duplicate = potentialDuplicates.find((p) =>
                this.findexMapper.isLikelyDuplicate(relativePersonData, p)
              )

              if (duplicate) {
                relativePerson = duplicate
                await relativePerson.merge(relativePersonData).save()
                results.duplicates_found++
                logger.info(`Merged relative with existing person: ${relativePerson.id}`)
              }
            }

            if (!relativePerson) {
              relativePerson = await this.peopleRepository.create(relativePersonData)
              results.persons_created++

              // Also create details for the relative
              const relativeDetailsData = this.findexMapper.mapToPersonDetail(
                relativeApiData,
                relativePerson.id
              )
              await PersonDetail.create(relativeDetailsData)
            }
          } catch (apiError) {
            // If we can't get full data, create with basic info
            relativePerson = await this.peopleRepository.create({
              full_name: relative.api_name,
              national_id: relative.api_cpf,
              created_by: userId,
            })
            results.persons_created++
            logger.warn(`Created relative with basic info only: ${relative.api_cpf}`)
          }
        } else {
          results.persons_updated++
        }

        // Create relationship if it doesn't exist
        const existingRelationship = await this.relationshipsRepository.findBetweenPeople(
          mainPersonId,
          relativePerson.id,
          familyTreeId
        )

        if (!existingRelationship) {
          await this.relationshipsRepository.createBidirectional(
            mainPersonId,
            relativePerson.id,
            relative.relationship_type,
            familyTreeId,
            `Imported from CPF data`
          )
          results.relationships_created += 2 // Bidirectional = 2 relationships
        }
      } catch (error) {
        logger.error(`Failed to import relative ${relative.api_cpf}`, error)
        results.errors.push({
          person: relative.api_name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }
}
