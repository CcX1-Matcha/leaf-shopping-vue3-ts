import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Layout/index.vue'),
      children: [
        { path: '', component: () => import('@/views/Home/index.vue') },
        {
          path: 'category/:id',
          component: () => import('@/views/Category/index.vue')
        },
        {
          path: 'category/sub/:subId',
          component: () => import('@/views/Sub/index.vue')
        },
        {
          path: 'detail/:id',
          component: () => import('@/views/Detail/index.vue')
        },
        {
          path: 'cart',
          component: () => import('@/views/Cart/index.vue')
        },
        {
          path: 'checkout',
          component: () => import('@/views/Checkout/index.vue')
        },
        {
          path: 'pay/:id',
          component: () => import('@/views/Pay/index.vue')
        },
        {
          path: 'pay/result',
          component: () => import('@/views/Pay/PayResult.vue')
        },
        {
          path: 'member',
          component: () => import('@/views/Member/index.vue'),
          children: [
            {
              path: '',
              component: () => import('@/views/Member/UserInfo.vue')
            },
            {
              path: 'order',
              component: () => import('@/views/Member/MyOrder.vue')
            }
          ]
        }
        // {
        //   path: 'search',
        //   component: () => import('@/views/Search/index.vue')
        // }
      ]
    },
    { path: '/login', component: () => import('@/views/Login/index.vue') },
    // 兜底路由：未匹配的地址统一跳回首页，避免出现空白页
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return {
        ...savedPosition,
        behavior: 'smooth'
      }
    }
    return {
      top: 0,
      behavior: 'smooth'
    }
  }
})

router.beforeEach((to, from, next) => {
  // console.log(to, 'to')
  if (
    [
      '/cart',
      '/checkout',
      '/pay',
      '/pay/result',
      '/member/order',
      '/member'
    ].includes(to.path) &&
    !useUserStore().userInfo?.token
  ) {
    next('/login')
  } else next()
})
export default router
