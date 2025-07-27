import { Job } from '@rlanz/bull-queue'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import ImportFullTreeService from '#services/imports/import_full_tree_service'
import DataImportsRepository from '#repositories/data_imports_repository'

interface ImportFullTreeJobPayload {
  cpf: string
  family_tree_id: string
  user_id: number
  max_depth?: number
  max_people?: number
  merge_duplicates?: boolean
  import_id?: string
}

export default class ImportFullTreeJob extends Job {
  // This is the path to the file that is used to create the job
  static get $$filepath() {
    return import.meta.url
  }

  /**
   * Base Entry point
   */
  async handle(payload: ImportFullTreeJobPayload): Promise<void> {
    logger.info(`Starting ImportFullTreeJob for CPF ${payload.cpf}`)

    try {
      // Get the service instance
      const importFullTreeService = await app.container.make(ImportFullTreeService)

      // Run the import
      const result = await importFullTreeService.run({
        cpf: payload.cpf,
        family_tree_id: payload.family_tree_id,
        user_id: payload.user_id,
        max_depth: payload.max_depth,
        max_people: payload.max_people,
        merge_duplicates: payload.merge_duplicates,
      })

      logger.info(
        `ImportFullTreeJob completed: ${result.persons_created} created, ` +
          `${result.persons_updated} updated, ${result.relationships_created} relationships`
      )

      // The result is already saved in the database by the service
      // No need to return anything for queue jobs
    } catch (error) {
      logger.error('ImportFullTreeJob failed', error)
      throw error
    }
  }

  /**
   * This is an optional method that gets called when the retries has exceeded and is marked failed.
   */
  async rescue(payload: ImportFullTreeJobPayload, error: Error) {
    logger.error(`ImportFullTreeJob failed after all retries for CPF ${payload.cpf}`, error)

    // Update import status to failed if we have an import_id
    if (payload.import_id) {
      try {
        const importsRepository = await app.container.make(DataImportsRepository)
        await importsRepository.markAsFailed(
          payload.import_id,
          `Failed after all retries: ${error.message}`
        )
      } catch (updateError) {
        logger.error('Failed to update import status', updateError)
      }
    }

    // Here you could send notifications to the user about the failure
    // Example: send email, push notification, etc.
  }
}
