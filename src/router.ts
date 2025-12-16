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
  { path: '/formbuilder', name: 'FormsBuilder', components: { default: () => import('./pages/forms/Index.vue'), Sidebar, Header }},
  {
    path: '/users',
    name: 'UsersIndex',
    components: { default: () => import('./pages/users/Index.vue'), Sidebar, Header },
    children: []
  },
  { path: '/users/new', name: 'UsersNew', components: { default: () => import('./pages/users/New.vue'), Sidebar, Header }},
  { path: '/users/:id/show', name: 'UsersShow', components: { default: () => import('./pages/users/Show.vue'), Sidebar, Header }},
  { path: '/users/:id/edit', name: 'UsersEdit', components: { default: () => import('./pages/users/Edit.vue'), Sidebar, Header }},
  {
    path: '/roles',
    name: 'RolesIndex',
    components: { default: () => import('./pages/roles/Index.vue'), Sidebar, Header },
    children: []
  },
  { path: '/roles/new', name: 'RolesNew', components: { default: () => import('./pages/roles/New.vue'), Sidebar, Header }},
  { path: '/roles/:id/show', name: 'RolesShow', components: { default: () => import('./pages/roles/Show.vue'), Sidebar, Header }},
  { path: '/roles/:id/edit', name: 'RolesEdit', components: { default: () => import('./pages/roles/Edit.vue'), Sidebar, Header }},
  {
    path: '/permissions',
    name: 'PermissionsIndex',
    components: { default: () => import('./pages/permissions/Index.vue'), Sidebar, Header },
    children: []
  },
  { path: '/permissions/new', name: 'PermissionsNew', components: { default: () => import('./pages/permissions/New.vue'), Sidebar, Header }},
  { path: '/permissions/:id/show', name: 'PermissionsShow', components: { default: () => import('./pages/permissions/Show.vue'), Sidebar, Header }},
  { path: '/permissions/:id/edit', name: 'PermissionsEdit', components: { default: () => import('./pages/permissions/Edit.vue'), Sidebar, Header }},
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
