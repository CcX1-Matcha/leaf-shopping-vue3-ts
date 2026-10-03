import request from '@/utils/request'
import type { SubFiltrate } from '@/types/goods'

export const getGoodsCategoryApi = () => {
  return request.get('/home/category/head')
}

export const getGoodsBannerApi = (distributionSite?: string) => {
  return request.get('/home/banner', {
    params: {
      distributionSite: distributionSite ? distributionSite : '1'
    }
  })
}

export const getGoodsNewApi = () => {
  return request.get('/home/new')
}

export const getGoodsHotApi = () => {
  return request.get('/home/hot')
}

export const getGoodsProductApi = () => {
  return request.get('/home/goods')
}

export const getGoodsDoubleCategoryApi = (id: string) => {
  return request.get('/category', {
    params: {
      id
    }
  })
}

export const getCategorySubFilterAPI = (id: string) => {
  return request({
    url: '/category/sub/filter',
    params: {
      id
    }
  })
}

export const getSubCategoryAPI = (data: SubFiltrate) => {
  return request({
    url: '/category/goods/temporary',
    method: 'POST',
    data
  })
}

export const getGoodsDetailAPI = (id: string) => {
  return request.get('/goods', {
    params: {
      id
    }
  })
}

export const fetchHotGoodsAPI = (id: string, type: string, limit = 3) => {
  return request({
    url: '/goods/hot',
    params: {
      id,
      type,
      limit
    }
  })
}

export const getLikeGoodsListApi = ({ limit = 4 }) => {
  return request.get('/goods/relevant', {
    params: {
      limit
    }
  })
}
