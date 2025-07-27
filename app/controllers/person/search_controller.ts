import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import SearchPeopleService from '#services/people/search_people_service'
import { searchPersonValidator } from '#validations/person_validator'
import { searchByMotherValidator, searchByCpfValidator } from '#validations/import_validator'

@inject()
export default class SearchController {
  async search({ request, response }: HttpContext) {
    const { query, limit } = await searchPersonValidator.validate(request.all())

    const service = await app.container.make(SearchPeopleService)
    const people = await service.run({ query: query || '', limit })

    return response.json(people)
  }

  async searchByMother({ request, response }: HttpContext) {
    const { mother_name: motherName, limit } = await searchByMotherValidator.validate(request.all())

    const service = await app.container.make(SearchPeopleService)
    const people = await service.searchByMotherName(motherName, limit)

    return response.json(people)
  }

  async searchByCpf({ request, response }: HttpContext) {
    const { cpf } = await searchByCpfValidator.validate(request.all())

    const service = await app.container.make(SearchPeopleService)
    const person = await service.searchByNationalId(cpf)

    if (!person) {
      return response.status(404).json({
        message: 'Person not found',
      })
    }

    return response.json(person)
  }
}
