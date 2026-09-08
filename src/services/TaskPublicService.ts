import { BaseService } from '@services/BaseService';
import type { TenantBranding } from '@/composables/useTenantBranding';
import type { FormChain } from '@services/FormChainService';

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
    /** True when this task is a step of a multi-step form (wizard). */
    multiStep?:        boolean;
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

    /**
     * `chainForms` tells the server this client can render a chained next step —
     * without it the response is unchanged and no next task is auto-claimed.
     * See docs/specs/multi-step-forms.spec.md §3.2.
     */
    async complete(
        token: string,
        variables: Record<string, any>,
        chainForms = false,
    ): Promise<{ success: boolean; chain?: FormChain }> {
        return this.post<{ success: boolean; chain?: FormChain }>(
            `${token}/complete`,
            { variables, chainForms },
        ) as Promise<{ success: boolean; chain?: FormChain }>;
    }
}

export const $taskPublic = new TaskPublicService();
