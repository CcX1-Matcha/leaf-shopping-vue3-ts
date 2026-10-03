<script setup lang="ts">
import { ref } from 'vue'
import type { GetOrderListParams, OrderList } from '@/types/order'
import { getOrderListApi } from '@/api/order'

const props = defineProps<{
  type: number
}>()

const loading = ref(false)
const stateMap = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '待评价',
  5: '已完成',
  6: '已取消'
}

const params = ref<GetOrderListParams>({
  orderState: 0,
  page: 1,
  pageSize: 2
})
const orderList = ref<OrderList>()

const init = async () => {
  loading.value = true
  params.value.orderState = props.type
  console.log(params.value.orderState)
  try {
    const {
      data: { result }
    } = await getOrderListApi(params.value)
    orderList.value = result
    console.log(orderList.value)
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}
init()

defineExpose({
  init
})
</script>

<template>
  <div
    class=""
    v-loading="loading"
    element-loading-text="这个页面加载较慢，请耐心等待..."
  >
    <div v-if="orderList?.items.length">
      <!-- 每个订单项 -->
      <div class="order-list" v-for="order in orderList?.items" :key="order.id">
        <!-- 订单时间&编号栏 -->
        <div class="order-time">
          <p>下单时间：{{ order.createTime }}</p>
          <p>订单编号：{{ order.id }}</p>
        </div>
        <!-- 订单主体（商品列表 + 右侧状态/价格/操作） -->
        <div class="order-body">
          <!-- 商品列表 -->
          <div class="skus-list">
            <ul>
              <li v-for="sku in order.skus" :key="sku.id">
                <div class="order-sku">
                  <img :src="sku.image" alt="商品图" />
                  <div class="sku-text">
                    <p class="sku-name">{{ sku.name }}</p>
                    <p class="sku-attrs">{{ sku.attrsText }}</p>
                  </div>
                  <div class="sku-price">￥{{ sku.realPay }}</div>
                  <div class="sku-quantity">x{{ sku.quantity }}</div>
                </div>
              </li>
            </ul>
          </div>
          <!-- 右侧状态/价格/操作区 -->
          <div class="order-right">
            <div class="order-status">
              {{ stateMap[order.orderState as keyof typeof stateMap] }}
            </div>
            <div class="order-total">
              <p>¥{{ order.totalMoney }}</p>
              <p>(含运费：¥{{ order.postFee }})</p>
              <p>{{ order.payType === 1 ? '在线支付' : '货到付款' }}</p>
            </div>
            <el-button type="text" @click="$router.push(`/pay/${order.id}`)"
              >查看详情</el-button
            >
          </div>
        </div>
      </div>
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="orderList?.counts"
          v-model:current-page="params.page"
          :page-size="params.pageSize"
          :hide-on-single-page="true"
          @change="init"
        />
      </div>
    </div>
    <div class="empty" v-else>
      <el-empty dw="60" :description="`暂无订单`"> </el-empty>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 单个订单容器
.order-list {
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden; // 防止内部元素溢出
}

// 订单时间&编号栏
.order-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
  p {
    font-size: 14px;
    color: #666;
  }
}

// 订单主体（商品+右侧区域）
.order-body {
  display: flex;
  padding: 15px;
}

// 商品列表区域
.skus-list {
  flex: 1; // 占主宽度
  ul {
    list-style: none;
    li {
      .order-sku {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        &:last-child {
          margin-bottom: 0;
        }
        img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          margin-right: 10px;
          border: 1px solid #eee;
        }
        .sku-text {
          flex: 1; // 占文字区域宽度
          .sku-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 5px;
          }
          .sku-attrs {
            font-size: 12px;
            color: #999;
          }
        }
        .sku-price {
          font-size: 14px;
          color: #e4393c; // 价格红色
          margin-right: 15px;
        }
        .sku-quantity {
          font-size: 14px;
        }
      }
    }
  }
}

// 右侧状态/价格/操作区
.order-right {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  .order-status {
    font-size: 14px;
    color: #e4393c; // 状态颜色（可根据实际状态调整，如“已完成”用绿色）
    margin-bottom: 10px;
  }
  .order-total {
    text-align: right;
    p {
      font-size: 14px;
      &:first-child {
        font-size: 16px;
        color: #e4393c;
        font-weight: 600;
      }
      &:nth-child(2),
      &:nth-child(3) {
        font-size: 12px;
        color: #999;
      }
    }
  }
  .el-button {
    margin-top: 10px;
    padding: 0;
    font-size: 14px;
  }
}

.pagination-container {
  display: flex;
  justify-content: center; // 水平居中
}
</style>
