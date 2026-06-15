import { BaseService } from './BaseService';

export interface StuckTask {
    taskId: string;
    taskName: string;
    taskDefinitionId: string;
    processInstanceId: string;
    processName: string;
    childProcessInstanceId: string;
    childStatus: string;
    createdAt: string;
}

export interface RepairResult {
    processInstanceId: string;
    fixed: Array<{ taskId: string; taskName: string; action: string }>;
    skipped: Array<{ taskId: string; reason: string }>;
}

export interface RecoverAllResult {
    resumed: number;
    failed: number;
    details: Array<{ taskId: string; processInstanceId: string; success: boolean; reason?: string }>;
}

export class RecoveryService extends BaseService {
    constructor() {
        super('bpmn/admin/repair');
    }

    getStuckTasks(): Promise<StuckTask[]> {
        return this.get<StuckTask[]>('stuck-tasks') as Promise<StuckTask[]>;
    }

    recoverAll(): Promise<RecoverAllResult> {
        return this.post<RecoverAllResult>('stuck-tasks/all') as Promise<RecoverAllResult>;
    }

    repairProcessInstance(processInstanceId: string): Promise<RepairResult> {
        return this.post<RepairResult>(`process-instances/${processInstanceId}`) as Promise<RepairResult>;
    }
}
