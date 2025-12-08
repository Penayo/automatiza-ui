import type { APIData } from "./BaseService";
import type { IForm } from "./FormsService";
import { ModelApiService } from "./ModelAPI";

export interface Task extends APIData {
    id: string;
    taskDefinitionId: string;
    processInstanceId: string;
    processInfo: {
        name: string;
        version: number;
        correlationKey?: string;
        correlationLabel?: string;
    };
    name: string;
    type: string;
    status: string;
    variables: Record<string, any>;
    createdAt: Date;
    completedAt?: Date;
    candidateGroups: string[];
    candidateUsers: string[];
    dueDate?: Date;
    followUpDate?: Date;
    priority?: number;
    assignee?: string;
    assignedAt?: Date;
    claimedBy?: string;
    claimedAt?: Date;
    documentation?: string;
}

export interface CompleteTaskDto {
    variables?: Record<string, any>;
}

export interface UpdateTaskDto {
    dueDate?: Date;
    followUpDate?: Date;
    priority?: number;
}

export class TasksService extends ModelApiService {
    constructor() {
        super("bpmn/tasks");
    }

    async getAllTasks() {
        return this.get<Task[]>();
    }

    async findById(taskId: string): Promise<Task> {
        const task = await this.get<Task>(taskId);
        return task as Task;
    }

    async updateTask(taskId: string, data: UpdateTaskDto) {
        return this.put(taskId, data);
    }

    async completeTask(taskId: string, data: CompleteTaskDto) {
        try {
            return await this.post<Task[]>(`${taskId}/complete`, data);
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async assignTask(taskId: string) {
        const url = `${taskId}/assign`;
        try {
            const response = await this.post<Task>(url);
            return response;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async unassignTask(taskId: string) {
        const url = `${taskId}/unassign`;
        try {
            const response = await this.post(url);
            return response;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getUserTasks<T>(): Promise<T[]> {
        const url = `user`;
        try {
            const response = await this.get<T>(url);
            return response as T[];
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getTaskForm(taskId: string): Promise<IForm> {
        const url = `${taskId}/form`;
        try {
            const response = await this.get<IForm>(url);
            return response as IForm;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getGroupTasks(groupId: string) {
        const url = `group/${groupId}`;
        try {
            const response = await this.get(url);
            return response;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getAvailableTasks<T>(search?: string): Promise<T[]> {
        const url = `available`;

        try {
            const response = await this.get<T>(url, { params: { tsearch: search } });
            return response as T[];
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }
}