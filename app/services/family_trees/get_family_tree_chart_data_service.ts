import { inject } from '@adonisjs/core'
import FamilyTree from '#models/family_tree'
import PeopleRepository from '#repositories/people_repository'
import RelationshipsRepository from '#repositories/relationships_repository'
import FamilyTreeChartSerializer from '#serializers/family_tree_chart_serializer'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

@inject()
export default class GetFamilyTreeChartDataService {
  constructor(
    private peopleRepository: PeopleRepository,
    private relationshipsRepository: RelationshipsRepository,
    private chartSerializer: FamilyTreeChartSerializer
  ) {}

  /**
   * Get family tree data formatted for a family-chart library
   */
  async run(familyTreeId: string, userId: number) {
    // Verify family tree exists and user has access
    const familyTree = await FamilyTree.find(familyTreeId)
    if (!familyTree) {
      throw new NotFoundException('Family tree not found')
    }

    // Check if the user can view this family tree
    const canView = await familyTree.canView(userId)
    if (!canView) {
      throw new ForbiddenException('You do not have permission to view this family tree')
    }

    // Get all people in the family tree
    const people = await this.peopleRepository.getByFamilyTree(familyTreeId)

    // Get all relationships
    const relationships = await this.relationshipsRepository.getByFamilyTree(familyTreeId)

    // Serialize to family-chart format
    return this.chartSerializer.serialize(people, relationships, familyTree)
  }
}
