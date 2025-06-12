// report-management-system/src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import ReportList from './components/ReportList.vue';
import ReportView from './components/ReportView.vue';
import ReportEdit from './components/ReportEdit.vue';
import UserLogin from './components/Login.vue';       // Corrected to actual filename: Login.vue
import UserList from './components/UserList.vue';   // Import UserList
import UserForm from './components/UserForm.vue';   // Import UserForm

const routes = [
  // Authentication Route
  {
    path: '/login',
    name: 'UserLogin', // Name used by navigation guards
    component: UserLogin,
    meta: { requiresAuth: false }
  },
  // Report Management Routes (for authenticated users)
  {
    path: '/reports',
    name: 'ReportList',
    component: ReportList,
    meta: { requiresAuth: true }
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
  },
  // User Management Routes (Administrators Only)
  {
    path: '/admin/users',
    name: 'UserList',
    component: UserList,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/user/new',
    name: 'UserCreate',
    component: UserForm,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/user/:id/edit',
    name: 'UserEdit',
    component: UserForm,
    props: true,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  // Default path redirection
  {
    path: '/',
    redirect: () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuthenticated) {
        return '/reports';
      }
      return '/login';
    }
  },
  // Catch-all for unmatched routes
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuthenticated) {
        return '/reports';
      }
      return '/login';
    }
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL || '/'),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  let currentUser = null;
  if (isAuthenticated) { // Only try to parse if authenticated, to avoid error if currentUser is not set
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user for router guard:', e);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        // This effectively makes isAuthenticated false for the guard's purpose if data is corrupt
        // Force re-login if critical data is corrupted
        if (requiresAuth || requiresAdmin) {
            next({ name: 'UserLogin' });
            return;
        }
      }
    } else if (requiresAdmin) {
        // If admin is required but no currentUser info, treat as auth failure for admin level
        console.warn('Admin route accessed without currentUser info in localStorage.');
        next({ name: 'UserLogin' }); // Force re-login
        return;
    }
  }

  if ((requiresAuth || requiresAdmin) && !isAuthenticated) {
    next({ name: 'UserLogin' });
  } else if (requiresAdmin && (!currentUser || currentUser.role !== 'administrator')) {
    console.warn('Access denied: Route requires admin privileges.');
    if (isAuthenticated) { // Authenticated but not admin
        next({ name: 'ReportList' }); // Redirect to a safe, general page
    } else { // Should have been caught by the previous check, but as a fallback
        next({ name: 'UserLogin' });
    }
  } else if (to.name === 'UserLogin' && isAuthenticated) {
    next({ name: 'ReportList' });
  } else {
    next();
  }
});

export default router;
