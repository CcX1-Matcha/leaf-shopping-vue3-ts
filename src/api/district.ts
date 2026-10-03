import axios from 'axios'

// 省市区数据由本地后端提供（后端地址在 .env 的 VITE_API_BASE 中配置）
const baseURL = import.meta.env.VITE_API_BASE || ''

export const getProvinceApi = () => {
  return axios.get(baseURL + '/district/provinces')
}

export const getCityApi = (proId: string) => {
  return axios.get(baseURL + '/district/city', {
    params: {
      proId
    }
  })
}

export const getAreaApi = (cityId: string) => {
  return axios.get(baseURL + '/district/area', {
    params: {
      cityId
    }
  })
}
