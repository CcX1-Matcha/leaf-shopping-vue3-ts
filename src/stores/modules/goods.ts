import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category } from '@/types/goods'
import { getGoodsCategoryApi } from '@/api/goods'

export const useGoodsCategoryStore = defineStore('goodsCategory', () => {
  const goodsCategory = ref<Category[]>([])

  const getGoodsCategory = async () => {
    const {
      data: { result }
    } = await getGoodsCategoryApi()
    goodsCategory.value = result
    // console.log(goodsCategory.value)
  }

  return {
    goodsCategory,
    getGoodsCategory
  }
})
