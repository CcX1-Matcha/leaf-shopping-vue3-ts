import request from '@/utils/request'
import type { GetOrderListParams } from '@/types/order'

export const getOrderDetailApi = (id: string) => {
  return request.get(`/member/order/${id}`)
}

/*
params: {
	orderState:0,
  page:1,
  pageSize:2
}
*/
export const getOrderListApi = (params: GetOrderListParams) => {
  return request.get('/member/order', { params })
}
