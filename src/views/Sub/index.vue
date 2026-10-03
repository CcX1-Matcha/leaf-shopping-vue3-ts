<script setup lang="ts">
import { useRoute } from 'vue-router'
import { getCategorySubFilterAPI } from '@/api/goods'
import { ArrowRight } from '@element-plus/icons-vue'
import type { CategorySubFilter } from '@/types/goods'
import { onMounted, ref } from 'vue'
import type SubGoods from '@/components/Sub/SubGoods.vue'

const route = useRoute()
const subId = route.params.subId as string

const subFilter = ref<CategorySubFilter | null>(null)

onMounted(async () => {
  const {
    data: { result }
  } = await getCategorySubFilterAPI(subId)
  // console.log(result)
  subFilter.value = result
  console.log(subFilter.value, 'SubFilter')
})

const subGoodsRef = ref<typeof SubGoods>()

const activeName = ref('publishTime')

const tabChange = () => {
  // console.log(subGoodsRef.value.init)
  subGoodsRef?.value?.init(true)
}
</script>

<template>
  <div class="container">
    <div class="breadcrumb">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item
          :to="{ path: `/category/${subFilter?.parentId}` }"
          >{{ subFilter?.parentName }}</el-breadcrumb-item
        >
        <el-breadcrumb-item>{{ subFilter?.name }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="goods-list">
      <el-tabs v-model="activeName" class="demo-tabs" @tab-change="tabChange">
        <el-tab-pane label="最新商品" name="publishTime"> </el-tab-pane>
        <el-tab-pane label="最高人气" name="orderNum"></el-tab-pane>
        <el-tab-pane label="评论最多" name="evaluateNum"></el-tab-pane>
      </el-tabs>
      <subGoods :subId="subId" :sort="activeName" ref="subGoodsRef"></subGoods>
    </div>
  </div>
</template>

<style scoped lang="scss">
.breadcrumb {
  margin: 20px 0;
}
.goods-list {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #fff;
}
</style>
