import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue';
import Header from './layout/components/Header.vue';
import Sidebar from './layout/components/Sidebar.vue';
import FrontofficeSidebar from './layout/frontoffice/Sidebar.vue';
import { AuthService } from './services/AuthService';

import DashboardIndex from './pages/dashboard/Index.vue';
import { $api, type IPermission, type IRole, type PageResponse } from './services/api';
import UnauthorizedPage from './pages/unauthorized.vue';

const routes = [
  { path: '/my-tasks', name: 'MyTasks', components: { default: () => import('./pages/my-tasks/Index.vue'), Sidebar, Header }, meta: { requiresPermission: true } },
  { path: '/', name: 'Home', components: { default: Home, Sidebar, Header } },
  { path: '/unauthorized', name: 'Home', components: { default: UnauthorizedPage, Sidebar, Header } },
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
    meta: { requiresPermission: 'manage_users' },
    children: []
  },
  { path: '/users/new', name: 'UsersNew', components: { default: () => import('./pages/users/New.vue'), Sidebar, Header }, meta: { requiresPermission: 'manage_users' }},
  { path: '/users/:id/show', name: 'UsersShow', components: { default: () => import('./pages/users/Show.vue'), Sidebar, Header }, meta: { requiresPermission: 'view_users' }},
  { path: '/users/:id/edit', name: 'UsersEdit', components: { default: () => import('./pages/users/Edit.vue'), Sidebar, Header }, meta: { requiresPermission: 'manage_users' }},
  {
    path: '/roles',
    name: 'RolesIndex',
    components: { default: () => import('./pages/roles/Index.vue'), Sidebar, Header },
    meta: { requiresPermission: false },
    children: []
  },
  { path: '/roles/new', name: 'RolesNew', components: { default: () => import('./pages/roles/New.vue'), Sidebar, Header }, meta: { requiresPermission: 'manage_roles' }},
  {
    path: '/roles/:id/show',
    name: 'RolesShow',
    components: { default: () => import('./pages/roles/Show.vue'), Sidebar, Header },
    meta: { requiresPermission: false },
    children: [
      { path: 'add-permissions', name: 'AddRolesPermissions', component: () => import('./pages/roles/AddPermissionDialog.vue'), meta: { requiresPermission: false } },
    ]
  },
  { path: '/roles/:id/edit', name: 'RolesEdit', components: { default: () => import('./pages/roles/Edit.vue'), Sidebar, Header }, meta: { requiresPermission: false }},
  {
    path: '/permissions',
    name: 'PermissionsIndex',
    components: { default: () => import('./pages/permissions/Index.vue'), Sidebar, Header },
    meta: { requiresPermission: false },
    children: []
  },
  { path: '/permissions/new', name: 'PermissionsNew', components: { default: () => import('./pages/permissions/New.vue'), Sidebar, Header }, meta: { requiresPermission: 'manage_permissions' }},
  { path: '/permissions/:id/show', name: 'PermissionsShow', components: { default: () => import('./pages/permissions/Show.vue'), Sidebar, Header }, meta: { requiresPermission: 'view_permissions' }},
  { path: '/permissions/:id/edit', name: 'PermissionsEdit', components: { default: () => import('./pages/permissions/Edit.vue'), Sidebar, Header }, meta: { requiresPermission: 'manage_permissions' }},
  {
    path: '/frontoffice',
    name: 'Frontoffice',
    components: { default: () => import('./pages/frontoffice/Index.vue'), Sidebar: FrontofficeSidebar, Header },
    children: []
  },
  { path: '/frontoffice/my-tasks', name: 'FrontofficeMyTasks', components: { default: () => import('./pages/frontoffice/my-tasks/Index.vue'), Sidebar: FrontofficeSidebar, Header }},
  { path: '/frontoffice/dashboard', name: 'FrontofficeDashboard', components: { default: () => import('./pages/frontoffice/dashboard/Index.vue'), Sidebar: FrontofficeSidebar, Header }},
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  console.log(to.path)

  const authService = new AuthService();
  const accessInfo = authService.getAccessInfo();
  const requiresPermission = to.meta.requiresPermission;

  if (requiresPermission) {
    // Check if user has the required permission
    const user = accessInfo?.user;
    if (!user) {
      next('/login');
      return;
    }

    // Get all roles the user have,
    const userRoles = user.roles;
    
    // fetch roles with permissions from api
    const roles = await $api.roles.fetchRoles({ keys: userRoles }) as PageResponse<IRole> ;
    const permissions: IPermission[] = []
    roles.rows.forEach(role => {
      permissions.push(...role.permissions as IPermission[])
    });

    console.log({ permissions })
    const hasPermission = permissions.some(permission => permission.name == to.name);
    console.log({ hasPermission })

    if (!hasPermission) {
      next('/unauthorized'); // Or next('/login')
      return;
    }
  }

  next(); // Proceed if permission check passes
});

export default router
