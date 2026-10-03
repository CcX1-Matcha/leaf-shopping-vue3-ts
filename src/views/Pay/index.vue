<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOrderDetailApi } from '@/api/order'
import { useCountDown } from '@/composables/useCountDown'
import type { OrderDetailData } from '@/types/order'

const router = useRouter()

const baseURL = (import.meta.env.VITE_API_BASE || '') + '/'
const fullUrl = window.location.href
const payStartIndex = fullUrl.indexOf('pay/')
const backUrl = fullUrl.slice(0, payStartIndex + 4) + 'result'
const redirectUrl = encodeURIComponent(backUrl)
const payUrl = `${baseURL}pay/aliPay?orderId=${router.currentRoute.value.params.id}&redirect=${redirectUrl}`

const loading = ref(false)
const paymentPlatform = ref()
const paymentMethod = ref()
const orderDetail = ref<OrderDetailData>()

const { formatTime, start } = useCountDown()

onMounted(async () => {
  loading.value = true
  try {
    const {
      data: { result }
    } = await getOrderDetailApi(router.currentRoute.value.params.id as string)
    console.log(result)
    orderDetail.value = result
    if (orderDetail.value?.countdown && orderDetail.value?.countdown > 0) {
      start(orderDetail.value?.countdown)
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
})

const submitPayment = async () => {
  window.location.href = payUrl
}
</script>

<template>
  <div class="container" v-loading="loading">
    <div
      class="content"
      v-if="orderDetail?.countdown && orderDetail?.countdown > 0"
    >
      <div class="success-tip">
        <div class="left">
          <el-icon class="success-icon"><CircleCheck /></el-icon>
          <div class="right">
            <p class="tip-title">订单提交成功！请尽快完成支付。</p>
            <p class="countdown">支付还剩 {{ formatTime }}，超时后将取消订单</p>
          </div>
        </div>
        <div class="rigth">
          应付总额：<span style="color: #cf4444; font-weight: bold"
            >¥{{ orderDetail?.totalMoney }}</span
          >
        </div>
      </div>

      <div class="payment">
        <div class="payment-section">
          <p class="section-title">选择以下支付方式付款</p>
          <p class="sub-title">支付平台</p>
          <el-radio-group
            v-model="paymentPlatform"
            class="radio-group"
            size="large"
            style="margin: 20px 10px"
            fill="#27ba9b"
          >
            <el-radio-button label="wechat" class="radio-item" :disabled="true">
              <el-icon class="wechat-icon"><ChatDotRound /></el-icon> 微信支付
            </el-radio-button>
            <el-radio-button
              label="alipay"
              class="radio-item"
              @click="submitPayment"
            >
              <el-icon class="alipay-icon"><Shop /></el-icon> 支付宝
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 支付方式选择区 -->
        <div class="payment-methods">
          <p class="sub-title">支付方式</p>
          <el-radio-group
            v-model="paymentMethod"
            class="radio-group"
            size="large"
            style="margin: 20px 10px"
            fill="#27ba9b"
          >
            <el-radio-button label="cmb" :disabled="true"
              >招商银行</el-radio-button
            >
            <el-radio-button label="icbc" :disabled="true"
              >工商银行</el-radio-button
            >
            <el-radio-button label="ccb" :disabled="true"
              >建设银行</el-radio-button
            >
            <el-radio-button label="abc" :disabled="true"
              >农业银行</el-radio-button
            >
            <el-radio-button label="comm" :disabled="true"
              >交通银行</el-radio-button
            >
          </el-radio-group>
        </div>
      </div>
    </div>
    <div class="empty" v-else>
      <el-empty description="订单消失了，请重新下单" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  margin-top: 20px;
  // 成功提示区样式
  .success-tip {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    justify-content: space-between;
    background-color: #fff;
    height: 200px;
    padding: 0 120px;

    .left {
      display: flex;
      .success-icon {
        color: #27ba9b;
        font-size: 48px;
        vertical-align: middle;
        margin-right: 12px;
      }
      .tip-title {
        font-size: 18px;
        font-weight: 500;
        color: #303133;
        margin-bottom: 5px;
      }
      .countdown {
        font-size: 14px;
        font-weight: lighter;
        color: #909399;
      }
    }
  }
  .payment {
    background-color: #fff;
    height: 400px;
    // 支付区域通用样式
    .section-title {
      font-size: 16px;
      color: #303133;
      padding: 12px;
      border-bottom: 1px solid #f5f5f5;
    }

    .sub-title {
      padding: 12px;
      font-size: 14px;
      color: #606266;
    }

    // 单选组样式
    .radio-group {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
  }
}
</style>
