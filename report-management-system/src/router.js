import { createRouter, createWebHistory } from 'vue-router';
import ReportList from './components/ReportList.vue';
import ReportView from './components/ReportView.vue';
import ReportEdit from './components/ReportEdit.vue';
import UserLogin from './components/Login.vue'; // Corrected path from previous step if needed

const routes = [
  {
    path: '/login',
    name: 'UserLogin',
    component: UserLogin,
    meta: { requiresAuth: false } // Public route
  },
  {
    path: '/reports',
    name: 'ReportList',
    component: ReportList,
    meta: { requiresAuth: true } // Requires authentication
  },
  {
    path: '/', // Default path
    redirect: () => {
      // Redirect logic based on authentication
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuthenticated) {
        return '/reports';
      }
      return '/login';
    }
  },
  {
    path: '/report/new',
    name: 'ReportCreate',
    component: ReportEdit,
    meta: { requiresAuth: true }
  },
  {
    path: '/report/:id',
    name: 'ReportView',
    component: ReportView,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/report/:id/edit',
    name: 'ReportEdit',
    component: ReportEdit,
    props: true,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL || '/'),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  // Check if any matched route record has 'requiresAuth' meta field.
  // Some routes like the '/' redirect might not have a component and thus no direct meta field,
  // but the routes they redirect TO will be evaluated by the guard in the next navigation tick.
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to login
    next({ name: 'UserLogin' });
  } else if (to.name === 'UserLogin' && isAuthenticated) {
    // If user is authenticated and tries to access login page, redirect to report list
    next({ name: 'ReportList' });
  } else {
    // Otherwise, proceed as normal
    next();
  }
});

export default router;
