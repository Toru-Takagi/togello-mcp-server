import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export const getTodoCategoryListHandler = async () => {
  try {
    const categoryList = await httpClient.fetchURL<CategoryListResponse[]>({
      path: '/v2/integration/categories',
    })

    return jsonToolResponse({
      categories: categoryList.map((category) => ({
        categoryUUID: category.categoryUUID,
        label: category.label,
      })),
    })
  } catch (error) {
    console.error('Error in tool handler:', error)
    return errorToolResponse(`Error in tool handler: ${error}`)
  }
}

type CategoryListResponse = {
  categoryUUID: string | null
  label: string
  operatedAt: string
}
