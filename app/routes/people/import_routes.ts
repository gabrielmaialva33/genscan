import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#interfaces/permission_interface'

const ImportController = () => import('#controllers/person/import_controller')

router
  .group(() => {
    router
      .post('/cpf', [ImportController, 'importFromCpf'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.IMPORTS}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('imports.cpf')

    router
      .post('/mother-name', [ImportController, 'importFromMother'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.IMPORTS}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('imports.mother')

    router
      .post('/full-tree', [ImportController, 'importFullTree'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.IMPORTS}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('imports.fullTree')

    router
      .get('/:id/status', [ImportController, 'getImportStatus'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.IMPORTS}.${IPermission.Actions.READ}`,
        })
      )
      .as('imports.status')
  })
  .use([middleware.auth(), apiThrottle])
  .prefix('/api/v1/imports')
