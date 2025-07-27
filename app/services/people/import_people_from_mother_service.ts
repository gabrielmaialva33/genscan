import { inject } from '@adonisjs/core'
import ChildrenByMotherDiscoveryService from '#services/genealogy/children_by_mother_discovery_service'
import IFamilyDiscovery from '#interfaces/family_discovery_interface'

@inject()
export default class ImportPeopleFromMotherService {
  constructor(private childrenByMotherDiscoveryService: ChildrenByMotherDiscoveryService) {}

  async run(payload: IFamilyDiscovery.ChildrenByMotherPayload) {
    return this.childrenByMotherDiscoveryService.run(payload)
  }
}
