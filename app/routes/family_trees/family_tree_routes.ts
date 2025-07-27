import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#interfaces/permission_interface'

const FamilyTreesController = () => import('#controllers/family_tree/family_trees_controller')
const ChartDataController = () => import('#controllers/family_tree/chart_data_controller')

router
  .group(() => {
    router
      .get('/', [FamilyTreesController, 'paginate'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.LIST}`,
        })
      )
      .as('family_tree.paginate')

    router
      .get('/:id', [FamilyTreesController, 'get'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.READ}`,
        })
      )
      .as('family_tree.get')

    router
      .post('/', [FamilyTreesController, 'create'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('family_tree.create')

    router
      .put('/:id', [FamilyTreesController, 'update'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('family_tree.update')

    router
      .delete('/:id', [FamilyTreesController, 'delete'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.DELETE}`,
        })
      )
      .as('family_tree.delete')

    router
      .get('/:id/chart-data', [ChartDataController, 'show'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FAMILY_TREES}.${IPermission.Actions.READ}`,
        })
      )
      .as('family_tree.chart_data')
  })
  .use([middleware.auth(), apiThrottle])
  .prefix('/api/v1/family-trees')
