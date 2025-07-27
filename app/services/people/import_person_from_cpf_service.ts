import { inject } from '@adonisjs/core'
import ImportFromCPFService from '#services/imports/import_from_cpf_service'
import IImport from '#interfaces/import_interface'

@inject()
export default class ImportPersonFromCPFService {
  constructor(private importFromCPFService: ImportFromCPFService) {}

  async run(payload: IImport.ImportFromCPFPayload) {
    return this.importFromCPFService.run(payload)
  }
}
