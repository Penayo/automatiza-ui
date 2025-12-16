import { ProcessesService } from "./ProcessesService.ts";
import { VariablesService } from "./VariablesService";

export type { IVariable } from "./VariablesService";
export type { ProcessDefinition, ProcessInstance } from "./ProcessesService.ts";
export type { Task } from "./TasksService";
export type { IUser } from "./UserService.ts"
export type { IPerson } from "./PersonService.ts"
export type { IRole } from "./RoleService.ts"
export type { IPermission } from "./PermissionService.ts"

import { TasksService } from "./TasksService";
import { FormsService } from "./FormsService.ts";
import { AuthService } from "./AuthService.ts";
import { UserService } from "./UserService.ts";
import { PersonService } from "./PersonService.ts";
import { RoleService } from "./RoleService.ts";
import { PermissionService } from "./PermissionService.ts";

export type PageRequest = {
	page: number;
	rowsPerPage: number;
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
}
