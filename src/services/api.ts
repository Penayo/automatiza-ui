import { ProcessesService } from "@services/ProcessesService.ts";
import { VariablesService } from "@services/VariablesService";

export type { IVariable } from "@services/VariablesService";
export type { ProcessDefinition, ProcessInstance } from "@services/ProcessesService.ts";
export type { Task } from "@services/TasksService";
export type { IUser } from "@services/UserService.ts"
export type { IPerson } from "@services/PersonService.ts"
export type { IRole } from "@services/RoleService.ts"
export type { IPermission } from "@services/PermissionService.ts"
export type { ISecret } from "@services/SecretsService.ts"
export type { IApiKey, IApiKeyCreateResponse } from "@services/ApiKeyService.ts"

import { TasksService } from "@services/TasksService";
import { FormsService } from "@services/FormsService.ts";
import { AuthService } from "@services/AuthService.ts";
import { UserService } from "@services/UserService.ts";
import { PersonService } from "@services/PersonService.ts";
import { RoleService } from "@services/RoleService.ts";
import { PermissionService } from "@services/PermissionService.ts";
import { SecretsService } from "@services/SecretsService.ts";
import { ApiKeyService } from "@services/ApiKeyService.ts";
import { AuditService } from "@services/AuditService.ts";
import { MessagesService } from "@services/MessagesService";
import { DecisionsService } from "@services/DecisionsService";
import { FormVariablesService } from "@services/FormVariablesService";
import { ReportsService } from "@services/ReportsService";
import { EmailTemplatesService } from "@services/EmailTemplatesService";
import { FilesService } from "@services/FilesService";
import { RecoveryService } from "@services/RecoveryService";

export type PageRequest = {
	page?: number;
	rowsPerPage?: number;
}

export type PageResponse<T> = {
	totalRecords: number;
	rows: T[];
}

export const $api = {
	variables: new VariablesService(),
	processes: new ProcessesService(),
	tasks: new TasksService(),
	forms: new FormsService(),
	authService: new AuthService(),
	users: new UserService(),
	persons: new PersonService(),
	roles: new RoleService(),
	permissions: new PermissionService(),
	secrets: new SecretsService(),
	apiKeys: new ApiKeyService(),
	audit: new AuditService(),
	messages: new MessagesService(),
	decisions: new DecisionsService(),
	formVariables: new FormVariablesService(),
	reports: new ReportsService(),
	emailTemplates: new EmailTemplatesService(),
	files: new FilesService(),
	recovery: new RecoveryService(),
}
