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
}

export interface ProcessVariable {
    key: string;
    value: any;
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
    exceptions?: Array<{
        taskId: string;
        createdAt: Date;
        error: any;
    }>;
    indexKeys: string[];
    subscribedTo?: string[];
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

    async getInstanceTasks(instanceId: string): Promise<Task[]> {
        const url = `instances/${instanceId}/tasks`;
        const response = await this.get(url);

        return response as Task[] ;
    }

    async saveProcess(process: ProcessDefinition) {
        return this.post('', process);
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
}