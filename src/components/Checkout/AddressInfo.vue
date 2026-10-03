<script setup lang="ts">
import { ref } from 'vue'
import { addAddressApi, updateAddressApi } from '@/api/checkout'
import type { UserAddress } from '@/types/checkout'
import type { FormInstance } from 'element-plus'

const emit = defineEmits(['getProductList'])

const isShowAddAddressInfo = ref(false)
const addressInfo = ref<UserAddress>({
  receiver: '',
  contact: '',
  address: '',
  provinceCode: '',
  cityCode: '',
  countyCode: '',
  isDefault: 0,
  fullLocation: '',
  postalCode: '',
  addressTags: ''
})
const isEdit = ref(false)

const addressFormRef = ref<FormInstance>()

const validateAddress = (rule: any, value: any, callback: any) => {
  if (
    !addressInfo.value.provinceCode ||
    !addressInfo.value.cityCode ||
    !addressInfo.value.countyCode
  ) {
    callback(new Error('请选择完整的省市区'))
  } else {
    callback()
  }
}

const addressRules = {
  receiver: [
    { required: true, message: '请输入收货人', trigger: 'blur' },
    { min: 1, max: 10, message: '长度在 1 到 10 个字符', trigger: 'blur' }
  ],
  contact: [
    { required: true, message: '请输入联系方式', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  selectAddress: [{ validator: validateAddress, trigger: 'change' }]
}

const submitAddAddress = async () => {
  await addressFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      // console.log(addressInfo.value)
      await addAddressApi(addressInfo.value)
      emit('getProductList')
      ElMessage.success('添加成功')
      isShowAddAddressInfo.value = false
    }
  })
}

const submitUpdateAddress = async () => {
  await addressFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      // console.log(addressInfo.value)
      await updateAddressApi(addressInfo.value)
      emit('getProductList')
      ElMessage.success('修改成功')
      isShowAddAddressInfo.value = false
    }
  })
}

const open = (address?: UserAddress) => {
  if (!address) {
    addressInfo.value = {
      receiver: '',
      contact: '',
      address: '',
      provinceCode: '',
      cityCode: '',
      countyCode: '',
      isDefault: 0,
      fullLocation: '',
      postalCode: '',
      addressTags: ''
    }
    isEdit.value = false
  } else {
    // console.log(address)
    addressInfo.value = JSON.parse(JSON.stringify(address))
    isEdit.value = true
  }
  isShowAddAddressInfo.value = true
}

const close = () => {
  isShowAddAddressInfo.value = false
  addressInfo.value = {
    receiver: '',
    contact: '',
    address: '',
    provinceCode: '',
    cityCode: '',
    countyCode: '',
    isDefault: 0,
    fullLocation: '',
    postalCode: '',
    addressTags: ''
  }
}

defineExpose({
  open
})
</script>

<template>
  <div class="">
    <el-dialog
      v-model="isShowAddAddressInfo"
      :title="isEdit ? '修改地址' : '添加地址'"
      width="700"
    >
      <div class="add-address">
        <el-form
          ref="addressFormRef"
          :model="addressInfo"
          label-width="80px"
          :rules="addressRules"
        >
          <el-form-item label="姓名" prop="receiver" style="max-width: 300px">
            <el-input v-model="addressInfo.receiver" />
          </el-form-item>
          <el-form-item label="电话" prop="contact" style="max-width: 300px">
            <el-input v-model="addressInfo.contact" />
          </el-form-item>
          <el-form-item label="地址" prop="selectAddress">
            <DistrictSelector
              v-model:provinceCode="addressInfo.provinceCode"
              v-model:cityCode="addressInfo.cityCode"
              v-model:areaCode="addressInfo.countyCode"
            ></DistrictSelector>
          </el-form-item>
          <el-form-item
            label="详细地址"
            prop="address"
            style="max-width: 300px"
          >
            <el-input v-model="addressInfo.address" />
          </el-form-item>
          <el-form-item label="默认地址">
            <el-radio-group v-model="addressInfo.isDefault">
              <el-radio :label="0">是</el-radio>
              <el-radio :label="1">否</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer" v-if="isEdit">
          <el-button @click="close">取消</el-button>
          <el-button type="primary" @click="submitUpdateAddress">
            修改
          </el-button>
        </div>
        <div class="dialog-footer" v-else>
          <el-button @click="close">取消</el-button>
          <el-button type="primary" @click="submitAddAddress"> 确认 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped></style>
