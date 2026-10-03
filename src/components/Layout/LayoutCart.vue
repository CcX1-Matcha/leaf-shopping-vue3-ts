<script setup lang="ts">
import { useCartListStore } from '@/stores'
import { deleteCartGoodsApi } from '@/api/cart'

const cartStore = useCartListStore()

cartStore.getCartList()

const deleteCartGoods = async (skuId: string) => {
  if (skuId) {
    await deleteCartGoodsApi([skuId])
    cartStore.getCartList()
  }
}
</script>

<template>
  <div class="cart">
    <el-popover
      :width="420"
      placement="bottom-end"
      transition="el-zoom-in-center"
    >
      <template #reference>
        <el-badge class="item" :value="cartStore.cartList.length">
          <el-icon style="font-size: 30px"><ShoppingCart /></el-icon>
        </el-badge>
      </template>
      <template #default>
        <div>
          <div class="cart-list" v-if="cartStore.cartList.length">
            <div class="content">
              <ul>
                <li v-for="i in cartStore.cartList.slice(0, 3)" :key="i.id">
                  <img :src="i.picture" alt="" />
                  <div class="center">
                    <p class="name ellipsis-2">
                      {{ i.name }}
                    </p>
                    <p class="attr ellipsis">{{ i.attrsText }}</p>
                  </div>
                  <div class="right">
                    <p class="price">￥{{ i.price }}</p>
                    <p class="count">x{{ i.count }}</p>
                  </div>
                  <i @click="deleteCartGoods(i.skuId || '')"
                    ><el-icon><Close /></el-icon
                  ></i>
                </li>
              </ul>
            </div>
            <div class="footer">
              <div class="total">
                <p class="dsc ellipsis-2">
                  共 {{ cartStore.totalCount }} 件商品
                </p>
                <p class="price ellipsis" style="color: #cf4444">
                  ￥ {{ cartStore.totalPrice }}
                </p>
              </div>
              <div class="btn">
                <el-button
                  style="background-color: #27ba9b; color: #fff"
                  size="large"
                  @click="$router.push('/cart')"
                  >去购物车结算</el-button
                >
              </div>
            </div>
          </div>
          <div class="empty" v-else>
            <p>购物车还没有商品，赶紧选购吧！</p>
          </div>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
.cart {
  margin-left: 5px;
}
.cart-list {
  .content {
    ul {
      li {
        display: flex;
        position: relative;
        align-items: center;
        border-bottom: 1px solid #f5f5f5;
        padding: 10px 0;
        img {
          height: 80px;
          width: 80px;
        }
        .center {
          padding: 0 10px;
          width: 200px;

          .name {
            font-size: 16px;
          }

          .attr {
            color: #999;
            padding-top: 5px;
          }
        }

        .right {
          width: 100px;
          padding-right: 20px;
          text-align: center;

          .price {
            font-size: 16px;
            color: $priceColor;
          }

          .count {
            color: #999;
            margin-top: 5px;
            font-size: 16px;
          }
        }
        i {
          position: absolute;
          opacity: 0;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: #999;
        }
        &:hover {
          i {
            opacity: 1;
          }
        }
      }
    }
  }
  .footer {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
  }
}
.empty {
  text-align: center;
}
</style>
