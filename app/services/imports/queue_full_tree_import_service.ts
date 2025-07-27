import { inject } from '@adonisjs/core'
import queue from '@rlanz/bull-queue/services/main'
import logger from '@adonisjs/core/services/logger'
import DataImportsRepository from '#repositories/data_imports_repository'
import ImportFullTreeJob from '#jobs/import_full_tree_job'

interface QueueFullTreeImportPayload {
  cpf: string
  family_tree_id: string
  user_id: number
  max_depth?: number
  max_people?: number
  merge_duplicates?: boolean
}

interface QueueFullTreeImportResult {
  import_id: string
  status: 'queued'
  message: string
}

/**
 * Service to queue a full tree import job
 * Creates import record and dispatches job to queue
 */
@inject()
export default class QueueFullTreeImportService {
  constructor(private importsRepository: DataImportsRepository) {}

  async run(payload: QueueFullTreeImportPayload): Promise<QueueFullTreeImportResult> {
    const {
      cpf,
      family_tree_id: familyTreeId,
      user_id: userId,
      max_depth: maxDepth = 3,
      max_people: maxPeople = 500,
      merge_duplicates: mergeDuplicates = true,
    } = payload

    logger.info(`Queueing full tree import for CPF ${cpf}`)

    // Create import record
    const dataImport = await this.importsRepository.createImport(
      'national_id',
      `tree:${cpf}:depth${maxDepth}`,
      userId,
      familyTreeId
    )

    // Initialize progress counters
    await this.importsRepository.updateProgress(dataImport.id, {
      persons_created: 0,
      relationships_created: 0,
      persons_updated: 0,
      duplicates_found: 0,
    })

    // Dispatch job to queue
    await queue.dispatch(
      ImportFullTreeJob,
      {
        cpf,
        family_tree_id: familyTreeId,
        user_id: userId,
        max_depth: maxDepth,
        max_people: maxPeople,
        merge_duplicates: mergeDuplicates,
        import_id: dataImport.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 20s, 40s
        },
      }
    )

    logger.info(`Full tree import job queued with ID: ${dataImport.id}`)

    return {
      import_id: dataImport.id,
      status: 'queued',
      message: `Import job queued successfully. Use import_id ${dataImport.id} to check status.`,
    }
  }
}
