import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('./components/home/index') },
    { path: '/terms', component: () => import('./components/home/terms') },
    { path: '/privacy', component: () => import('./components/home/privacy') },
    { path: '/faq', component: () => import('./components/home/faq') },
    { path: '/free', component: () => import('./components/home/free') },
    {
      path: '/news', component: () => import('./components/home/news'),
      children: [
        { path: '/news/:id', component: () => import('./components/home/news'), }
      ]
    },
    {
      path: '/players', component: () => import('./components/home/players'),
      children: [
        { path: '/players/:version', component: () => import('./components/home/players'), },
      ]
    },
    { path: '/players/:version/:id', component: () => import('./components/home/player-detail'), },
    { path: '/comfort', component: () => import('./components/sell/coin') },
    { path: '/auction', component: () => import('./components/sell/player') },
    { path: '/auction-detail', component: () => import('./components/sell/player-detail') },
    { path: '/webapp', component: () => import('./components/sell/unlocked') },
    {
      path: '/me', component: () => import('./components/me/index'),
      children: [
        { path: 'myinfo', component: () => import('./components/me/indexsub/myinfo') },
        { path: 'record-comfort', component: () => import('./components/me/indexsub/record-coin') },
        { path: 'record-auction', component: () => import('./components/me/indexsub/record-player') },
        { path: 'withdraw', component: () => import('./components/me/indexsub/withdraw') },
        { path: 'accounts', component: () => import('./components/me/indexsub/accounts') },
        { path: 'free-coin', component: () => import('./components/me/indexsub/free-coin') },
        { path: 'free-coin-account', component: () => import('./components/me/indexsub/free-coin-account') },
        { path: 'free-coin-faq', component: () => import('./components/me/indexsub/free-coin-faq') },
      ]
    },
    { path: '/signin', component: () => import('./components/me/signin') },
    { path: '/signup', component: () => import('./components/me/signup') },
    { path: '/password', component: () => import('./components/me/password') },
  ]
})

// 让滚动条回到顶部
router.afterEach((to, from, next) => {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  window.scrollTo(0, 0);
});

export default router;