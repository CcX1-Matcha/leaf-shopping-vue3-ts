<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import { useMouseInElement } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { getGoodsDetailAPI } from '@/api/goods'
import type { Result } from '@/types/goodDetail'
import type GoodsItemSku from '@/components/Detail/GoodsItemSku.vue'
import { addCartApi } from '@/api/cart'
import { useUserStore } from '@/stores'
import router from '@/router'
import { useCartListStore } from '@/stores'

const loading = ref(false)

const goodsDetail = ref<Result | null>(null)
const route = useRoute()

const imageList = ref<string[]>([])

const init = async () => {
  const id = route.params.id as string
  loading.value = true
  try {
    const {
      data: { result }
    } = await getGoodsDetailAPI(id)
    // console.log(result)
    goodsDetail.value = result || null
  } catch (error) {
    console.log(error)
  }
  goodsDetail.value?.specs.forEach((item) => {
    item.values.forEach((val) => {
      if (val) {
        val.selected = false
        val.disabled = false
      }
    })
  })
  imageList.value = goodsDetail.value?.mainPictures || []
  console.log(goodsDetail.value, 'initGoodsDetail')
  loading.value = false
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

// 图片切换
const targetIndex = ref(0)

const mouseEnterFn = (i: number) => {
  targetIndex.value = i
}

// 放大镜效果
const middleRef = ref<HTMLDivElement>()
const { elementX, elementY, isOutside } = useMouseInElement(middleRef)

const left = ref(0)
const top = ref(0)

const positionX = ref(0)
const positionY = ref(0)

watch([elementX, elementY, isOutside], () => {
  if (isOutside.value) return

  if (elementX.value > 100 && elementX.value < 300) {
    left.value = elementX.value - 100
  }
  if (elementY.value > 100 && elementY.value < 300) {
    top.value = elementY.value - 100
  }

  if (elementX.value > 300) {
    left.value = 200
  }
  if (elementY.value > 300) {
    top.value = 200
  }
  if (elementX.value < 100) {
    left.value = 0
  }
  if (elementY.value < 100) {
    top.value = 0
  }

  // 控制放大镜大图的移动
  positionX.value = -left.value * 2
  positionY.value = -top.value * 2
})

const goodsNum = ref<number>(1)

const skuRef = ref<InstanceType<typeof GoodsItemSku>>()

const addCart = async () => {
  if (skuRef.value?.skuCode) {
    if (useUserStore().userInfo?.token) {
      await addCartApi(skuRef.value.skuCode, goodsNum.value)
      goodsDetail.value?.specs.forEach((item) => {
        item.values.forEach((val) => {
          val.selected = false
        })
      })
      skuRef.value.skuCode = ''
      goodsNum.value = 1
      ElMessage.success('加入购物车成功')
      useCartListStore().getCartList()
    } else {
      ElMessageBox.confirm('请先登录', {
        confirmButtonText: '马上去登录',
        cancelButtonText: '再逛逛',
        type: 'warning'
      })
        .then(() => {
          router.push('/login')
        })
        .catch(() => {})
    }
  } else {
    ElMessage.error('请选择商品规格')
  }
}
</script>

<template>
  <div v-loading="loading">
    <div class="breadcrumb">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item
          :to="{ path: `/category/${goodsDetail?.categories[1]?.id}` }"
          >{{ goodsDetail?.categories[1]?.name }}</el-breadcrumb-item
        >
        <el-breadcrumb-item
          :to="{ path: `/category/sub/${goodsDetail?.categories[0]?.id}` }"
          >{{ goodsDetail?.categories[0]?.name }}</el-breadcrumb-item
        >
        <el-breadcrumb-item>{{ goodsDetail?.name }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="goods-info">
      <div class="media">
        <!-- 图片预览区 -->
        <div class="goods-image">
          <!-- 左侧大图-->
          <div class="middle" ref="middleRef">
            <img :src="imageList[targetIndex]" alt="" />
            <!-- 蒙层小滑块 -->
            <div
              class="layer"
              v-show="!isOutside"
              :style="{ left: `${left}px`, top: `${top}px` }"
            ></div>
          </div>
          <!-- 小图列表 -->
          <ul class="small" ref="ulRef">
            <li
              v-for="(img, i) in imageList"
              :key="i"
              @mouseenter="mouseEnterFn(i)"
              :class="{ active: i === targetIndex }"
            >
              <img :src="img" alt="" />
            </li>
          </ul>
          <!-- 放大镜大图 -->
          <div
            class="large"
            :style="[
              {
                backgroundImage: `url(${imageList[targetIndex]})`,
                backgroundPositionX: `${positionX}px`,
                backgroundPositionY: `${positionY}px`
              }
            ]"
            v-show="!isOutside"
          ></div>
        </div>
        <!-- 统计数量 -->
        <ul class="goods-sales">
          <li>
            <p class="title">销量人气</p>
            <p class="count">{{ goodsDetail?.salesCount }}+</p>
            <p>
              <a href="javascript:;"
                ><i class="iconfont icon-task-filling"
                  ><el-icon><Flag /></el-icon></i
                >销量人气</a
              >
            </p>
          </li>
          <li>
            <p class="title">商品评价</p>
            <p class="count">{{ goodsDetail?.commentCount }}+</p>
            <p>
              <a href="javascript:;"
                ><i class="iconfont icon-task-filling"
                  ><el-icon><Comment /></el-icon></i
                >查看评价</a
              >
            </p>
          </li>
          <li>
            <p class="title">收藏人气</p>
            <p class="count">{{ goodsDetail?.collectCount }}+</p>
            <p>
              <a href="javascript:;"
                ><i class="iconfont icon-task-filling"
                  ><el-icon><Star /></el-icon></i
                >收藏商品</a
              >
            </p>
          </li>
          <li>
            <p class="title">品牌信息</p>
            <p class="count">{{ goodsDetail?.brand.name }}</p>
            <p>
              <a href="javascript:;"
                ><i class="iconfont icon-task-filling"
                  ><el-icon><HelpFilled /></el-icon></i
                >品牌主页</a
              >
            </p>
          </li>
        </ul>
      </div>
      <div class="spec">
        <!-- 商品信息区 -->
        <p class="g-name">{{ goodsDetail?.name }}</p>
        <p class="g-desc">{{ goodsDetail?.desc }}</p>
        <p class="g-price">
          <span>￥{{ goodsDetail?.price }}</span>
          <span>￥{{ goodsDetail?.oldPrice }}</span>
        </p>
        <div class="g-service">
          <dl>
            <dt>促销</dt>
            <dd>12月好物放送，App领券购买直降120元</dd>
          </dl>
          <dl>
            <dt>服务</dt>
            <dd>
              <span>无忧退货</span>
              <span>快速退款</span>
              <span>免费包邮</span>
              <a href="javascript:;">了解详情</a>
            </dd>
          </dl>
        </div>
        <!-- sku组件 -->
        <GoodsItemSku
          :specs="goodsDetail?.specs || []"
          :skus="goodsDetail?.skus || []"
          ref="skuRef"
        ></GoodsItemSku>
        <!-- 数据组件 -->
        <el-input-number
          v-model="goodsNum"
          :min="1"
          :max="10"
          style="margin-bottom: 20px"
        />
        <!-- 按钮组件 -->
        <div>
          <el-button size="large" class="btn" @click="addCart">
            加入购物车
          </el-button>
        </div>
      </div>
    </div>
    <div class="goods-footer">
      <!-- 商品详情 -->
      <div class="goods-tabs">
        <nav>
          <a>商品详情</a>
        </nav>
        <div class="goods-detail">
          <!-- 属性 -->
          <ul class="attrs">
            <li
              v-for="item in goodsDetail?.details.properties"
              :key="item.value"
            >
              <span class="dt">{{ item.name }}</span>
              <span class="dd">{{ item.value }}</span>
            </li>
          </ul>
          <!-- 图片 -->
          <img
            v-for="img in goodsDetail?.details.pictures || []"
            :src="img"
            :key="img"
            alt=""
          />
        </div>
      </div>
      <!-- 24热榜+专题推荐 -->
      <div class="goods-aside">
        <HotList :id="goodsDetail?.id" type="1"></HotList>
        <HotList :id="goodsDetail?.id" type="2"></HotList>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.breadcrumb {
  margin: 20px 0;
}
.goods-info {
  min-height: 600px;
  background: #fff;
  display: flex;

  .media {
    width: 580px;
    height: 600px;
    padding: 30px 50px;
    .goods-image {
      width: 480px;
      height: 400px;
      position: relative;
      display: flex;

      .middle {
        width: 400px;
        height: 400px;
        background: #f5f5f5;
      }

      .large {
        position: absolute;
        top: 0;
        left: 412px;
        width: 400px;
        height: 400px;
        z-index: 500;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        background-repeat: no-repeat;
        // 背景图:盒子的大小 = 2:1  将来控制背景图的移动来实现放大的效果查看 background-position
        background-size: 800px 800px;
        background-color: #f8f8f8;
      }

      .layer {
        width: 200px;
        height: 200px;
        background: rgba(0, 0, 0, 0.2);
        // 绝对定位 然后跟随咱们鼠标控制left和top属性就可以让滑块移动起来
        left: 0;
        top: 0;
        position: absolute;
      }

      .small {
        width: 80px;

        li {
          width: 68px;
          height: 68px;
          margin-left: 12px;
          margin-bottom: 15px;
          cursor: pointer;

          &:hover,
          &.active {
            border: 2px solid $xtxColor;
          }
        }
      }
    }

    .goods-sales {
      display: flex;
      width: 90%;
      justify-content: space-around;
      margin-top: 30px;
      li {
        position: relative;
        padding: 0 10px;
        p {
          font-size: 14px;
          margin-bottom: 10px;
          text-align: center;
          a {
            &:hover {
              color: $xtxColor;
            }
          }
        }
        .title {
          color: rgb(180, 180, 180);
          font-weight: lighter;
        }
        .count {
          color: $priceColor;
        }
        .iconfont {
          color: $xtxColor;
        }
      }
      li:not(:last-child)::after {
        content: '';
        position: absolute;
        right: 0; /* 靠右对齐 */
        top: 20%; /* 距离顶部 20%，垂直居中偏上 */
        height: 60%; /* 高度为元素的 60%，避免顶满 */
        width: 1px; /* 分割线宽度 */
        background-color: #eee; /* 浅灰色 */
      }
    }
  }

  .spec {
    flex: 1;
    padding: 30px 30px 30px 0;
    .g-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .g-desc {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }

    .g-price {
      span {
        &:first-child {
          color: $priceColor;
          font-size: 18px;
        }

        &:last-child {
          text-decoration: line-through;
          color: #999;
          margin-left: 5px;
        }
      }
    }

    .g-service {
      margin-top: 10px;
      font-size: 14px;
      background-color: #f5f5f5;

      dl {
        display: flex;
        padding: 12px 20px;
        dt {
          font-weight: lighter;
          margin-right: 10px;
        }

        dd {
          span {
            display: inline-block;
            margin-right: 8px;
          }

          a {
            color: $xtxColor;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }
}
.goods-footer {
  display: flex;
  margin-top: 20px;

  .goods-aside {
    margin-left: 30px;
    width: 280px;
    min-height: 1000px;
  }
  .goods-tabs {
    min-height: 600px;
    background: #fff;
    width: 80%;
    nav {
      height: 70px;
      line-height: 70px;
      display: flex;
      border-bottom: 1px solid #f5f5f5;

      a {
        padding: 0 40px;
        font-size: 18px;
        position: relative;

        > span {
          color: $priceColor;
          font-size: 16px;
          margin-left: 10px;
        }
      }
    }
  }

  .goods-detail {
    padding: 40px;

    .attrs {
      display: flex;
      flex-wrap: wrap;
      margin-bottom: 30px;

      li {
        display: flex;
        margin-bottom: 10px;
        width: 50%;

        .dt {
          width: 100px;
          color: #999;
        }

        .dd {
          flex: 1;
          color: #666;
        }
      }
    }

    > img {
      width: 100%;
    }
  }
}
</style>
