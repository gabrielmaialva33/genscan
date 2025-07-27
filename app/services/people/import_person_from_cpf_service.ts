import { inject } from '@adonisjs/core'
import PersonDiscoveryByCpfService from '#services/genealogy/person_discovery_by_cpf_service'
import IFamilyDiscovery from '#interfaces/family_discovery_interface'

@inject()
export default class ImportPersonFromCPFService {
  constructor(private personDiscoveryByCpfService: PersonDiscoveryByCpfService) {}

  async run(payload: IFamilyDiscovery.PersonDiscoveryByCPFPayload) {
    return this.personDiscoveryByCpfService.run(payload)
  }
}
