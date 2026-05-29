import { createRouter, createWebHistory } from 'vue-router'
import { AuthService } from '@services/AuthService';
import { $api, type IPermission, type IRole, type PageResponse } from '@services/api';

import FrontofficeLayout from '@layout/FrontofficeLayout.vue';
import AdminLayout from '@layout/AdminLayout.vue';

const routes = [
  // ─── No-layout routes ────────────────────────────────────────────────────
  { path: '/login',           name: 'Login',        component: () => import('./pages/Login.vue') },
  { path: '/unauthorized',    name: 'Unauthorized',  component: () => import('./pages/unauthorized.vue') },
  { path: '/task-form/:token', name: 'PublicTaskForm', component: () => import('./pages/TaskFormPage.vue') },

  // ─── Frontoffice (end-user clean URLs) ───────────────────────────────────
  {
    path: '/',
    component: FrontofficeLayout,
    children: [
      { path: '', name: 'Home', component: () => import('./pages/Home.vue') },
      { path: 'dashboard', name: 'FrontofficeDashboard', component: () => import('./pages/frontoffice/dashboard/Index.vue') },
      { path: 'my-tasks', name: 'FrontofficeMyTasks', component: () => import('./pages/frontoffice/my-tasks/Index.vue') },
      {
        path: 'tasks/:taskId',
        name: 'TaskForm',
        component: () => import('./pages/frontoffice/my-tasks/_id.vue'),
      },
      { path: 'processes', name: 'FrontofficeProcesses', component: () => import('./pages/frontoffice/processes/Index.vue') },
      { path: 'processes/:id', name: 'FrontofficeProcessDetail', component: () => import('./pages/frontoffice/processes/_id.vue') },
    ],
  },

  // ─── Admin (/admin prefix) ───────────────────────────────────────────────
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      // Dashboards
      { path: 'dashboard', name: 'TaskDashboard', component: () => import('./pages/admin/dashboard/Index.vue') },
      { path: 'process-dashboard', name: 'ProcessDashboard', component: () => import('./pages/admin/process-dashboard/Index.vue') },

      // Processes
      {
        path: 'processes',
        name: 'ProcessesIndex',
        component: () => import('./pages/admin/processes/Index.vue'),
        children: [
          { path: 'new', name: 'ProcessNew', component: () => import('./pages/admin/processes/New.vue') },
          { path: ':id/start', name: 'ProcessStart', component: () => import('./pages/admin/processes/Start.vue') },
        ],
      },
      { path: 'processes/:id', name: 'ProcessEdit', component: () => import('./pages/admin/processes/EditProcess.vue') },

      // Process Instances
      {
        path: 'process-instances',
        name: 'ProcessInstancesIndex',
        component: () => import('./pages/admin/process-instances/Index.vue'),
        children: [
          { path: ':id', name: 'ProcessInstanceDetail', component: () => import('./pages/admin/process-instances/Detail.vue') },
        ],
      },

      // Tasks
      {
        path: 'tasks',
        name: 'TasksIndex',
        component: () => import('./pages/admin/tasks/Index.vue'),
        children: [],
      },

      // Design
      { path: 'modeler',     name: 'CamundaModeler', component: () => import('./pages/admin/modeler/Index.vue') },
      { path: 'formbuilder', name: 'FormsBuilder',   component: () => import('./pages/admin/forms/Index.vue') },

      // Decisions (DMN)
      { path: 'decisions',        name: 'DecisionsList',   component: () => import('./pages/admin/decisions/Index.vue') },
      { path: 'decisions/new',    name: 'DecisionNew',     component: () => import('./pages/admin/decisions/Modeler.vue') },
      { path: 'decisions/:id',    name: 'DecisionEdit',    component: () => import('./pages/admin/decisions/Modeler.vue') },

      // Form Variables
      { path: 'form-variables',   name: 'FormVariablesIndex', component: () => import('./pages/admin/form-variables/Index.vue') },

      // Reports
      { path: 'reports',          name: 'ReportsList', component: () => import('./pages/admin/reports/Index.vue') },
      { path: 'reports/new',      name: 'ReportNew',   component: () => import('./pages/admin/reports/Designer.vue') },
      { path: 'reports/:id',      name: 'ReportEdit',  component: () => import('./pages/admin/reports/Designer.vue') },

      // Email Templates
      { path: 'email-templates',       name: 'EmailTemplatesList', component: () => import('./pages/admin/email-templates/Index.vue') },
      { path: 'email-templates/new',   name: 'EmailTemplateNew',   component: () => import('./pages/admin/email-templates/Designer.vue') },
      { path: 'email-templates/:id',   name: 'EmailTemplateEdit',  component: () => import('./pages/admin/email-templates/Designer.vue') },

      // System
      { path: 'audit',    name: 'AuditLogs', component: () => import('./pages/admin/audit/Index.vue') },
      { path: 'messages', name: 'AdminMessages', component: () => import('./pages/admin/messages/Index.vue') },

      // Users
      { path: 'users', name: 'UsersIndex', component: () => import('./pages/admin/users/Index.vue'), meta: { requiresPermission: 'manage_users' } },
      { path: 'users/new', name: 'UsersNew', component: () => import('./pages/admin/users/New.vue'), meta: { requiresPermission: 'manage_users' } },
      { path: 'users/:id/show', name: 'UsersShow', component: () => import('./pages/admin/users/Show.vue'), meta: { requiresPermission: 'view_users' } },
      { path: 'users/:id/edit', name: 'UsersEdit', component: () => import('./pages/admin/users/Edit.vue'), meta: { requiresPermission: 'manage_users' } },

      // Roles
      { path: 'roles', name: 'RolesIndex', component: () => import('./pages/admin/roles/Index.vue') },
      { path: 'roles/new', name: 'RolesNew', component: () => import('./pages/admin/roles/New.vue'), meta: { requiresPermission: 'manage_roles' } },
      {
        path: 'roles/:id/show',
        name: 'RolesShow',
        component: () => import('./pages/admin/roles/Show.vue'),
        children: [
          { path: 'add-permissions', name: 'AddRolesPermissions', component: () => import('./pages/admin/roles/AddPermissionDialog.vue') },
        ],
      },
      { path: 'roles/:id/edit', name: 'RolesEdit', component: () => import('./pages/admin/roles/Edit.vue') },

      // Permissions
      { path: 'permissions', name: 'PermissionsIndex', component: () => import('./pages/admin/permissions/Index.vue') },
      { path: 'permissions/new', name: 'PermissionsNew', component: () => import('./pages/admin/permissions/New.vue'), meta: { requiresPermission: 'manage_permissions' } },
      { path: 'permissions/:id/show', name: 'PermissionsShow', component: () => import('./pages/admin/permissions/Show.vue'), meta: { requiresPermission: 'view_permissions' } },
      { path: 'permissions/:id/edit', name: 'PermissionsEdit', component: () => import('./pages/admin/permissions/Edit.vue'), meta: { requiresPermission: 'manage_permissions' } },

      // Secrets
      { path: 'secrets', name: 'SecretsIndex', component: () => import('./pages/admin/secrets/Index.vue'), meta: { requiresPermission: 'manage_secrets' } },
      { path: 'secrets/new', name: 'SecretsNew', component: () => import('./pages/admin/secrets/New.vue'), meta: { requiresPermission: 'manage_secrets' } },
      { path: 'secrets/:key/edit', name: 'SecretsEdit', component: () => import('./pages/admin/secrets/Edit.vue'), meta: { requiresPermission: 'manage_secrets' } },

      // API Keys
      { path: 'api-keys', name: 'ApiKeysIndex', component: () => import('./pages/admin/api-keys/Index.vue') },
      { path: 'api-keys/new', name: 'ApiKeysNew', component: () => import('./pages/admin/api-keys/New.vue') },
      { path: 'api-keys/:id/edit', name: 'ApiKeysEdit', component: () => import('./pages/admin/api-keys/Edit.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authService = new AuthService();
  const accessInfo = authService.getAccessInfo();

  // ── Layer 1: Admin route guard ──────────────────────────────────────────────
  // Any route under /admin requires the ADMIN role.
  // Non-admin authenticated users are redirected to their task list.
  if (to.path.startsWith('/admin')) {
    const user = accessInfo?.user;
    if (!user) {
      next('/login');
      return;
    }
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');
    if (!isAdmin) {
      next('/my-tasks');
      return;
    }
  }

  // ── Layer 2: Fine-grained permission guard ──────────────────────────────────
  const requiresPermission = to.meta.requiresPermission;
  if (requiresPermission) {
    const user = accessInfo?.user;
    if (!user) {
      next('/login');
      return;
    }

    const userRoles = user.roles;
    const roles = await $api.roles.fetchRoles({ keys: userRoles }) as PageResponse<IRole>;
    const permissions: IPermission[] = [];
    roles.rows.forEach(role => {
      permissions.push(...role.permissions as IPermission[]);
    });

    const hasPermission = permissions.some(permission => permission.name == to.name);
    if (!hasPermission) {
      next('/unauthorized');
      return;
    }
  }

  next();
});

export default router
