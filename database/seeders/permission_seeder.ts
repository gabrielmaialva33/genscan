import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

import AssignDefaultPermissionsService from '#services/permissions/assign_default_permissions_service'

export default class PermissionSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    logger.info('Creating default permissions and assigning to roles...')
    
    const service = await app.container.make(AssignDefaultPermissionsService)
    await service.run()
    
    logger.info('✅ Permissions created and assigned to roles successfully!')
  }
}