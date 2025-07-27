import { inject } from '@adonisjs/core'
import PersonDiscoveryByCpfService from '#services/genealogy/person_discovery_by_cpf_service'
import IImport from '#interfaces/import_interface'

@inject()
export default class ImportPersonFromCPFService {
  constructor(private personDiscoveryByCpfService: PersonDiscoveryByCpfService) {}

  async run(payload: IImport.ImportFromCPFPayload) {
    return this.personDiscoveryByCpfService.run(payload)
  }
}
