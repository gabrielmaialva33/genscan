import { inject } from '@adonisjs/core'
import PeopleRepository from '#repositories/people_repository'
import IPerson from '#interfaces/person_interface'

@inject()
export default class CreatePersonService {
  constructor(private peopleRepository: PeopleRepository) {}

  async run(payload: IPerson.CreatePayload, details?: IPerson.PersonDetailPayload) {
    if (details) {
      return this.peopleRepository.createWithDetails(payload, details)
    }
    return this.peopleRepository.create(payload)
  }
}
