import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../store/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'dashboard') {
    const { state } = useAuth()
    if (!state.isAuthorized) {
      state.showPinModal = true
      return { name: 'home' }
    }
  }
})

export default router
