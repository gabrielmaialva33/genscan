import { inject } from '@adonisjs/core'
import PeopleRepository from '#repositories/people_repository'

@inject()
export default class GetPersonService {
  constructor(private peopleRepository: PeopleRepository) {}

  async run(id: string) {
    return this.peopleRepository.getWithRelationships(id)
  }
}
