import { inject } from '@adonisjs/core'
import FamilyTreesRepository from '#repositories/family_trees_repository'

@inject()
export default class GetFamilyTreeService {
  constructor(private familyTreeRepository: FamilyTreesRepository) {}

  async run(id: string) {
    return this.familyTreeRepository.findWithMembers(id)
  }
}
