import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import FindexClient from '#services/integrations/findex_client'
import FindexMapperService from '#services/genealogy/findex_mapper_service'
import PeopleRepository from '#repositories/people_repository'
import DataImportsRepository from '#repositories/data_imports_repository'
import IImport from '#interfaces/import_interface'

/**
 * Service to import people data by father's name using Findex API
 */
@inject()
export default class ImportFromFatherService {
  constructor(
    private findexClient: FindexClient,
    private findexMapper: FindexMapperService,
    private peopleRepository: PeopleRepository,
    private importsRepository: DataImportsRepository
  ) {}

  /**
   * Import people by father's name
   */
  async run(payload: IImport.ImportFromParentPayload): Promise<IImport.ImportResult> {
    const {
      parent_name: fatherName,
      family_tree_id: familyTreeId,
      user_id: userId,
      merge_duplicates: mergeDuplicates = true,
    } = payload

    // Check if similar import was done recently
    const recentImport = await this.importsRepository.findRecentSimilar(
      'father_name',
      fatherName,
      familyTreeId,
      24 // 24 hours
    )

    if (recentImport && recentImport.status === 'success') {
      logger.info(`Recent successful import found for father name ${fatherName}, skipping API call`)
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
      'father_name',
      fatherName,
      userId,
      familyTreeId
    )

    try {
      await this.importsRepository.markAsProcessing(dataImport.id)

      // Fetch data from API (with cache)
      logger.info(`Fetching data for father name: ${fatherName}`)
      const apiData = await this.findexClient.searchByFatherName(fatherName)

      // Save API request/response
      dataImport.api_request = { pai: fatherName }
      dataImport.api_response = apiData
      await dataImport.save()

      // Track import progress
      const progress: IImport.ImportResult = {
        import_id: dataImport.id,
        status: 'success',
        persons_created: 0,
        relationships_created: 0,
        persons_updated: 0,
        duplicates_found: 0,
        errors: [],
      }

      // Process each person found
      for (const personData of apiData) {
        try {
          // Map API data to person model
          const mappedPersonData = this.findexMapper.mapMotherSearchToPerson(personData)
          mappedPersonData.created_by = userId

          // Check if person already exists by CPF
          let existingPerson = await this.peopleRepository.findByNationalId(personData.CPF)

          if (existingPerson) {
            // Update existing person
            await existingPerson.merge(mappedPersonData).save()
            progress.persons_updated++
            logger.info(`Updated existing person: ${existingPerson.id}`)
          } else {
            // Check for duplicates by name and birth date
            if (mergeDuplicates && mappedPersonData.full_name && mappedPersonData.birth_date) {
              const potentialDuplicates = await this.peopleRepository.search(
                mappedPersonData.full_name
              )
              const duplicate = potentialDuplicates.find((p) =>
                this.findexMapper.isLikelyDuplicate(mappedPersonData, p)
              )

              if (duplicate) {
                await duplicate.merge(mappedPersonData).save()
                progress.duplicates_found++
                logger.info(`Merged data with existing person: ${duplicate.id}`)
                continue
              }
            }

            // Create new person
            const newPerson = await this.peopleRepository.create(mappedPersonData)
            progress.persons_created++
            logger.info(`Created new person: ${newPerson.id}`)
          }
        } catch (personError) {
          logger.error(`Failed to process person ${personData.NOME}`, personError)
          progress.errors?.push({
            person: personData.NOME,
            error: personError instanceof Error ? personError.message : 'Unknown error',
          })
        }
      }

      // Set final status
      if (
        progress.errors &&
        progress.errors.length > 0 &&
        progress.persons_created === 0 &&
        progress.persons_updated === 0
      ) {
        progress.status = 'failed'
      } else if (progress.errors && progress.errors.length > 0) {
        progress.status = 'partial'
      }

      // Update import record
      await this.importsRepository.updateProgress(dataImport.id, progress)
      await this.importsRepository.markAsCompleted(dataImport.id, {
        created_person_ids: [], // Would need to track IDs if needed
        created_relationship_ids: [],
        errors: progress.errors,
      })

      logger.info(
        `Import from father name completed: ${progress.persons_created} created, ${progress.persons_updated} updated, ${progress.duplicates_found} duplicates, ${progress.errors?.length || 0} errors`
      )

      return progress
    } catch (error) {
      logger.error('Import from father name failed', error)
      await this.importsRepository.markAsFailed(
        dataImport.id,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }
}
