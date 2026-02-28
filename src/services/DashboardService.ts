import { BaseService } from './BaseService';

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
}

export const DashboardService = new DashboardApiService();
