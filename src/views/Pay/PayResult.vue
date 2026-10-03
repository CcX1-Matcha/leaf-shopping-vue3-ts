<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderDetailApi } from '@/api/order'
import type { OrderDetailData } from '@/types/order'

const loading = ref(false)

const route = useRoute()
const orderDetail = ref<OrderDetailData>()

onMounted(async () => {
  if (!route.query.orderId) return
  loading.value = true
  const {
    data: { result }
  } = await getOrderDetailApi(route.query.orderId as string)
  orderDetail.value = result
  // console.log(result)
  loading.value = false
})
</script>

<template>
  <div class="container" v-loading="loading">
    <div class="content">
      <el-icon class="success-icon" v-if="$route.query.payResult === 'true'"
        ><CircleCheck
      /></el-icon>
      <el-icon class="error-icon" v-else><CircleClose /></el-icon>
      <p class="success-text" style="font-size: 24px; font-weight: bold">
        支付成功
      </p>
      <p class="success-text" style="font-size: 12px; font-weight: lighter">
        我们将尽快为您安排发货，收货期间请保持电话畅通
      </p>
      <p class="success-text">
        支付方式：{{ orderDetail?.payType === 1 ? '支付宝' : '微信' }}
      </p>
      <p class="success-text">
        支付金额：￥{{ orderDetail?.totalMoney.toFixed(2) }}
      </p>
      <div class="btn">
        <el-button
          color="#27ba9b"
          style="color: #fff"
          size="default"
          @click="$router.push(`/pay/${orderDetail?.id}`)"
          :disabled="$route.query.payResult === 'true'"
          >返回订单</el-button
        >
        <el-button type="default" size="default" @click="$router.push('/')"
          >返回首页</el-button
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  height: 500px;
  background-color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  .content {
    text-align: center;
    .success-icon {
      color: #27ba9b;
      font-size: 54px;
      vertical-align: middle;
    }
    .error-icon {
      color: #ff4949;
      font-size: 54px;
      vertical-align: middle;
    }
    .success-text {
      margin-top: 10px;
    }
  }
  .btn {
    margin-top: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    button {
      margin-right: 20px;
    }
  }
}
</style>
