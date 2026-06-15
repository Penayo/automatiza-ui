import type { APIData } from "@services/BaseService";
import type { IForm } from "@services/FormsService";
import { ModelApiService } from "@services/ModelAPI";

export interface TaskFormResponse {
    formSchema: IForm | null;
    formData:   Record<string, any>;
}

export interface TaskVariable {
    key: string;
    value: any;
}

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
    variables: TaskVariable[];
    inputVariables: TaskVariable[];
    createdAt: Date;
    completedAt?: Date;
    assignment?: {
        candidateGroups?: string[];
        candidateUsers?: string[];
        dueDate?: Date;
        followUpDate?: Date;
        priority?: number;
        assignee?: string;
        assignedAt?: Date;
        claimedBy?: string;
        claimedAt?: Date;
    };
    documentation?: string;
    shareLink?: {
        token:      string;
        usedAt?:    string;
        expiresAt?: string;
    };
    serviceConfig?: Record<string, any>;
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

    async getTaskForm(taskId: string): Promise<TaskFormResponse> {
        const url = `${taskId}/form`;
        try {
            return await this.get<TaskFormResponse>(url) as TaskFormResponse;
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

    // ── Task recovery (admin) ────────────────────────────────────────────────

    /**
     * Merge key/value pairs into the task variables AND the owning process
     * instance variables. Returns the updated maps for both.
     */
    async updateVariables(
        taskId: string,
        variables: Record<string, any>,
    ): Promise<{ taskVariables: Record<string, any>; processVariables: Record<string, any> }> {
        try {
            const response = await this.put(taskId + '/variables', { variables });
            return (response as any)?.data ?? response as any;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    /**
     * Re-execute a FAILED automated task.
     * Resets status and reruns the execution strategy server-side.
     */
    async deleteTask(taskId: string): Promise<{ status: string }> {
        try {
            await this.delete(taskId);
            return { status: 'deleted' };
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async updateServiceConfig(
        taskId: string,
        serviceConfig: Record<string, any>,
    ): Promise<Record<string, any>> {
        try {
            const response = await this.put(taskId + '/service-config', { serviceConfig });
            return (response as any)?.data ?? response as any;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async retryTask(taskId: string, variables?: Record<string, any>): Promise<{ status: string; message: string }> {
        try {
            const response = await this.post<{ status: string; message: string }>(
                `${taskId}/retry`,
                variables ? { variables } : {},
            );
            return response as { status: string; message: string };
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async replayFromTask(taskId: string, variables?: Record<string, any>): Promise<{ status: string; message: string }> {
        try {
            const response = await this.post<{ status: string; message: string }>(
                `${taskId}/replay`,
                variables ? { variables } : {},
            );
            return response as { status: string; message: string };
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }
}