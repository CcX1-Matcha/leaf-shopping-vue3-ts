<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useCartListStore } from '@/stores'
import type { CartItem } from '@/types/cart'
import { Delete } from '@element-plus/icons-vue'
import { deleteCartGoodsApi } from '@/api/cart'
import type { ElTable } from 'element-plus'
import { updateCartSelectedApi, updateCartGoodsCountApi } from '@/api/cart'
import router from '@/router'

const loading = ref(false)

const cartListStore = useCartListStore()

const tableData = ref<CartItem[]>([])

const tableRef = ref<typeof ElTable>()

const isInit = ref(false)

const initSelection = async () => {
  // 先清空现有选择
  isInit.value = true
  await nextTick()
  tableRef.value?.clearSelection()
  // 遍历数据，选中 selected 为 true 的行
  tableData.value.forEach((row: CartItem) => {
    if (row.selected) {
      tableRef.value?.toggleRowSelection(row, true)
    }
  })
  isInit.value = false
}

const getCartList = async () => {
  loading.value = true
  await cartListStore.getCartList()
  tableData.value = cartListStore.cartList
  initSelection()
  loading.value = false
}

const handleSelectionChange = async (selectedRows: CartItem[]) => {
  if (isInit.value) return
  // 先将所有行的 selected 设为 false
  tableData.value.forEach((row: CartItem) => {
    row.selected = false
  })
  let ids: string[] = []
  const ids2: string[] = []
  if (selectedRows.length === 0) {
    ids = tableData.value.map((row) => row.skuId) as string[]
    // console.log(ids, 'false')
    await updateCartSelectedApi(false, ids)
    return
  } else {
    ids = selectedRows.map((row) => row.skuId) as string[]
    cartListStore.cartList.forEach((row) => {
      if (!ids.includes(row.skuId || '')) {
        ids2.push(row.skuId || '')
      }
    })
    // console.log(ids, ids2, 'true')
    await updateCartSelectedApi(false, ids2)
    await updateCartSelectedApi(true, ids)
  }
  tableData.value.forEach((row: CartItem) => {
    if (ids.includes(row.skuId || '')) {
      row.selected = true
    }
  })
}

const countChange = async (row: CartItem) => {
  // console.log('countChange', row)
  if (row.skuId) {
    await updateCartGoodsCountApi(row.skuId, row.count as number)
  }
}

onMounted(async () => {
  await getCartList()
})

const removeGoods = async (row: CartItem) => {
  // console.log('removeGoods', row)
  if (row.skuId) {
    await deleteCartGoodsApi([row.skuId])
    getCartList()
    ElMessage.success('删除成功')
  } else {
    ElMessage.error('删除失败，请刷新页面重试')
  }
}

const toCheckout = () => {
  // console.log('toCheckout')
  if (tableData.value.some((data) => data.selected === true)) {
    router.push('/checkout')
  } else {
    ElMessage.error('请选择购物车中物品')
  }
}
</script>

<template>
  <div class="container" v-loading="loading">
    <div class="content" v-if="tableData.length">
      <el-table
        :data="tableData"
        style="width: 100%"
        :table-layout="`fixed`"
        :header-cell-style="{ 'text-align': 'center' }"
        :cell-style="{ 'text-align': 'center' }"
        ref="tableRef"
        row-key="skuId"
        @selection-change="handleSelectionChange"
        :size="'large'"
      >
        <el-table-column type="selection" color="#27ba9b" />
        <el-table-column label="商品信息" width="400px">
          <template #default="{ row }">
            <div class="info">
              <img :src="row.picture" alt="" />
              <p>{{ row.name }}</p>
            </div>
          </template>
        </el-table-column>
        <el-table-column property="price" label="单价" />
        <el-table-column label="数量">
          <template #default="{ row }">
            <div class="count">
              <el-input-number
                v-model="row.count"
                :min="1"
                :max="100"
                @change="countChange(row)"
              ></el-input-number>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="小计">
          <template #default="{ row }">
            <div class="price" style="color: #cf4444">
              <p>￥{{ (row.nowPrice * row.count).toFixed(2) }}</p>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <div class="operation">
              <el-button
                :icon="Delete"
                circle
                @click="removeGoods(row)"
                style="color: #27ba9b"
              ></el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="bottom">
        <div class="total">
          <p>共 {{ cartListStore.totalCount }} 件商品，</p>
          <p>已选 {{ cartListStore.totalCountSelected }} 件商品，商品合计：</p>
          <p style="color: #cf4444; font-size: 20px; font-weight: bold">
            ￥{{ cartListStore.totalPrice }}
          </p>
        </div>
        <div class="btn">
          <el-button @click="toCheckout" color="#27ba9b" style="color: #fff"
            >下单结算</el-button
          >
        </div>
      </div>
    </div>
    <div class="empty" v-else>
      <el-empty dw="60" :description="`购物车还没有商品，赶紧选购吧！`">
        <el-button
          @click="$router.push('/')"
          color="#27ba9b"
          style="color: #fff"
          >去逛逛</el-button
        >
      </el-empty>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  margin-top: 20px;
}

.info {
  display: flex;
  align-items: center;
  img {
    width: 80px;
    height: 80px;
    margin-right: 10px;
  }
  p {
    font-size: 14px;
    color: #333;
  }
}

.bottom {
  margin-top: 20px;
  height: 80px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  .total {
    display: flex;
    align-items: center;
  }
}
</style>
