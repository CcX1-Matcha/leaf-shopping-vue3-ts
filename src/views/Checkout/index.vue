<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getCheckoutDataApi,
  updateAddressApi,
  deleteAddressApi,
  submitOrderApi
} from '@/api/checkout'
import type { CheckoutData, UserAddress, GoodsItem } from '@/types/checkout'
import { Edit, Delete } from '@element-plus/icons-vue'
import type AddressInfo from '@/components/Checkout/AddressInfo.vue'
import router from '@/router'

const checkoutData = ref<CheckoutData>()
const addressList = ref<UserAddress[]>([])
const defaultAddress = ref<UserAddress>()

const isShowAddressInfo = ref(false)
const isSelectAddressId = ref<string>('')

const productList = ref<GoodsItem[]>([])

const deliveryTimeType = ref<number>(1)
const payType = ref<number>(1)
const payChannel = ref<number>(1)
const buyerMessage = ref<string>('')
const goods = ref<{ skuId: string; count: number }[]>([])

const getProductList = async () => {
  const {
    data: { result }
  } = await getCheckoutDataApi()
  checkoutData.value = result
  addressList.value = result.userAddresses
  defaultAddress.value = result.userAddresses.find(
    (address: UserAddress) => address.isDefault === 0
  )
  isSelectAddressId.value = defaultAddress.value?.id || ''

  productList.value = result.goods
  // console.log(defaultAddress.value)
  // console.log(checkoutData.value)
}

const totalCount = computed(() => {
  return productList.value.reduce((acc, cur) => acc + cur.count, 0)
})
const totalPrice = computed(() => {
  return productList.value.reduce((acc, cur) => acc + Number(cur.totalPrice), 0)
})

const submitUpdateAddress = async () => {
  const addressData = ref<UserAddress>()
  addressData.value = addressList.value.find(
    (address: UserAddress) => address.id === isSelectAddressId.value
  )
  if (addressData.value) {
    addressData.value.isDefault = 0
    await updateAddressApi(addressData.value)
    getProductList()
    ElMessage.success('修改成功')
    isShowAddressInfo.value = false
  } else {
    ElMessage.error('请选择地址')
  }
}
const cancelUpdateAddress = () => {
  isSelectAddressId.value = defaultAddress.value?.id || ''
  isShowAddressInfo.value = false
}

const deleteAddress = async (addressId: string) => {
  if (addressId) {
    try {
      await deleteAddressApi(addressId)
    } catch (error) {
      ElMessage.error('删除失败')
      console.log(error)
    }
    getProductList()
    ElMessage.success('删除成功')
    isShowAddressInfo.value = false
  }
}

const submitOrder = async () => {
  goods.value = productList.value.map((item) => ({
    skuId: item.skuId,
    count: item.count
  }))
  console.log(
    deliveryTimeType.value,
    payType.value,
    payChannel.value,
    buyerMessage.value,
    goods.value,
    defaultAddress.value?.id
  )
  try {
    const {
      data: { result }
    } = await submitOrderApi({
      deliveryTimeType: deliveryTimeType.value,
      payType: payType.value,
      payChannel: payChannel.value,
      buyerMessage: buyerMessage.value,
      goods: goods.value,
      addressId: defaultAddress.value?.id || ''
    })
    router.push(`/pay/${result.id}`)
  } catch (error) {
    ElMessage.error('提交失败')
    console.log(error)
  }
}

const AddressInfoRef = ref<InstanceType<typeof AddressInfo>>()

onMounted(() => {
  getProductList()
})
</script>

