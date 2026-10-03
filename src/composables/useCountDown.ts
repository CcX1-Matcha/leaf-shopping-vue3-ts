// 封装倒计时逻辑函数（TypeScript 版本）
import { computed, onUnmounted, ref, type ComputedRef } from 'vue'
import dayjs from 'dayjs'

// 定义返回值类型接口（可选，用于明确返回结构）
interface CountDownResult {
  formatTime: ComputedRef<string>
  start: (currentTime: number) => void
}

export const useCountDown = (): CountDownResult => {
  // 1. 响应式数据（指定类型：number | null，定时器ID为number类型）
  let timer: number | null = null
  // 时间（秒数），初始值为0，明确为number类型的ref
  const time = ref<number>(0)

  // 2. 格式化时间：转换为 "xx分xx秒" 格式（明确计算属性返回string类型）
  const formatTime: ComputedRef<string> = computed(() => {
    // 处理时间为0的边界情况
    if (time.value <= 0) {
      return '00分00秒'
    }
    return dayjs.unix(time.value).format('mm分ss秒')
  })

  // 3. 开启倒计时的函数（参数currentTime为秒数，类型为number）
  const start = (currentTime: number): void => {
    // 入参校验：确保currentTime是有效的正数
    if (typeof currentTime !== 'number' || currentTime < 0) {
      console.warn('倒计时初始时间必须是正数')
      return
    }
    // 清除已有定时器（防止重复设置）
    if (timer) {
      clearInterval(timer)
    }
    // 设置初始时间
    time.value = currentTime
    // 启动定时器（返回值为number类型的定时器ID）
    timer = window.setInterval(() => {
      time.value--
      // 时间到0时清除定时器
      if (time.value <= 0) {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      }
    }, 1000)
  }

  // 4. 组件销毁时清除定时器（防止内存泄漏）
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  // 返回类型严格匹配CountDownResult接口
  return {
    formatTime,
    start
  }
}
