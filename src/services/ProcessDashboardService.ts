import { BaseService } from '@services/BaseService';

export interface InstancesOverTime {
  date: string;
  count: number;
}

export interface CompletionRate {
  processName: string;
  total: number;
  completed: number;
  failed: number;
  completionRate: number;
}

export interface ProcessDuration {
  avgMs: number;
  minMs: number;
  maxMs: number;
  totalCompleted: number;
}

export interface Bottleneck {
  taskName: string;
  taskDefinitionId: string;
  avgMs: number;
  count: number;
}

export interface ActiveInstances {
  processName: string;
  count: number;
}

export interface FailureRate {
  processName: string;
  total: number;
  failed: number;
  failureRate: number;
}

export interface HeatmapCell {
  processName: string;
  taskName: string;
  count: number;
}

export interface ProcessDefinitionOption {
  id: string;
  name: string;
}

export interface ProcessAnalytics {
  instancesOverTime: InstancesOverTime[];
  completionRate: CompletionRate[];
  avgProcessDuration: ProcessDuration;
  bottleneckAnalysis: Bottleneck[];
  activeInstances: ActiveInstances[];
  failureRateByDefinition: FailureRate[];
  instanceFlowHeatmap: HeatmapCell[];
}

export type Period = 'day' | 'week' | 'month';

class ProcessDashboardApiService extends BaseService {
  constructor() {
    super('dashboard');
  }

  async getProcessDefinitions(): Promise<ProcessDefinitionOption[]> {
    return this.get<ProcessDefinitionOption[]>('process-definitions') as Promise<ProcessDefinitionOption[]>;
  }

  async getProcessAnalytics(
    period: Period = 'week',
    processDefinitionId?: string,
  ): Promise<ProcessAnalytics> {
    const params: Record<string, string> = { period };
    if (processDefinitionId) params.processDefinitionId = processDefinitionId;
    return this.get<ProcessAnalytics>('process-analytics', { params }) as Promise<ProcessAnalytics>;
  }
}

export const ProcessDashboardService = new ProcessDashboardApiService();