<template>
  <div class="container">
    <div class="content" v-if="checkoutData">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span style="font-weight: lighter">收货地址</span>
          </div>
        </template>
        <div class="address-info">
          <div class="address-details">
            <div class="address-item">
              <span class="el-text-title">收<i />货<i />人：</span>
              <span class="el-text">{{ defaultAddress?.receiver }}</span>
            </div>
            <div class="address-item">
              <span class="el-text-title">联系方式：</span>
              <span class="el-text">{{ defaultAddress?.contact }}</span>
            </div>
            <div class="address-item">
              <span class="el-text-title">收货地址：</span>
              <span class="el-text">{{ defaultAddress?.address }}</span>
            </div>
          </div>
          <div class="address-actions">
            <el-button
              type="text"
              size="small"
              @click="isShowAddressInfo = true"
              >切换地址</el-button
            >
            <el-button
              type="primary"
              size="small"
              @click="AddressInfoRef?.open()"
              >添加地址</el-button
            >
          </div>
        </div>
      </el-card>
      <el-dialog
        v-model="isShowAddressInfo"
        title="切换地址"
        width="500"
        @close="cancelUpdateAddress"
      >
        <div class="address-list-dialog">
          <ul>
            <li
              v-for="address in addressList"
              :key="address.id"
              @click="isSelectAddressId = address.id || ''"
            >
              <el-card
                shadow="hover"
                :class="{ active: isSelectAddressId === address.id }"
              >
                <div class="address-list-item">
                  <div class="address-details">
                    <div class="address-item">
                      <span class="el-text-title">收<i />货<i />人：</span>
                      <span class="el-text">{{ address.receiver }}</span>
                    </div>
                    <div class="address-item">
                      <span class="el-text-title">联系方式：</span>
                      <span class="el-text">{{ address.contact }}</span>
                    </div>
                    <div class="address-item">
                      <span class="el-text-title">收货地址：</span>
                      <span class="el-text">{{ address.address }}</span>
                    </div>
                  </div>
                  <div class="rigth">
                    <el-button
                      :icon="Edit"
                      circle
                      style="color: #27ba9b"
                      @click="AddressInfoRef?.open(address)"
                    ></el-button>
                    <el-button
                      :icon="Delete"
                      circle
                      style="color: #27ba9b"
                      @click="deleteAddress(address.id || '')"
                    ></el-button>
                  </div>
                </div>
              </el-card>
            </li>
          </ul>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="cancelUpdateAddress">取消</el-button>
            <el-button type="primary" @click="submitUpdateAddress">
              确认
            </el-button>
          </div>
        </template>
      </el-dialog>
      <AddressInfo
        ref="AddressInfoRef"
        @getProductList="getProductList"
      ></AddressInfo>

      <!-- 商品信息模块 -->
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span style="font-weight: lighter">商品信息</span>
          </div>
        </template>
        <el-table :data="productList" style="width: 100%">
          <el-table-column
            prop="name"
            label="商品信息"
            align="center"
            width="420"
          >
            <template #default="{ row }">
              <div class="product-info">
                <img :src="row.picture" alt="" />
                <div class="content">
                  <p class="name">{{ row.name }}</p>
                  <p class="dsc">{{ row.attrsText }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="单价" align="center">
            <template #default="{ row }"> ￥{{ row.price }} </template>
          </el-table-column>
          <el-table-column
            prop="count"
            label="数量"
            align="center"
          ></el-table-column>
          <el-table-column prop="totalPrice" label="小计" align="center">
            <template #default="{ row }"> ￥{{ row.totalPrice }} </template>
          </el-table-column>
          <el-table-column prop="totalPayPrice" label="实付" align="center">
            <template #default="{ row }"> ￥{{ row.totalPayPrice }} </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 配送时间模块 -->
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span style="font-weight: 500">配送时间</span>
          </div>
        </template>
        <el-radio-group
          v-model="deliveryTimeType"
          size="large"
          style="margin: 20px 10px"
          fill="#27ba9b"
        >
          <el-radio-button :label="1" style="margin-right: 10px"
            >不限送货时间：周一至周日</el-radio-button
          >
          <el-radio-button :label="2" style="margin-right: 10px"
            >工作日送货：周一至周五</el-radio-button
          >
          <el-radio-button :label="3"
            >双休日、假日送货：周六至周日</el-radio-button
          >
        </el-radio-group>
      </el-card>

      <!-- 支付方式模块 -->
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span style="font-weight: 500">支付方式</span>
          </div>
        </template>
        <el-radio-group
          v-model="payType"
          size="large"
          style="margin: 20px 10px"
          fill="#27ba9b"
        >
          <el-radio-button :label="1" style="margin-right: 10px"
            >在线支付</el-radio-button
          >
          <el-popconfirm
            class="box-item"
            title="货到付款需要额外5元手续费 (选在线支付接口要求)"
            placement="right"
            :hide-icon="true"
            width="220"
            :confirm-button-text="'确认'"
            :cancel-button-text="'取消'"
            @cancel="payType = 1"
            @confirm="payType = 2"
          >
            <template #reference>
              <el-radio-button :label="2">货到付款</el-radio-button>
            </template>
          </el-popconfirm>
        </el-radio-group>
      </el-card>

      <!-- 金额明细模块 -->
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span style="font-weight: 500">金额明细</span>
          </div>
        </template>
        <div class="content">
          <div class="goods-amount">
            <div class="item-price">
              <p class="item-label">商品件数</p>
              <p class="item-content">{{ totalCount }}件</p>
            </div>

            <div class="item-price">
              <p class="item-label">商品总价</p>
              <p class="item-content">¥{{ totalPrice.toFixed(2) }}</p>
            </div>

            <div class="item-price">
              <p class="item-label">运<i></i>费</p>
              <p class="item-content">¥6.00</p>
            </div>

            <div class="item-price" v-if="payType === 2">
              <p class="item-label">手续费</p>
              <p class="item-content">¥5.00</p>
            </div>

            <div class="item-price">
              <p class="item-label">应付总额</p>
              <p class="item-content" style="color: #cf4444; font-size: 24px">
                ¥{{ (totalPrice + 6 + (payType === 2 ? 5 : 0)).toFixed(2) }}
              </p>
            </div>
          </div>

          <div style="text-align: right; margin-top: 20px">
            <el-button
              color="#27ba9b"
              style="color: #fff"
              size="large"
              @click="submitOrder"
              >提交订单</el-button
            >
          </div>
        </div>
      </el-card>
    </div>
    <div class="empty" v-else>
      <el-empty description="暂无数据"></el-empty>
    </div>
  </div>
</template>

<style scoped lang="scss">
::v-deep .el-table__header th {
  background-color: #f5f5f5;
  color: #000;
  font-weight: 500;
}
.container {
  margin-top: 20px;
}
.address-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 30px;
}
.address-item {
  margin-bottom: 10px;
  i {
    width: 0.5em;
    display: inline-block;
  }
  .el-text-title {
    font-weight: lighter;
    margin-right: 5px;
  }
}
.address-list-dialog {
  ul {
    li {
      cursor: pointer;

      .el-card:hover {
        border-color: $xtxColor;
      }

      .el-card.active {
        background-color: lighten($xtxColor, 40%);
        border-color: $xtxColor;
      }
    }
  }
  .address-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
.add-address {
  margin: 20px;
}

.product-info {
  display: flex;
  align-items: center;
  padding: 10px 0;
  img {
    width: 80px;
    height: 80px;
    margin-right: 10px;
  }
  .content {
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    .name {
      font-size: 16px;
      margin-bottom: 5px;
    }
    .dsc {
      font-size: 14px;
      font-weight: lighter;
      color: #999;
      margin-bottom: 5px;
    }
  }
}
.content {
  margin-right: 20px;
  .goods-amount {
    max-width: 25%;
    margin-left: auto;
    .item-price {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      .item-content {
        font-size: 16px;
        font-weight: 500;
      }
      i {
        width: 2em;
        display: inline-block;
      }
    }
  }
}
</style>
