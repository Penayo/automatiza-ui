import { BaseService } from '@services/BaseService';
import type { TenantBranding } from '@/composables/useTenantBranding';

export interface TaskFormData {
    taskId:            string;
    processInstanceId: string;
    taskName:          string;
    processName:       string;
    documentation:     string | null;
    formSchema:        any | null;
    /** Process variables + resolved Form Variables — passed directly to form.importSchema() */
    formData:          Record<string, any>;
    /** Tenant branding, resolved from the task's tenant — this page has no JWT to resolve it from. */
    branding:          TenantBranding | null;
}

export class TaskPublicService extends BaseService {
    constructor() {
        super('task-form');
    }

    async getForm(token: string): Promise<TaskFormData> {
        return this.get<TaskFormData>(token) as Promise<TaskFormData>;
    }

    async save(token: string, variables: Record<string, any>): Promise<{ success: boolean }> {
        return this.put<{ success: boolean }>(`${token}/save`, { variables });
    }

    async complete(token: string, variables: Record<string, any>): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(`${token}/complete`, { variables }) as Promise<{ success: boolean }>;
    }
}

export const $taskPublic = new TaskPublicService();
