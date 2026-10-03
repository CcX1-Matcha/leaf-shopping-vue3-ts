import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserInfo } from '@/types/user'

export const useUserStore = defineStore(
  'use-shopping-token',
  () => {
    const userInfo = ref<UserInfo | null>(null)
    const setUserInfo = (info: UserInfo) => {
      userInfo.value = info
    }
    return {
      userInfo,
      setUserInfo
    }
  },
  {
    persist: {
      pick: ['userInfo']
    }
  }
)
