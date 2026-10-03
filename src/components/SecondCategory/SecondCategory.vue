<script setup lang="ts">
import { defineProps } from 'vue'
import type { SecondCategoryChild } from '@/types/goods'

defineProps<{ secondCategory: SecondCategoryChild }>()
</script>

<template>
  <div class="scecondCategory">
    <div class="title">- {{ secondCategory.name }} -</div>
    <div class="content">
      <ul>
        <li v-for="item in secondCategory.goods" :key="item.id">
          <RouterLink :to="`/detail/${item.id}`">
            <img :src="item.picture" alt="" />
            <p class="name">{{ item.name }}</p>
            <p class="desc">{{ item.desc }}</p>
            <p class="price">￥{{ item.price }}</p>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scecondCategory {
  margin-top: 20px;
  height: 425px;
  background-color: #fff;
  padding-top: 20px;
  .title {
    margin-top: 10px;
    font-size: 26px;
    color: rgb(102, 102, 102);
    text-align: center;
  }
  ul {
    padding: 30px;
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
}
</style>
