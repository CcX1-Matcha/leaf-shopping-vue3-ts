import request from '@/utils/request'
export const addCartApi = (skuId: string, count: number) => {
  return request.post('member/cart', {
    skuId,
    count
  })
}

export const getCartListApi = () => {
  return request.get('/member/cart')
}

export const deleteCartGoodsApi = (ids: string[]) => {
  return request.delete('/member/cart', {
    data: {
      ids
    }
  })
}

export const updateCartSelectedApi = (selected: boolean, ids: string[]) => {
  return request.put('/member/cart/selected', {
    selected,
    ids
  })
}

export const updateCartGoodsCountApi = (id: string, count: number) => {
  return request.put(`/member/cart/${id}`, {
    count
  })
}
