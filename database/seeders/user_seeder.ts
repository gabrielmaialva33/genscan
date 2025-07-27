import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { UserFactory } from '#database/factories/user_factory'
import User from '#models/user'
import Role from '#models/role'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import IRole from '#interfaces/role_interface'

export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Check if users already exist
    const existingUsers = await User.query().count('* as total')
    if (existingUsers[0].$extras.total > 0) {
      logger.info('Users already seeded, skipping...')
      return
    }

    // Create admin user
    const adminUser = await User.create({
      full_name: 'Administrator',
      email: 'admin@genscan.com',
      username: 'admin',
      password: await hash.make('Admin@123'),
      is_deleted: false,
      metadata: {
        email_verified: true,
        email_verified_at: DateTime.now().toISO(),
        email_verification_token: null,
        email_verification_sent_at: null,
      },
    })

    // Assign admin role to admin user
    const adminRole = await Role.findBy('slug', IRole.Slugs.ADMIN)
    if (adminRole) {
      await adminUser.related('roles').attach([adminRole.id])
      logger.debug(`  ✓ Assigned admin role to: ${adminUser.email}`)
    }

    // Create regular verified users
    const regularUsers = [
      {
        full_name: 'João Silva',
        email: 'joao.silva@example.com',
        username: 'joaosilva',
        password: await hash.make('Password@123'),
        is_deleted: false,
        metadata: {
          email_verified: true,
          email_verified_at: DateTime.now().toISO(),
          email_verification_token: null,
          email_verification_sent_at: null,
        },
      },
      {
        full_name: 'Maria Santos',
        email: 'maria.santos@example.com',
        username: 'mariasantos',
        password: await hash.make('Password@123'),
        is_deleted: false,
        metadata: {
          email_verified: true,
          email_verified_at: DateTime.now().toISO(),
          email_verification_token: null,
          email_verification_sent_at: null,
        },
      },
    ]

    for (const userData of regularUsers) {
      const user = await User.create(userData)
      await User.setDefaultRole(user) // Assign USER role
      logger.debug(`  ✓ Created user: ${user.email}`)
    }

    // Create test users with specific roles for testing endpoints
    const testUsers = [
      {
        full_name: 'Test Admin',
        email: 'teste.admin@genscan.com',
        username: 'teste.admin',
        password: await hash.make('Admin@123'),
        role: IRole.Slugs.ADMIN,
        is_deleted: false,
        metadata: {
          email_verified: true,
          email_verified_at: DateTime.now().toISO(),
          email_verification_token: null,
          email_verification_sent_at: null,
        },
      },
      {
        full_name: 'Test User',
        email: 'teste.user@genscan.com',
        username: 'teste.user',
        password: await hash.make('User@123'),
        role: IRole.Slugs.USER,
        is_deleted: false,
        metadata: {
          email_verified: true,
          email_verified_at: DateTime.now().toISO(),
          email_verification_token: null,
          email_verification_sent_at: null,
        },
      },
      {
        full_name: 'Test Guest',
        email: 'teste.guest@genscan.com',
        username: 'teste.guest',
        password: await hash.make('Guest@123'),
        role: IRole.Slugs.GUEST,
        is_deleted: false,
        metadata: {
          email_verified: true,
          email_verified_at: DateTime.now().toISO(),
          email_verification_token: null,
          email_verification_sent_at: null,
        },
      },
    ]

    for (const testUserData of testUsers) {
      const { role: roleSlug, ...userData } = testUserData
      const user = await User.create(userData)

      const role = await Role.findBy('slug', roleSlug)
      if (role) {
        await user.related('roles').attach([role.id])
        logger.debug(`  ✓ Created test user: ${user.email} with role: ${roleSlug}`)
      }
    }

    // Create test users
    const testUser1 = await UserFactory.merge({
      full_name: 'Test User 1',
      email: 'teste1@example.com',
      username: 'teste1',
      password: await hash.make('Test@123'),
    })
      .apply('verified')
      .create()

    logger.debug(`  ✓ Created test user: ${testUser1.email}`)

    const testUser2 = await UserFactory.merge({
      full_name: 'Test User 2',
      email: 'teste2@example.com',
      username: 'teste2',
      password: await hash.make('Test@123'),
    }).create()

    logger.debug(`  ✓ Created test user: ${testUser2.email} (unverified)`)

    // Create additional random users for testing
    const randomUsers = await UserFactory.merge({
      password: await hash.make('Random@123'),
    }).createMany(5)

    logger.debug(`  ✓ Created ${randomUsers.length} additional random users`)
  }
}
