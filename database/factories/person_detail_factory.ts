import factory from '@adonisjs/lucid/factories'

import PersonDetail from '#models/person_detail'

export const PersonDetailFactory = factory
  .define(PersonDetail, async ({ faker }) => {
    return {
      person_id: faker.string.uuid(),
      phone_numbers: faker.datatype.boolean({ probability: 0.8 })
        ? [
            {
              type: faker.helpers.arrayElement(['mobile', 'home', 'work'] as const),
              number: faker.phone.number(),
              is_primary: true,
            },
          ]
        : null,
      emails: faker.datatype.boolean({ probability: 0.7 })
        ? [
            {
              email: faker.internet.email().toLowerCase(),
              is_primary: true,
            },
          ]
        : null,
      addresses: faker.datatype.boolean({ probability: 0.6 })
        ? [
            {
              type: faker.helpers.arrayElement(['home', 'work', 'other'] as const),
              street: faker.location.streetAddress(),
              number: faker.location.buildingNumber(),
              complement: faker.datatype.boolean({ probability: 0.3 })
                ? faker.location.secondaryAddress()
                : undefined,
              neighborhood: faker.location.county(),
              city: faker.location.city(),
              state: faker.location.state(),
              country: faker.location.country(),
              zip_code: faker.location.zipCode('#####-###'),
            },
          ]
        : null,
      income: faker.datatype.boolean({ probability: 0.5 })
        ? faker.number.float({ min: 1000, max: 20000, multipleOf: 0.01 })
        : null,
      education_level: faker.helpers.arrayElement([
        'elementary',
        'high_school',
        'bachelor',
        'master',
        'doctorate',
        null,
      ]),
      marital_status: faker.helpers.arrayElement([
        'single',
        'married',
        'divorced',
        'widowed',
        null,
      ]),
      blood_type: faker.helpers.arrayElement([
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-',
        null,
      ]),
      social_media: faker.datatype.boolean({ probability: 0.4 })
        ? {
            facebook: faker.datatype.boolean({ probability: 0.3 })
              ? faker.internet.username()
              : undefined,
            instagram: faker.datatype.boolean({ probability: 0.3 })
              ? faker.internet.username()
              : undefined,
            twitter: faker.datatype.boolean({ probability: 0.2 })
              ? faker.internet.username()
              : undefined,
            linkedin: faker.datatype.boolean({ probability: 0.2 })
              ? faker.internet.username()
              : undefined,
          }
        : null,
      documents: faker.datatype.boolean({ probability: 0.6 })
        ? {
            cpf: faker.string.numeric(11),
            rg: faker.string.numeric(9),
            voter_id: faker.datatype.boolean({ probability: 0.5 })
              ? faker.string.numeric(12)
              : undefined,
          }
        : null,
      api_data: null,
    }
  })
  .build()
