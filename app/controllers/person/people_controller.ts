import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import CreatePersonService from '#services/people/create_person_service'
import ListPeopleService from '#services/people/list_people_service'
import GetPersonService from '#services/people/get_person_service'
import UpdatePersonService from '#services/people/update_person_service'

import { createPersonValidator, updatePersonValidator } from '#validations/person_validator'

@inject()
export default class PeopleController {
  async paginate({ request, response, auth }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('per_page', 10)
    const sortBy = request.input('sort_by', 'created_at')
    const direction = request.input('order', 'desc')
    const search = request.input('search', undefined)
    const gender = request.input('gender', undefined)
    const is_living = request.input('is_living', undefined)

    const user = auth.user!

    const service = await app.container.make(ListPeopleService)
    const people = await service.run({
      page,
      perPage,
      sortBy,
      direction,
      search,
      gender,
      is_living: is_living !== undefined ? is_living === 'true' : undefined,
      created_by: user.id,
    })

    return response.json(people)
  }

  async get({ params, response }: HttpContext) {
    const personId = params.id

    const service = await app.container.make(GetPersonService)

    const person = await service.run(personId)
    if (!person) {
      return response.status(404).json({
        message: 'Person not found',
      })
    }
    return response.json(person)
  }

  async create({ request, response, auth }: HttpContext) {
    const { details, ...payload } = await createPersonValidator.validate(request.all())

    const user = auth.user!
    const createPayload = {
      ...payload,
      created_by: user.id,
    }

    const service = await app.container.make(CreatePersonService)

    const person = await service.run(createPayload, details)
    return response.created(person)
  }

  async update({ params, request, response }: HttpContext) {
    const personId = params.id
    const payload = await updatePersonValidator.validate(request.all(), {
      meta: { personId },
    })

    const service = await app.container.make(UpdatePersonService)

    const person = await service.run(personId, payload)
    return response.json(person)
  }
}
