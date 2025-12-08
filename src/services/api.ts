import { ProcessesService } from "./ProcessesService.ts";
import { VariablesService } from "./VariablesService";

export type { IVariable } from "./VariablesService";
export type { ProcessDefinition, ProcessInstance } from "./ProcessesService.ts";
export type { Task } from "./TasksService";
import { TasksService } from "./TasksService";
import { FormsService } from "./FormsService.ts";
import { AuthService } from "./AuthService.ts";

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
	authService: new AuthService()
}

