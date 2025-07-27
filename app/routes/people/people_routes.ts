import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#interfaces/permission_interface'

const PeopleController = () => import('#controllers/person/people_controller')

router
  .group(() => {
    router
      .get('/', [PeopleController, 'paginate'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.LIST}`,
        })
      )
      .as('people.paginate')

    router
      .get('/:id', [PeopleController, 'get'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.READ}`,
        })
      )
      .as('people.get')

    router
      .post('/', [PeopleController, 'create'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('people.create')

    router
      .put('/:id', [PeopleController, 'update'])
      .where('id', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('people.update')
  })
  .use([middleware.auth(), apiThrottle])
  .prefix('/api/v1/people')
