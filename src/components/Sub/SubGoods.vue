<script setup lang="ts">
import { computed, defineProps, ref } from 'vue'
import { getSubCategoryAPI } from '@/api/goods'
import type { SubFiltrate } from '@/types/goods'
import type { GoodsItem } from '@/types/goods'

const prop = defineProps<{
  subId: string
  sort: 'publishTime' | 'orderNum' | 'evaluateNum'
}>()

const subFilterData = ref<SubFiltrate>({
  categoryId: prop.subId,
  page: 1,
  pageSize: 20,
  sort: 'publishTime'
})

const goodsItem = ref<GoodsItem[]>([]) // 商品详情

const init = async (clear: boolean = false) => {
  if (clear) {
    goodsItem.value = []
    subFilterData.value.page = 1
    noMore.value = false
  }
  subFilterData.value.sort = prop.sort
  const {
    data: { result }
  } = await getSubCategoryAPI(subFilterData.value)
  // console.log(result, 'SubCategory')
  if (result.items.length === 0) {
    noMore.value = true
  } else {
    goodsItem.value = [...goodsItem.value, ...result.items]
  }
}

init()

const loading = ref(false)
const noMore = ref(false)
const disabled = computed(() => loading.value || noMore.value)

const load = async () => {
  loading.value = true
  subFilterData.value.page += 1
  await init()
  loading.value = false
}

defineExpose({
  init
})
</script>

<template>
  <div class="subGoods">
    <ul v-infinite-scroll="load" :infinite-scroll-disabled="disabled">
      <li v-for="item in goodsItem" :key="item.id">
        <RouterLink :to="`/detail/${item.id}`">
          <img :src="item.picture" alt="" />
          <p class="name">{{ item.name }}</p>
          <p class="desc">{{ item.desc }}</p>
          <p class="price">￥{{ item.price }}</p>
        </RouterLink>
      </li>
    </ul>
    <hr />
    <p v-if="loading">Loading...</p>
    <p v-if="noMore">-· 没有更多了 ·-</p>
  </div>
</template>

<style scoped lang="scss">
.subGoods {
  height: 100%;
  background-color: #fff;
  padding-top: 20px;
  ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    li {
      width: 225px;
      height: 300px;
      background-color: #fff;
      text-align: center;
      line-height: 100px;
      font-size: 18px;
      cursor: pointer;
      transform: translate3d(0, 0, 0); // 默认状态（与hover状态对应）
      box-shadow: 0 0 0 transparent; // 默认状态（与hover状态对应）

      // 关键：添加过渡动画，指定过渡的属性、时长和缓动函数
      transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
      &:hover {
        transform: translate3d(0, -3px, 0);
        box-shadow: 0 3px 8px rgb(0 0 0 / 20%);
      }
      img {
        margin-top: 20px;
        width: 75%;
        height: 50%;
      }
      p {
        padding: 0 10px;
        height: auto;
        margin-top: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.5;
        text-align: center;
      }
      .name {
        color: rgb(51, 51, 51);
        // font-size: 18px;
        font-weight: bold;
      }
      .desc {
        padding: 0 30px;
        color: rgb(180, 180, 180);
        // font-size: 12px;
        font-weight: lighter;
      }
      .price {
        color: $priceColor;
        font-size: 20px;
      }
    }
  }
  p {
    text-align: center;
    margin-top: 20px;
    color: rgb(180, 180, 180);
    font-size: 14px;
    font-weight: lighter;
  }
}
</style>
