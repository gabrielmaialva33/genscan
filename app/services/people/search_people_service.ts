import { inject } from '@adonisjs/core'
import PeopleRepository from '#repositories/people_repository'

interface SearchPeopleOptions {
  query: string
  limit?: number
}

@inject()
export default class SearchPeopleService {
  constructor(private peopleRepository: PeopleRepository) {}

  async run(options: SearchPeopleOptions) {
    const { query, limit = 50 } = options

    if (!query || query.trim().length < 2) {
      return []
    }

    const people = await this.peopleRepository.search(query.trim())
    return people.slice(0, limit)
  }

  async searchByMotherName(motherName: string, limit: number = 50) {
    if (!motherName || motherName.trim().length < 3) {
      return []
    }

    const people = await this.peopleRepository.findByMotherName(motherName.trim())
    return people.slice(0, limit)
  }

  async searchByNationalId(nationalId: string) {
    const cleanId = nationalId.replace(/\D/g, '')
    if (cleanId.length !== 11) {
      return null
    }

    return this.peopleRepository.findByNationalId(cleanId)
  }
}
