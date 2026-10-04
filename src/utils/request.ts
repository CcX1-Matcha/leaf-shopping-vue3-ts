import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores'

const baseURL = import.meta.env.VITE_API_BASE || '/'

const instance = axios.create({
  baseURL,
  timeout: 30000
})

// 添加请求拦截器
instance.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什么
    const userStore = useUserStore()
    if (userStore.userInfo?.token) {
      config.headers.Authorization = `Bearer ${userStore.userInfo.token}`
    }
    return config
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 添加响应拦截器
instance.interceptors.response.use(
  function (res) {
    try {
      // 处理成功响应时，也可能有错误（比如res.data不存在）
      if (res.data?.code === '1') return res // 用可选链避免res.data不存在的问题
      ElMessage({
        message: res.data?.message || '服务异常',
        type: 'error'
      })
      return Promise.reject(res.data)
    } catch (error) {
      // 捕获成功处理逻辑中产生的错误
      ElMessage({ message: '响应处理异常', type: 'error' })
      return Promise.reject(error)
    }
  },
  function (err) {
    try {
      // 先判断err.response是否存在，避免访问不存在的属性
      const errorMsg = err.response?.data?.message || '服务异常'
      ElMessage({ message: errorMsg, type: 'error' })
      return Promise.reject(err)
    } catch (error) {
      // 捕获错误处理逻辑中产生的错误（比如ElMessage调用失败）
      ElMessage({ message: '错误处理异常', type: 'error' })
      return Promise.reject(error)
    }
  }
)

export default instance
