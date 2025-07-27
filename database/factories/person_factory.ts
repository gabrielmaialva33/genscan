import { DateTime } from 'luxon'
import factory from '@adonisjs/lucid/factories'

import Person from '#models/person'

export const PersonFactory = factory
  .define(Person, async ({ faker }) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const gender = faker.helpers.arrayElement(['M', 'F', 'O', null])

    return {
      full_name: `${firstName} ${lastName}`,
      national_id: faker.datatype.boolean({ probability: 0.7 }) ? faker.string.numeric(11) : null,
      birth_date: DateTime.fromJSDate(faker.date.birthdate({ min: 18, max: 80, mode: 'age' })),
      death_date: null,
      gender: gender,
      birth_place: `${faker.location.city()}, ${faker.location.state()}`,
      death_place: null,
      occupation: faker.person.jobTitle(),
      notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
      photo_url: faker.datatype.boolean({ probability: 0.5 }) ? faker.image.avatar() : null,
      created_by: faker.number.int({ min: 1, max: 1000 }),
      mother_name: faker.person.fullName({ sex: 'female' }),
      father_name: faker.person.fullName({ sex: 'male' }),
    }
  })
  .state('deceased', (person, { faker }) => {
    person.death_date = DateTime.fromJSDate(
      faker.date.between({
        from: person.birth_date ? person.birth_date.toJSDate() : new Date(1900, 0, 1),
        to: new Date(),
      })
    )
    person.death_place = `${faker.location.city()}, ${faker.location.state()}`
  })
  .state('child', (person, { faker }) => {
    person.birth_date = DateTime.fromJSDate(faker.date.birthdate({ min: 1, max: 17, mode: 'age' }))
    person.occupation = null
  })
  .state('elderly', (person, { faker }) => {
    person.birth_date = DateTime.fromJSDate(
      faker.date.birthdate({ min: 65, max: 100, mode: 'age' })
    )
  })
  .build()
