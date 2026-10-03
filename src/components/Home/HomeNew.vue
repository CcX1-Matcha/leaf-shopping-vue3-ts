<script setup lang="ts">
import { getGoodsNewApi } from '@/api/goods'
import { onMounted, ref } from 'vue'

interface NewList {
  desc: string
  id: string
  name: string
  picture: string
  orderNum: number
  price: string
}

const newList = ref<NewList[]>([])

onMounted(async () => {
  const result = await getGoodsNewApi()
  // console.log(result)
  newList.value = result.data.result
})
</script>

<template>
  <div class="home-panel">
    <div class="container">
      <div class="head">
        <!-- 主标题和副标题 -->
        <h3>新鲜好物<small>新鲜出炉 品质靠谱</small></h3>
      </div>
      <!-- 主体内容区域 -->
      <div>
        <ul class="goods-list">
          <li v-for="item in newList" :key="item.id">
            <RouterLink :to="`/detail/${item.id}`">
              <img :src="item.picture" alt="" />
              <p class="name">{{ item.name }}</p>
              <p class="price">&yen;{{ item.price }}</p>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-panel {
  background-color: #fff;

  .head {
    padding: 40px 0;
    display: flex;
    align-items: flex-end;

    h3 {
      flex: 1;
      font-size: 32px;
      font-weight: normal;
      margin-left: 6px;
      height: 35px;
      line-height: 35px;

      small {
        font-size: 16px;
        color: #999;
        margin-left: 20px;
      }
    }
  }
}
.goods-list {
  display: flex;
  justify-content: space-between;
  height: 406px;

  li {
    width: 306px;
    height: 406px;

    background: #f0f9f4;
    transition: all 0.5s;

    &:hover {
      transform: translate3d(0, -3px, 0);
      box-shadow: 0 3px 8px rgb(0 0 0 / 20%);
    }

    img {
      width: 306px;
      height: 306px;
    }

    p {
      font-size: 22px;
      padding-top: 12px;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .price {
      color: $priceColor;
    }
  }
}
</style>
