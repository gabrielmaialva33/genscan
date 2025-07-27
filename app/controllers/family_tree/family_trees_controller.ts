import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import CreateFamilyTreeService from '#services/family_trees/create_family_tree_service'
import ListFamilyTreesService from '#services/family_trees/list_family_trees_service'
import GetFamilyTreeService from '#services/family_trees/get_family_tree_service'
import UpdateFamilyTreeService from '#services/family_trees/update_family_tree_service'
import DeleteFamilyTreeService from '#services/family_trees/delete_family_tree_service'

import {
  createFamilyTreeValidator,
  updateFamilyTreeValidator,
} from '#validations/family_tree_validator'

@inject()
export default class FamilyTreesController {
  async paginate({ request, response, auth }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('per_page', 10)
    const sortBy = request.input('sort_by', 'created_at')
    const direction = request.input('order', 'desc')
    const search = request.input('search', undefined)
    const privacy = request.input('privacy', undefined)

    const user = auth.user!

    const service = await app.container.make(ListFamilyTreesService)
    const familyTrees = await service.run({
      page,
      perPage,
      sortBy,
      direction,
      search,
      privacy,
      user_id: user.id,
    })

    return response.json(familyTrees)
  }

  async get({ params, response }: HttpContext) {
    const familyTreeId = params.id

    const service = await app.container.make(GetFamilyTreeService)

    const familyTree = await service.run(familyTreeId)
    if (!familyTree) {
      return response.status(404).json({
        message: 'Family tree not found',
      })
    }
    return response.json(familyTree)
  }

  async create({ request, response, auth }: HttpContext) {
    const payload = await createFamilyTreeValidator.validate(request.all())

    const user = auth.user!
    const createPayload = {
      ...payload,
      created_by: user.id,
    }

    const service = await app.container.make(CreateFamilyTreeService)

    const familyTree = await service.run(createPayload)
    return response.created(familyTree)
  }

  async update({ params, request, response }: HttpContext) {
    const familyTreeId = params.id
    const payload = await updateFamilyTreeValidator.validate(request.all(), {
      meta: { treeId: familyTreeId },
    })

    const service = await app.container.make(UpdateFamilyTreeService)

    const familyTree = await service.run(familyTreeId, payload)
    return response.json(familyTree)
  }

  async delete({ params, response }: HttpContext) {
    const familyTreeId = params.id

    const service = await app.container.make(DeleteFamilyTreeService)
    await service.run(familyTreeId)

    return response.noContent()
  }
}
