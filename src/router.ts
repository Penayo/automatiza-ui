import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue';
import Header from './layout/components/Header.vue';
import Sidebar from './layout/components/Sidebar.vue';

import DashboardIndex from './pages/dashboard/Index.vue';

const routes = [
  { path: '/my-tasks', name: 'MyTasks', components: { default: () => import('./pages/my-tasks/Index.vue'), Sidebar, Header } },
  { path: '/', name: 'Home', components: { default: Home, Sidebar, Header } },
  { path: '/login', name: 'Login', component: () => import('./pages/Login.vue') },
  { path: '/dashboard', name: 'Dashboard', components: { default: DashboardIndex, Sidebar, Header } },

  // BPMN Engine routes
  {
    path: '/processes',
    name: 'ProcessesIndex',
    components: { default: () => import('./pages/processes/Index.vue'), Sidebar, Header },
    children: [
      { path: 'new', name: 'ProcessNew', component: () => import('./pages/processes/New.vue') },
      { path: ':id/start', name: 'ProcessStart', component: () => import('./pages/processes/Start.vue') },
    ]
  },
  {
    path: '/processes/:id',
    name: 'ProcessEdit',
    components: { default: () => import('./pages/processes/EditProcess.vue'), Sidebar, Header },
  },
  {
    path: '/process-instances',
    name: 'ProcessInstancesIndex',
    components: { default: () => import('./pages/process-instances/Index.vue'), Sidebar, Header },
    children: [
      { path: ':id', name: 'ProcessInstanceDetail', component: () => import('./pages/process-instances/Detail.vue') },
    ]
  },  
  {
    path: '/tasks',
    name: 'TasksIndex',
    components: { default: () => import('./pages/tasks/Index.vue'), Sidebar, Header },
    children: [
      { path: ':id/complete', name: 'TaskComplete', component: () => import('./pages/tasks/Complete.vue') },
    ]
  },
  { path: '/modeler', name: 'CamundaModeler', components: { default: () => import('./pages/modeler/Index.vue'), Sidebar, Header }},
  { path: '/formbuilder', name: 'FormsBuilder', components: { default: () => import('./pages/forms/Index.vue'), Sidebar, Header }}
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
