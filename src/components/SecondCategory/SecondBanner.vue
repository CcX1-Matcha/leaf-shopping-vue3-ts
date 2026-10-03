<script setup lang="ts">
import { getGoodsBannerApi } from '@/api/goods'
import { onMounted, ref } from 'vue'

interface Banner {
  hrefUrl: string
  id: string
  imgUrl: string
  type: string
}

const banner = ref<Banner[]>([])

onMounted(async () => {
  const res = await getGoodsBannerApi('2')
  banner.value = res.data.result
})
</script>

<template>
  <div class="home-banner">
    <el-carousel height="500px">
      <el-carousel-item v-for="item in banner" :key="item.id">
        <img :src="item.imgUrl" alt="" />
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<style scoped lang="scss">
.home-banner {
  width: 1240px;
  height: 500px;
  left: 0;
  top: 0;
  z-index: 98;

  img {
    width: 100%;
    height: 500px;
  }
}
</style>
