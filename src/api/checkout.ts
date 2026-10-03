import request from '@/utils/request'
import type { UserAddress, submitOderData } from '@/types/checkout'

export const getCheckoutDataApi = () => {
  return request.get('/member/order/pre')
}

export const updateAddressApi = (data: UserAddress) => {
  return request.put(`/member/address/${data.id}`, data)
}

export const getAddressApi = () => {
  return request.get('/member/address')
}

export const addAddressApi = (data: UserAddress) => {
  return request.post('/member/address', data)
}

export const deleteAddressApi = (id: string) => {
  return request.delete(`/member/address/${id}`)
}

export const submitOrderApi = (data: submitOderData) => {
  return request.post('/member/order', data)
}
