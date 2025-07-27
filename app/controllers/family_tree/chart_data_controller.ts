import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import GetFamilyTreeChartDataService from '#services/family_trees/get_family_tree_chart_data_service'

@inject()
export default class ChartDataController {
  /**
   * Get family tree data in the family-chart library format
   */
  async show({ params, response, auth }: HttpContext) {
    const familyTreeId = params.id
    const user = auth.user!

    const service = await app.container.make(GetFamilyTreeChartDataService)
    const chartData = await service.run(familyTreeId, user.id)

    return response.json(chartData)
  }
}
