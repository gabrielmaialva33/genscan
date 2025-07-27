import { inject } from '@adonisjs/core'
import PeopleRepository from '#repositories/people_repository'
import IPerson from '#interfaces/person_interface'
import NotFoundException from '#exceptions/not_found_exception'

@inject()
export default class UpdatePersonService {
  constructor(private peopleRepository: PeopleRepository) {}

  async run(id: string, payload: IPerson.UpdatePayload) {
    const person = await this.peopleRepository.find(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }

    await person.merge(payload).save()
    return person
  }
}
