import { inject } from '@adonisjs/core'
import FamilyTreesRepository from '#repositories/family_trees_repository'
import IFamilyTree from '#interfaces/family_tree_interface'

@inject()
export default class CreateFamilyTreeService {
  constructor(private familyTreeRepository: FamilyTreesRepository) {}

  async run(payload: IFamilyTree.CreatePayload) {
    return this.familyTreeRepository.create(payload)
  }
}
