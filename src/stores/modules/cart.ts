import { defineStore } from 'pinia'
import { getCartListApi } from '@/api/cart'
import type { CartItem } from '@/types/cart'
import { computed, ref } from 'vue'

export const useCartListStore = defineStore('cartList', () => {
  const cartList = ref<CartItem[]>([])
  const getCartList = async () => {
    const res = await getCartListApi()
    cartList.value = res.data.result
    // console.log('cartList', cartList.value)
  }
  const totalCount = computed(() => {
    const total = cartList.value.reduce((acc, cur) => {
      return acc + Number(cur.count)
    }, 0)
    return total
  })

  const totalCountSelected = computed(() => {
    const total = cartList.value.reduce((acc, cur) => {
      if (cur.selected) {
        return acc + Number(cur.count)
      } else {
        return acc
      }
    }, 0)
    return total
  })

  const totalPrice = computed(() => {
    const total = cartList.value.reduce((acc, cur) => {
      if (cur.selected) {
        return acc + Number(cur.nowPrice) * Number(cur.count)
      } else {
        return acc
      }
    }, 0)
    return total.toFixed(2)
  })

  return {
    cartList,
    getCartList,
    totalCount,
    totalCountSelected,
    totalPrice
  }
})
