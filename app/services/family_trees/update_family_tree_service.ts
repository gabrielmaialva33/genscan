import { inject } from '@adonisjs/core'
import FamilyTreesRepository from '#repositories/family_trees_repository'
import IFamilyTree from '#interfaces/family_tree_interface'
import NotFoundException from '#exceptions/not_found_exception'

@inject()
export default class UpdateFamilyTreeService {
  constructor(private familyTreeRepository: FamilyTreesRepository) {}

  async run(id: string, payload: IFamilyTree.UpdatePayload) {
    const familyTree = await this.familyTreeRepository.find(id)
    if (!familyTree) {
      throw new NotFoundException('Family tree not found')
    }

    await familyTree.merge(payload).save()
    return familyTree
  }
}
