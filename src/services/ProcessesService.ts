import type { APIData } from "@services/BaseService";
import type { IForm } from "@services/FormsService";
import { ModelApiService } from "@services/ModelAPI";
import axios from 'axios';
import type { Task } from "@services/TasksService";
import type { PageRequest, PageResponse } from "@services/api";

export type ProcessVariables = { [key: string]: string | number | null }

export interface ProcessDefinition extends APIData {
    id?: string
    processId: string;
    name: string;
    bpmnXml: string;
    subscriptions: any;
    process: any;
    createdAt: Date;
    description?: string;
    version?: number;
    starterGroups?: string[];
    starterUsers?: string[];
    responsibleContacts?: string[];
    /** M2M Bearer credential — never put this in a shareable URL. */
    webhookToken?: string;
    /** Credential for unlisted /start/:id?token=… links. */
    publicStartToken?: string;
    publiclyStartable?: boolean;
    hasStartForm?: boolean;
}

export interface UpdateProcessMetaDto {
    description?: string;
    responsibleContacts?: string[];
    starterGroups?: string[];
    starterUsers?: string[];
    publiclyStartable?: boolean;
}

export interface ProcessVariable {
    key: string;
    value: any;
}

export interface ProcessException {
    taskId: string;
    createdAt: Date;
    error: any;
}

export interface ProcessInstance extends APIData {
    id: string;
    processDefinition: ProcessDefinition,
    processDefinitionId: string;
    variables: ProcessVariable[];
    currentNode: any;
    parallelGateways: Record<string, any>;
    status: string;
    createdAt: Date;
    completedAt?: Date;
    exceptions?: ProcessException[];
    indexKeys: string[];
    subscribedTo?: string[];
    testMode?: boolean;
    testType?: 'auto-stub' | 'pause-and-fill';
    log?: Array<{
        date: Date;
        message: string;
        type: 'info' | 'error' | 'warning';
        level: number;
        variables?: Record<string, any>;
    }>;
}

export interface DeployProcessDto {
    bpmnXml: string;
}

export interface StartProcessDto {
    variables?: Record<string, any>;
    testMode?: boolean;
    testType?: 'auto-stub' | 'pause-and-fill';
}

export type ProcessInstanceQuery = PageRequest & {
    search?: string;
    processId?: string;
    status?: string;
    from?: string;
    to?: string;
};

export class ProcessesService extends ModelApiService {
    constructor() {
        super("bpmn/processes");
    }

    async getAllProcessDefinitions(): Promise<ProcessDefinition[]> {
        const data = await this.get<ProcessDefinition[]>() ;
        return data as ProcessDefinition[];
    }

    public async findById(processDefinitionId: string): Promise<ProcessDefinition> {
        try {
            const response = await this.get<ProcessDefinition>(processDefinitionId)
            return response as ProcessDefinition;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getAllProcessInstances(params: ProcessInstanceQuery): Promise<ProcessInstance[] | PageResponse<ProcessInstance>> {
        const url = `${params.processId}/instances`;
        const response = await this.get(url, { params });
        return response as ProcessInstance[];
    }

    async getAllInstances(params: ProcessInstanceQuery): Promise<PageResponse<ProcessInstance>> {
        const response = await this.get('instances', { params });
        return response as PageResponse<ProcessInstance>;
    }

    async getInstance(instanceId: string): Promise<ProcessInstance> {
        const url = `instances/${instanceId}`;
        try {
            const response = await this.get<ProcessInstance>(url);
            return response as ProcessInstance;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getInstanceTasks(instanceId: string, params: PageRequest = {}): Promise<PageResponse<Task>> {
        const url = `instances/${instanceId}/tasks`;
        const response = await this.get(url, { params });

        return response as PageResponse<Task>;
    }

    /** Unpaginated — only for the BPMN diagram overlay, which needs every node's status at once. */
    async getAllInstanceTasks(instanceId: string): Promise<Task[]> {
        const url = `instances/${instanceId}/tasks/all`;
        const response = await this.get(url);

        return response as Task[];
    }

    async getInstanceExceptions(instanceId: string, params: PageRequest = {}): Promise<PageResponse<ProcessException>> {
        const url = `instances/${instanceId}/exceptions`;
        const response = await this.get(url, { params });

        return response as PageResponse<ProcessException>;
    }

    async saveProcess(process: ProcessDefinition | DeployProcessDto) {
        return this.post('', { bpmnXml: process.bpmnXml });
    }

    async deployProcess(id: string) {
        const url = `deploy/${id}`;
        try {
            const response = await axios.post(url);
            return response.data;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async getStartForm(id: string): Promise<IForm> {
        const url = `${id}/start-form`;
        try {
            const response = await this.get<IForm>(url);
            return response as IForm;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    async startProcess(id: string, data: StartProcessDto) {
        const url = `${id}/start`;
        try {
            const response = await this.post(url, data);
            return response;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    /** Backend route is PATCH /bpmn/processes/:id — a PUT here 404s. */
    async updateProcessMeta(id: string, dto: UpdateProcessMetaDto): Promise<ProcessDefinition> {
        return await this.patch<ProcessDefinition>(id, dto);
    }

    /**
     * Rotates one of the two process credentials. They are independent: rotating the
     * M2M token never invalidates shared start links, and vice versa.
     */
    async regenerateToken(id: string, scope: 'webhook' | 'public' = 'webhook'):
        Promise<{ webhookToken?: string; publicStartToken?: string }> {
        const response = await this.post(`${id}/regenerate-token?scope=${scope}`);
        return response as { webhookToken?: string; publicStartToken?: string };
    }

    async pauseInstance(instanceId: string, comment: string): Promise<ProcessInstance> {
        const url = `instances/${instanceId}/pause`;
        const response = await this.post(url, {
            comment
        });

        return response as ProcessInstance ;
    }

    async resumeInstance(instanceId: string): Promise<ProcessInstance> {
        const url = `instances/${instanceId}/resume`;
        const response = await this.post(url);

        return response as ProcessInstance ;
    }

    async terminateInstance(instanceId: string): Promise<void> {
        await this.delete(`instances/${instanceId}`);
    }
}