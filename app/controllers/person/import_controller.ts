import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import ImportPersonFromCPFService from '#services/people/import_person_from_cpf_service'
import ImportPeopleFromMotherService from '#services/people/import_people_from_mother_service'
import FamilyTreeQueueService from '#services/genealogy/family_tree_queue_service'
import DataImportsRepository from '#repositories/data_imports_repository'

import { importFromCpfValidator, importFromMotherValidator } from '#validations/import_validator'
import { importFullTreeValidator } from '#validators/imports/import_full_tree'

@inject()
export default class ImportController {
  async importFromCpf({ request, response, auth }: HttpContext) {
    const payload = await importFromCpfValidator.validate(request.all())

    const user = auth.user!
    const importPayload = {
      ...payload,
      user_id: user.id,
    }

    const service = await app.container.make(ImportPersonFromCPFService)
    const result = await service.run(importPayload)

    return response.json(result)
  }

  async importFromMother({ request, response, auth }: HttpContext) {
    const payload = await importFromMotherValidator.validate(request.all())

    const user = auth.user!
    const importPayload = {
      ...payload,
      user_id: user.id,
    }

    const service = await app.container.make(ImportPeopleFromMotherService)
    const result = await service.run(importPayload)

    return response.json(result)
  }

  async importFullTree({ request, response, auth }: HttpContext) {
    const payload = await importFullTreeValidator.validate(request.all())

    const user = auth.user!
    const importPayload = {
      ...payload,
      user_id: user.id,
    }

    const service = await app.container.make(FamilyTreeQueueService)
    const result = await service.run(importPayload)

    return response.status(202).json(result) // 202 Accepted for async processing
  }

  async getImportStatus({ params, response }: HttpContext) {
    const importId = params.id

    const importsRepository = await app.container.make(DataImportsRepository)
    const importRecord = await importsRepository.findWithDetails(importId)

    if (!importRecord) {
      return response.status(404).json({
        message: 'Import not found',
      })
    }

    return response.json({
      id: importRecord.id,
      status: importRecord.status,
      persons_created: importRecord.persons_created,
      relationships_created: importRecord.relationships_created,
      persons_updated: importRecord.persons_updated,
      duplicates_found: importRecord.duplicates_found,
      error_message: importRecord.error_message,
      import_summary: importRecord.import_summary,
      created_at: importRecord.created_at,
      completed_at: importRecord.completed_at,
    })
  }
}
