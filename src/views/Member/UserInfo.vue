<script setup lang="ts">
import { useUserStore } from '@/stores'
import { onMounted, ref } from 'vue'
import type { UserInfo } from '@/types/user'
import { getLikeGoodsListApi } from '@/api/goods'
import type { GoodsItem } from '@/types/goods'

import {
  updateAddressApi,
  deleteAddressApi,
  getAddressApi
} from '@/api/checkout'
import type { UserAddress } from '@/types/checkout'
import { Edit, Delete } from '@element-plus/icons-vue'
import type AddressInfo from '@/components/Checkout/AddressInfo.vue'

const addressList = ref<UserAddress[]>([])
const defaultAddress = ref<UserAddress>()

const isShowAddressInfo = ref(false)
const isSelectAddressId = ref<string>('')

const AddressInfoRef = ref<InstanceType<typeof AddressInfo>>()

const userStore = useUserStore()

const userInfo = ref<UserInfo>()
const goodsList = ref<GoodsItem[]>()

const getLikeGoodsList = async () => {
  const {
    data: { result }
  } = await getLikeGoodsListApi({ limit: 4 })
  // console.log(result)
  goodsList.value = result
}

const getAddress = async () => {
  const {
    data: { result }
  } = await getAddressApi()
  addressList.value = result
  defaultAddress.value = result.find(
    (address: UserAddress) => !address.isDefault
  )
  isSelectAddressId.value = defaultAddress.value?.id || ''
}

const submitUpdateAddress = async () => {
  const addressData = ref<UserAddress>()
  addressData.value = addressList.value.find(
    (address: UserAddress) => address.id === isSelectAddressId.value
  )
  if (addressData.value) {
    addressData.value.isDefault = 0
    console.log(addressData.value)
    await updateAddressApi(addressData.value)
    getAddress()
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
    getAddress()
    ElMessage.success('删除成功')
    isShowAddressInfo.value = false
  }
}

onMounted(async () => {
  if (userStore.userInfo) {
    userInfo.value = JSON.parse(JSON.stringify(userStore.userInfo))
    getLikeGoodsList()
    getAddress()
  }
})
</script>

<template>
  <div class="content">
    <div class="user-header">
      <div class="user-info">
        <img :src="userInfo?.avatar" alt="用户头像" class="avatar" />
        <span class="username">{{ userInfo?.nickname }}</span>
      </div>
      <div class="func-buttons">
        <div class="func-item">
          <i class="icon"
            ><el-icon><User /></el-icon
          ></i>
          <span>会员中心</span>
        </div>
        <div class="func-item">
          <i class="icon"
            ><el-icon><Setting /></el-icon
          ></i>
          <span>安全设置</span>
        </div>
        <div class="func-item" @click="isShowAddressInfo = true">
          <i class="icon"
            ><el-icon><AddLocation /></el-icon
          ></i>
          <span>地址管理</span>
        </div>
      </div>
    </div>
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
          <el-button type="primary" @click="AddressInfoRef?.open()">
            添加地址
          </el-button>
          <el-button @click="cancelUpdateAddress">取消</el-button>
          <el-button type="primary" @click="submitUpdateAddress">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
    <AddressInfo
      ref="AddressInfoRef"
      @getProductList="getAddress"
    ></AddressInfo>

    <!-- 猜你喜欢商品区 -->
    <div class="recommend-goods">
      <h2 class="recommend-title">猜你喜欢</h2>
      <div class="goods-list">
        <ul>
          <li v-for="item in goodsList" :key="item.id">
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
  </div>
</template>

<style scoped lang="scss">
.content {
  background-color: #fff;
  height: 600px;
  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 40px;
    background-image: url('@/assets/images/center-bg.png');

    .user-info {
      display: flex;
      align-items: center;

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin-right: 15px;
        object-fit: cover;
      }

      .username {
        color: #fff;
        font-size: 20px;
      }
    }

    .func-buttons {
      display: flex;
      gap: 20px;

      .func-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 30px;
        color: #fff;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }

        .icon {
          font-size: 24px;
        }

        span {
          font-size: 14px;
        }
      }
    }
  }

  // 猜你喜欢区域
  .recommend-goods {
    .recommend-title {
      font-size: 24px;
      padding-left: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }

    .goods-list {
      ul {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        li {
          width: 225px;
          height: 275px;
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
            width: 65%;
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
        background-color: $xtxColor;
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
</style>
