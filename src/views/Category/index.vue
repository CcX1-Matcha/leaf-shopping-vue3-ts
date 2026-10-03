<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { ref, watch } from 'vue'
import { getGoodsDoubleCategoryApi } from '@/api/goods'
import type { SecondCategory } from '@/types/goods'

const route = useRoute()

const secondCategory = ref<SecondCategory>()

const init = async () => {
  // window.scrollTo({
  //   top: 0, // 目标滚动位置（顶部）
  //   behavior: 'smooth' // 平滑滚动（取值 'smooth' / 'auto'，auto 是瞬间跳转）
  // })
  const {
    data: { result }
  } = await getGoodsDoubleCategoryApi(route.params.id as string)
  console.log(result)
  secondCategory.value = result
}

watch(
  () => route.params.id, // 用函数返回最新的id值
  (newVal, oldVal) => {
    // 只有当id真正变化时才执行（排除首次加载时oldVal为undefined的情况）
    if (newVal && newVal !== oldVal) {
      init()
    }
  },
  { immediate: true } // 可选：是否在组件初始化时立即执行一次
)
</script>

<template>
  <div class="container">
    <div class="breadcrumb">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ secondCategory?.name }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <SecondBanner></SecondBanner>
    <div class="AllCategory">
      <div class="title">全部商品分类</div>
      <div class="category">
        <ul>
          <li v-for="item in secondCategory?.children" :key="item.id">
            <RouterLink :to="`sub/${item.id}`">
              <img :src="item.picture" alt="" />
              <p>{{ item.name }}</p>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
    <SecondCategory
      v-for="item in secondCategory?.children"
      :key="item.id"
      :secondCategory="item"
    ></SecondCategory>
  </div>
</template>

<style scoped lang="scss">
.breadcrumb {
  margin: 20px 0;
}
.AllCategory {
  margin-top: 20px;
  height: 330px;
  background-color: #fff;
  padding-top: 20px;
  .title {
    margin-top: 10px;
    font-size: 26px;
    color: rgb(102, 102, 102);
    text-align: center;
  }
  .category {
    padding: 30px 30px;
    ul {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      li {
        width: 125px;
        height: 125px;
        background-color: #f5f5f5;
        text-align: center;
        line-height: 100px;
        font-size: 18px;
        cursor: pointer;
        img {
          width: 100%;
          height: 100%;
        }
        &:hover {
          color: rgb(115, 222, 233);
        }
      }
    }
  }
}
</style>
