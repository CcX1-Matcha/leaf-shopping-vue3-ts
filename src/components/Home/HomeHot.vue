<script setup lang="ts">
import { getGoodsHotApi } from '@/api/goods'
import { onMounted, ref } from 'vue'

interface HotList {
  id: string
  picture: string
  title: string
  alt: string
}

const hotList = ref<HotList[]>([])

onMounted(async () => {
  const result = await getGoodsHotApi()
  // console.log(result)
  hotList.value = result.data.result
})
</script>

<template>
  <div class="home-panel">
    <div class="container">
      <div class="head">
        <!-- 主标题和副标题 -->
        <h3>人气推荐<small>人气爆款 不容错过</small></h3>
      </div>
      <!-- 主体内容区域 -->
      <div>
        <ul class="goods-list">
          <li v-for="item in hotList" :key="item.id">
            <RouterLink to="/">
              <img :src="item.picture" alt="" />
              <p class="name">{{ item.title }}</p>
              <p class="alt">{{ item.alt }}</p>
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

    .alt {
      font-size: 18px;
      color: #999;
      text-align: center;
    }
  }
}
</style>
