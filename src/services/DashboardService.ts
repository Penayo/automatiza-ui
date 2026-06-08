import { BaseService } from '@services/BaseService';

export interface TasksByStatus {
  status: string;
  count: number;
}

export interface CompletedOverTime {
  date: string;
  count: number;
}

export interface AvgCompletionTime {
  avgMs: number;
  minMs: number;
  maxMs: number;
  totalCompleted: number;
}

export interface DateAlerts {
  overdue: number;
  dueSoon: number;
  followUpPending: number;
  followUpSoon: number;
}

export interface TasksDashboard {
  tasksByStatus: TasksByStatus[];
  completedOverTime: CompletedOverTime[];
  avgCompletionTime: AvgCompletionTime;
  dateAlerts: DateAlerts;
}

export type Period = 'day' | 'week' | 'month';

export interface ProcessAnalytics {
  instancesOverTime:       { count: number; date: string }[];
  completionRate:          { total: number; completed: number; failed: number; processName: string; completionRate: number }[];
  avgProcessDuration:      { minMs: number; maxMs: number; totalCompleted: number; avgMs: number };
  bottleneckAnalysis:      { count: number; taskDefinitionId: string; taskName: string; avgMs: number }[];
  activeInstances:         { id: string; status: string; createdAt: string }[];
  failureRateByDefinition: { total: number; failed: number; processName: string; failureRate: number }[];
  instanceFlowHeatmap:     { count: number; processName: string; taskName: string }[];
}

class DashboardApiService extends BaseService {
  constructor() {
    super('dashboard');
  }

  async getProcessNames(): Promise<string[]> {
    return this.get<string[]>('processes') as Promise<string[]>;
  }

  async getTasksDashboard(
    period: Period = 'week',
    claimedBy?: string,
    processName?: string,
  ): Promise<TasksDashboard> {
    const params: Record<string, string> = { period };
    if (claimedBy) params.claimedBy = claimedBy;
    if (processName) params.process = processName;
    return this.get<TasksDashboard>('tasks', { params }) as Promise<TasksDashboard>;
  }

  async getFailedInstancesCount(): Promise<number> {
    const res = await this.get<{ count: number }>('alerts/failed-instances') as { count: number };
    return res.count;
  }

  /** Personal KPIs for the logged-in user — calls the frontoffice-accessible endpoint */
  async getMyStats(period: Period = 'week'): Promise<TasksDashboard> {
    return this.get<TasksDashboard>('my-stats', { params: { period } }) as Promise<TasksDashboard>;
  }

  /** Admin: per-process analytics — calls GET /dashboard/process-analytics */
  async getProcessAnalytics(processId: string, period: Period = 'week'): Promise<ProcessAnalytics> {
    return this.get<ProcessAnalytics>('process-analytics', {
      params: { processId, period },
    }) as Promise<ProcessAnalytics>;
  }
}

export const DashboardService = new DashboardApiService();
