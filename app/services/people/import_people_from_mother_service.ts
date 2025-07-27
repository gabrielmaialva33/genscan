import { inject } from '@adonisjs/core'
import ChildrenByMotherDiscoveryService from '#services/genealogy/children_by_mother_discovery_service'
import IImport from '#interfaces/import_interface'

@inject()
export default class ImportPeopleFromMotherService {
  constructor(private childrenByMotherDiscoveryService: ChildrenByMotherDiscoveryService) {}

  async run(payload: IImport.ImportFromMotherPayload) {
    return this.childrenByMotherDiscoveryService.run(payload)
  }
}
