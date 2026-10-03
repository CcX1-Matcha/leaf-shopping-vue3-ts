<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getProvinceApi, getCityApi, getAreaApi } from '@/api/district'

interface ProvinceData {
  id: number
  proId: string
  proName: string
}
interface CityData {
  id: number
  cityId: string
  cityName: string
  proId: string
}
interface areaData {
  areaId: string
  areaName: string
  cityId: string
  id: number
}

const props = defineProps({
  provinceCode: {
    type: String,
    default: ''
  },
  cityCode: {
    type: String,
    default: ''
  },
  areaCode: {
    type: String,
    default: ''
  }
})

const provinceList = ref<ProvinceData[]>([])
const cityList = ref<CityData[]>([])
const areaList = ref<areaData[]>([])

const emit = defineEmits([
  'update:provinceCode',
  'update:cityCode',
  'update:areaCode'
])
const provinceCodeProxy = computed({
  get: () => props.provinceCode,
  set: (newValue) => {
    emit('update:provinceCode', newValue)
  }
})
const cityCodeProxy = computed({
  get: () => props.cityCode,
  set: (newValue) => {
    emit('update:cityCode', newValue)
  }
})
const areaCodeProxy = computed({
  get: () => props.areaCode,
  set: (newValue) => {
    emit('update:areaCode', newValue)
  }
})

onMounted(async () => {
  const {
    data: { list }
  } = await getProvinceApi()
  provinceList.value = list
  if (props.provinceCode) {
    await provinceChange(props.provinceCode)
  }
})

const provinceChange = async (value: string) => {
  cityList.value = []
  areaList.value = []
  cityCodeProxy.value = ''
  areaCodeProxy.value = ''
  const {
    data: { list }
  } = await getCityApi(value)
  cityList.value = list
  if (props.cityCode) {
    await cityChange(props.cityCode)
    cityCodeProxy.value = props.cityCode
  }
  // console.log(cityList.value)
}

const cityChange = async (value: string) => {
  areaList.value = []
  areaCodeProxy.value = ''
  const {
    data: { list }
  } = await getAreaApi(value)
  areaList.value = list
  if (props.areaCode) {
    areaCodeProxy.value = props.areaCode
  }
}
watch(
  () => props.provinceCode,
  (newVal) => {
    if (newVal) {
      emit('update:cityCode', '') // 清空城市
      emit('update:areaCode', '') // 清空区县
      provinceChange(newVal)
    }
  }
)

watch(
  () => props.cityCode,
  (newVal) => {
    if (newVal) {
      emit('update:areaCode', '') // 清空区县
      cityChange(newVal)
    }
  }
)
</script>

<template>
  <div class="district-selector">
    <div class="province">
      <el-select v-model="provinceCodeProxy" placeholder="请选择省份">
        <el-option
          v-for="item in provinceList"
          :key="item.id"
          :label="item.proName"
          :value="item.proId"
        ></el-option>
      </el-select>
    </div>
    <div class="city">
      <el-select
        v-model="cityCodeProxy"
        placeholder="请选择城市"
        :disabled="!cityList.length"
      >
        <el-option
          v-for="item in cityList"
          :key="item.id"
          :label="item.cityName"
          :value="item.cityId"
        ></el-option>
      </el-select>
    </div>
    <div class="area">
      <el-select
        v-model="areaCodeProxy"
        placeholder="请选择地区"
        :disabled="!areaList.length"
      >
        <el-option
          v-for="item in areaList"
          :key="item.id"
          :label="item.areaName"
          :value="item.areaId"
        ></el-option>
      </el-select>
    </div>
  </div>
</template>

<style scoped lang="scss">
.district-selector {
  display: flex;
  gap: 10px;
  .province {
    width: 150px;
  }
  .city {
    width: 150px;
  }
  .area {
    width: 150px;
  }
}
</style>
