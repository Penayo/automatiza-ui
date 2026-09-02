import { createRouter, createWebHistory, type RouteLocationGeneric } from 'vue-router'
import { AuthService } from '@services/AuthService';
import { $api, type IPermission, type IRole, type PageResponse } from '@services/api';

import FrontofficeLayout from '@layout/FrontofficeLayout.vue';
import AdminLayout from '@layout/AdminLayout.vue';

const routes = [
  // ─── No-layout routes ────────────────────────────────────────────────────
  { path: '/login',           name: 'Login',        component: () => import('./pages/Login.vue') },
  { path: '/signup',          name: 'Signup',        component: () => import('./pages/Signup.vue') },
  { path: '/unauthorized',    name: 'Unauthorized',  component: () => import('./pages/unauthorized.vue') },
  { path: '/task-form/:token', name: 'PublicTaskForm', component: () => import('./pages/TaskFormPage.vue') },
  { path: '/start/:processId',  name: 'ProcessStartForm', component: () => import('./pages/StartFormPage.vue') },

  // ─── Frontoffice (end-user clean URLs) ───────────────────────────────────
  {
    path: '/',
    component: FrontofficeLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'FrontofficeDashboard', component: () => import('./pages/frontoffice/dashboard/Index.vue') },
      { path: 'my-tasks', name: 'FrontofficeMyTasks', component: () => import('./pages/frontoffice/my-tasks/Index.vue') },
      {
        path: 'tasks/:taskId',
        name: 'TaskForm',
        component: () => import('./pages/frontoffice/my-tasks/_id.vue'),
      },
      { path: 'processes', name: 'FrontofficeProcesses', component: () => import('./pages/frontoffice/processes/Index.vue') },
      { path: 'processes/:id', name: 'FrontofficeProcessDetail', component: () => import('./pages/frontoffice/processes/_id.vue') },
      { path: 'documents', name: 'FrontofficeDocuments', component: () => import('./pages/frontoffice/documents/Index.vue') },
      { path: 'data/:datasourceKey', name: 'FrontofficeDataBrowse', component: () => import('./pages/data/Browse.vue') },
      { path: 'data/:datasourceKey/new', name: 'FrontofficeDataNew', component: () => import('./pages/data/New.vue') },
      { path: 'data/:datasourceKey/:id', name: 'FrontofficeDataDetail', component: () => import('./pages/data/Detail.vue') },
      { path: 'profile', name: 'FrontofficeProfile', component: () => import('./pages/frontoffice/profile/Index.vue') },
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
      {
        // Tabs are routes: /admin/processes/:id/{spec,info,instances,diagram,stats}, spec by default.
        // Each tab component is code-split and only loads when its tab is opened.
        path: 'processes/:id',
        component: () => import('./pages/admin/processes/EditProcess.vue'),
        children: [
          { path: '', name: 'ProcessEdit', redirect: (to: RouteLocationGeneric) => ({ name: 'ProcessEditSpec', params: to.params }) },
          { path: 'spec', name: 'ProcessEditSpec', component: () => import('./pages/admin/processes/tabs/SpecTab.vue') },
          { path: 'info', name: 'ProcessEditInfo', component: () => import('./pages/admin/processes/tabs/InfoTab.vue') },
          {
            path: 'instances',
            name: 'ProcessEditInstances',
            component: () => import('./pages/admin/processes/tabs/InstancesTab.vue'),
            children: [
              { path: ':instanceId', name: 'ProcessEditInstanceDetail', component: () => import('./pages/admin/process-instances/Detail.vue') },
            ],
          },
          { path: 'diagram', name: 'ProcessEditDiagram', component: () => import('./pages/admin/processes/tabs/DiagramTab.vue') },
          { path: 'stats', name: 'ProcessEditStats', component: () => import('./pages/admin/processes/tabs/StatsTab.vue') },
        ],
      },

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
      { path: 'forms',                    name: 'FormsList',        component: () => import('./pages/admin/forms/FormsIndex.vue') },
      { path: 'forms/new',                name: 'FormsNew',         component: () => import('./pages/admin/forms/Index.vue') },
      { path: 'forms/:id/edit',           name: 'FormsEdit',        component: () => import('./pages/admin/forms/Index.vue') },
      { path: 'forms/jsonschema/new',     name: 'JsonSchemaNew',    component: () => import('./pages/admin/forms/JsonSchemaFormEditor.vue') },
      { path: 'forms/jsonschema/:id/edit',name: 'JsonSchemaEdit',   component: () => import('./pages/admin/forms/JsonSchemaFormEditor.vue') },
      { path: 'formbuilder', redirect: { name: 'FormsList' } },

      // Decisions (DMN)
      { path: 'decisions',        name: 'DecisionsList',   component: () => import('./pages/admin/decisions/Index.vue') },
      { path: 'decisions/new',    name: 'DecisionNew',     component: () => import('./pages/admin/decisions/Modeler.vue') },
      { path: 'decisions/:id',    name: 'DecisionEdit',    component: () => import('./pages/admin/decisions/Modeler.vue') },

      // Form Variables
      { path: 'form-variables',   name: 'FormVariablesIndex', component: () => import('./pages/admin/form-variables/Index.vue') },

      // Datasources
      { path: 'datasources',      name: 'DatasourcesIndex', component: () => import('./pages/admin/datasources/Index.vue') },

      // Reports
      { path: 'reports',          name: 'ReportsList', component: () => import('./pages/admin/reports/Index.vue') },
      { path: 'reports/new',      name: 'ReportNew',   component: () => import('./pages/admin/reports/Designer.vue') },
      { path: 'reports/:id',      name: 'ReportEdit',  component: () => import('./pages/admin/reports/Designer.vue') },

      // Documents
      { path: 'documents', name: 'DocumentsList', component: () => import('./pages/admin/documents/Index.vue') },

      // Data (browse datasources)
      { path: 'data/:datasourceKey', name: 'AdminDataBrowse', component: () => import('./pages/data/Browse.vue') },
      { path: 'data/:datasourceKey/new', name: 'AdminDataNew', component: () => import('./pages/data/New.vue') },
      { path: 'data/:datasourceKey/:id', name: 'AdminDataDetail', component: () => import('./pages/data/Detail.vue') },

      // Email Templates
      { path: 'email-templates',       name: 'EmailTemplatesList', component: () => import('./pages/admin/email-templates/Index.vue') },
      { path: 'email-templates/new',   name: 'EmailTemplateNew',   component: () => import('./pages/admin/email-templates/Designer.vue') },
      { path: 'email-templates/:id',   name: 'EmailTemplateEdit',  component: () => import('./pages/admin/email-templates/Designer.vue') },

      // Profile (self-service — available in the admin layout too)
      { path: 'profile', name: 'AdminProfile', component: () => import('./pages/frontoffice/profile/Index.vue') },

      // System
      { path: 'audit',    name: 'AuditLogs', component: () => import('./pages/admin/audit/Index.vue') },
      { path: 'audit/reports/user-activity', name: 'AuditUserActivity', component: () => import('./pages/admin/audit/reports/UserActivity.vue') },
      { path: 'audit/reports/task-timing',   name: 'AuditTaskTiming',   component: () => import('./pages/admin/audit/reports/TaskTiming.vue') },
      { path: 'messages', name: 'AdminMessages', component: () => import('./pages/admin/messages/Index.vue') },
      { path: 'recovery', name: 'ProcessRecovery', component: () => import('./pages/admin/recovery/Index.vue') },

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

      // API Mocks
      { path: 'api-mocks', name: 'ApiMocksIndex', component: () => import('./pages/admin/api-mocks/Index.vue') },

      // Test Inbox
      { path: 'test-inbox', name: 'TestInbox', component: () => import('./pages/admin/test-inbox/Index.vue') },

      // API Keys
      { path: 'api-keys', name: 'ApiKeysIndex', component: () => import('./pages/admin/api-keys/Index.vue') },
      { path: 'api-keys/new', name: 'ApiKeysNew', component: () => import('./pages/admin/api-keys/New.vue') },
      { path: 'api-keys/:id/edit', name: 'ApiKeysEdit', component: () => import('./pages/admin/api-keys/Edit.vue') },

      // Tenants (SUPER_ADMIN only)
      { path: 'tenants',     name: 'TenantsList', component: () => import('./pages/admin/tenants/Index.vue') },
      { path: 'tenants/:id', name: 'TenantEdit',  component: () => import('./pages/admin/tenants/_id.vue') },

      // Documentation
      { path: 'docs/:page?', name: 'DocsPage', component: () => import('./pages/admin/docs/Index.vue') },
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
  // Any route under /admin requires ADMIN or SUPER_ADMIN role.
  if (to.path.startsWith('/admin')) {
    const user = accessInfo?.user;
    if (!user) {
      next('/login');
      return;
    }
    const canAccessAdmin = Array.isArray(user.roles) &&
      (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN'));
    if (!canAccessAdmin) {
      next('/my-tasks');
      return;
    }
  }

  // ── Layer 2: Fine-grained permission guard ──────────────────────────────────
  // SUPER_ADMIN bypasses all permission checks.
  const requiresPermission = to.meta.requiresPermission;
  if (requiresPermission) {
    const user = accessInfo?.user;
    if (!user) {
      next('/login');
      return;
    }

    if (!user.roles?.includes('SUPER_ADMIN')) {
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
  }

  next();
});

export default router
