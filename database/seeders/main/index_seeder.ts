import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

export default class IndexSeeder extends BaseSeeder {
  private async seed(Seeder: { default: typeof BaseSeeder }) {
    /**
     * Do not run when not in a environment specified in Seeder
     */
    if (Seeder.default.environment && !Seeder.default.environment.includes(app.nodeEnvironment)) {
      return
    }

    await new Seeder.default(this.client).run()
  }

  async run() {
    logger.info('🌱 Starting database seeding...')

    // Execute seeders in order of dependency
    logger.info('👤 Seeding users...')
    await this.seed(await import('#database/seeders/user_seeder'))

    logger.info('🌳 Seeding family trees...')
    await this.seed(await import('#database/seeders/family_tree_seeder'))

    logger.info('👥 Seeding people...')
    await this.seed(await import('#database/seeders/person_seeder'))

    logger.info('💑 Seeding relationships...')
    await this.seed(await import('#database/seeders/relationship_seeder'))

    logger.info('✅ Database seeding completed!')
  }
}
