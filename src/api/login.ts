import request from '@/utils/request'
import type { LoginForm } from '@/types/login'

export const loginApi = (loginForm: LoginForm) => {
  return request.post('/login', {
    account: loginForm.username,
    password: loginForm.password
  })
}
