import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#interfaces/permission_interface'

const SearchController = () => import('#controllers/person/search_controller')

router
  .group(() => {
    router
      .get('/search', [SearchController, 'search'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.READ}`,
        })
      )
      .as('people.search')

    router
      .get('/search/mother', [SearchController, 'searchByMother'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.READ}`,
        })
      )
      .as('people.search.mother')

    router
      .get('/search/cpf', [SearchController, 'searchByCpf'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PEOPLE}.${IPermission.Actions.READ}`,
        })
      )
      .as('people.search.cpf')
  })
  .use([middleware.auth(), apiThrottle])
  .prefix('/api/v1/people')
