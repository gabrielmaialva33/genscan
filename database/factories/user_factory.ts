import { DateTime } from 'luxon'
import factory from '@adonisjs/lucid/factories'

import User from '#models/user'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    return {
      full_name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      username: faker.internet.username({ firstName, lastName }),
      password: '123456',
      is_deleted: false,
      metadata: {
        email_verified: false,
        email_verification_token: null,
        email_verification_sent_at: null,
        email_verified_at: null,
      },
    }
  })
  .state('verified', (user) => {
    user.metadata = {
      email_verified: true,
      email_verification_token: null,
      email_verification_sent_at: null,
      email_verified_at: DateTime.now().toISO(),
    }
  })
  .state('deleted', (user) => {
    user.is_deleted = true
  })
  .build()
