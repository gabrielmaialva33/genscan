import { inject } from '@adonisjs/core'
import ImportFromMotherService from '#services/imports/import_from_mother_service'
import IImport from '#interfaces/import_interface'

@inject()
export default class ImportPeopleFromMotherService {
  constructor(private importFromMotherService: ImportFromMotherService) {}

  async run(payload: IImport.ImportFromMotherPayload) {
    return this.importFromMotherService.run(payload)
  }
}
