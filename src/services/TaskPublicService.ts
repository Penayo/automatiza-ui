import { BaseService } from '@services/BaseService';

export interface TaskFormData {
    taskId:        string;
    taskName:      string;
    processName:   string;
    documentation: string | null;
    formSchema:    any | null;
    /** Process variables + resolved Form Variables — passed directly to form.importSchema() */
    formData:      Record<string, any>;
}

export class TaskPublicService extends BaseService {
    constructor() {
        super('task-form');
    }

    async getForm(token: string): Promise<TaskFormData> {
        return this.get<TaskFormData>(token) as Promise<TaskFormData>;
    }

    async save(token: string, variables: Record<string, any>): Promise<{ success: boolean }> {
        return this.put(`${token}/save`, { variables }) as Promise<{ success: boolean }>;
    }

    async complete(token: string, variables: Record<string, any>): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(`${token}/complete`, { variables }) as Promise<{ success: boolean }>;
    }
}

export const $taskPublic = new TaskPublicService();
