import { createRouter, createWebHistory } from 'vue-router';
import ReportList from './components/ReportList.vue';
import ReportView from './components/ReportView.vue';
import ReportEdit from './components/ReportEdit.vue';
// We might need a wrapper or direct App.vue methods for data handling with routes
// For now, App.vue will still manage data, and routing will primarily control component visibility.

const routes = [
  {
    path: '/',
    alias: '/reports', // Keep '/' as an alias for the list
    name: 'ReportList',
    component: ReportList
    // Props will need to be passed from App.vue or state management
  },
  {
    path: '/report/new',
    name: 'ReportCreate',
    component: ReportEdit, // ReportEdit will be in 'create' mode
  },
  {
    path: '/report/:id',
    name: 'ReportView',
    component: ReportView,
    props: true // Allows route params to be passed as props
  },
  {
    path: '/report/:id/edit',
    name: 'ReportEdit',
    component: ReportEdit,
    props: true // Allows route params to be passed as props
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL || '/'), // Adjusted base URL
  routes
});

export default router;
