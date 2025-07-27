import { inject } from '@adonisjs/core'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import PeopleRepository from '#repositories/people_repository'
import Person from '#models/person'
import { PaginateOptions } from '#shared/lucid/lucid_repository_interface'

interface ListPeopleOptions extends PaginateOptions<typeof Person> {
  search?: string
  gender?: 'M' | 'F' | 'O'
  is_living?: boolean
  created_by?: number
}

@inject()
export default class ListPeopleService {
  constructor(private peopleRepository: PeopleRepository) {}

  async run(options: ListPeopleOptions) {
    const {
      search,
      gender,
      is_living: isLiving,
      created_by: createdBy,
      ...paginateOptions
    } = options

    const modifyQuery = (query: ModelQueryBuilderContract<typeof Person>) => {
      if (search) {
        query.where((builder: ModelQueryBuilderContract<typeof Person>) => {
          builder
            .where('full_name', 'like', `%${search}%`)
            .orWhere('mother_name', 'like', `%${search}%`)
            .orWhere('father_name', 'like', `%${search}%`)
            .orWhere('national_id', search.replace(/\D/g, ''))
        })
      }

      if (gender) {
        query.where('gender', gender)
      }

      if (typeof isLiving === 'boolean') {
        if (isLiving) {
          query.whereNull('death_date')
        } else {
          query.whereNotNull('death_date')
        }
      }

      if (createdBy) {
        query.where('created_by', createdBy)
      }
    }

    paginateOptions.modifyQuery = paginateOptions.modifyQuery
      ? (query) => {
          paginateOptions.modifyQuery!(query)
          modifyQuery(query)
          query.preload('creator').preload('details')
        }
      : (query) => {
          modifyQuery(query)
          query.preload('creator').preload('details')
        }

    return this.peopleRepository.paginate(paginateOptions)
  }
}
