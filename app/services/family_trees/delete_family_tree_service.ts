import { inject } from '@adonisjs/core'
import FamilyTreesRepository from '#repositories/family_trees_repository'
import NotFoundException from '#exceptions/not_found_exception'

@inject()
export default class DeleteFamilyTreeService {
  constructor(private familyTreeRepository: FamilyTreesRepository) {}

  async run(id: string) {
    const familyTree = await this.familyTreeRepository.find(id)
    if (!familyTree) {
      throw new NotFoundException('Family tree not found')
    }
    
    await familyTree.delete()
  }
}
