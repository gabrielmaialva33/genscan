import { inject } from '@adonisjs/core'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import FamilyTreesRepository from '#repositories/family_trees_repository'
import FamilyTree from '#models/family_tree'
import { PaginateOptions } from '#shared/lucid/lucid_repository_interface'

interface ListFamilyTreesOptions extends PaginateOptions<typeof FamilyTree> {
  user_id?: string
  privacy?: 'private' | 'public' | 'family'
  search?: string
}

@inject()
export default class ListFamilyTreesService {
  constructor(private familyTreeRepository: FamilyTreesRepository) {}

  async run(options: ListFamilyTreesOptions) {
    const { user_id, privacy, search, ...paginateOptions } = options

    const modifyQuery = (query: ModelQueryBuilderContract<typeof FamilyTree>) => {
      if (user_id) {
        query.where('owner_id', user_id)
      }

      if (privacy) {
        query.where('privacy', privacy)
      }

      if (search) {
        query.where((builder: ModelQueryBuilderContract<typeof FamilyTree>) => {
          builder.where('name', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`)
        })
      }
    }

    paginateOptions.modifyQuery = paginateOptions.modifyQuery
      ? (query) => {
          paginateOptions.modifyQuery!(query)
          modifyQuery(query)
          query.preload('owner')
        }
      : (query) => {
          modifyQuery(query)
          query.preload('owner')
        }

    return this.familyTreeRepository.paginate(paginateOptions)
  }
}
