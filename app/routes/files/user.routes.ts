import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { uploadThrottle } from '#start/limiter'
import IPermission from '#interfaces/permission_interface'

const FilesController = () => import('#controllers/file/files_controller')

router
  .group(() => {
    router
      .post('/upload', [FilesController, 'upload'])
      .use([
        middleware.permission({
          permissions: `${IPermission.Resources.FILES}.${IPermission.Actions.CREATE}`,
        }),
        uploadThrottle,
      ])
      .as('files.upload')
  })
  .use(middleware.auth())
  .prefix('/api/v1/files')
