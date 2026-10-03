<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type OrderList from '@/components/Order/OrderList.vue'

const loading = ref(false)
const activeMap = {
  all: 0,
  unpaid: 1,
  unshipped: 2,
  unreceived: 3,
  unevaluate: 4,
  completed: 5,
  cancelled: 6
}
const activeName = ref<keyof typeof activeMap>('all')
const orderListRef = ref<InstanceType<typeof OrderList>>()

const tabChange = async (type: keyof typeof activeMap) => {
  loading.value = true
  activeName.value = type
  await nextTick()
  await orderListRef.value?.init()
  loading.value = false
}
</script>

<template>
  <div class="content" v-loading="loading">
    <div class="tab">
      <el-tabs v-model="activeName" class="demo-tabs" @tab-change="tabChange">
        <el-tab-pane label="全部订单" name="all"> </el-tab-pane>
        <el-tab-pane label="待付款" name="unpaid"></el-tab-pane>
        <el-tab-pane label="待发货" name="unshipped"></el-tab-pane>
        <el-tab-pane label="待收货" name="unreceived"></el-tab-pane>
        <el-tab-pane label="待评价" name="unevaluate"></el-tab-pane>
        <el-tab-pane label="已完成" name="completed"></el-tab-pane>
        <el-tab-pane label="已取消" name="cancelled"> </el-tab-pane>
      </el-tabs>
    </div>
    <OrderList :type="activeMap[activeName]" ref="orderListRef"></OrderList>
  </div>
</template>

<style scoped>
.content {
  background-color: #fff;
  height: 600px;
  padding: 10px 20px;
}
</style>
