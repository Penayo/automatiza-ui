import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

/** JavaScript worker run by a Script Task set to "Job worker" (docs/specs/platform-job-workers.spec.md). */
export interface Worker {
    id:           string;
    type:         string;
    name:         string;
    description?: string;
    code:         string;
    version:      number;
    updatedBy?:   string;
    createdAt?:   string;
    updatedAt?:   string;
}

export interface SaveWorkerDto {
    type:         string;
    name:         string;
    description?: string;
    code:         string;
}

export interface WorkerTestResult {
    result?:    Record<string, any>;
    error?:     string;
    durationMs: number;
}

export class WorkersService extends ModelApiService {
    constructor() { super('workers'); }

    /** One page. `page` is what makes the backend return the envelope. */
    getPage(params: ListQuery & { page: number }): Promise<PageResponse<Worker>> {
        return this.get<PageResponse<Worker>>('', { params });
    }

    findById(id: string): Promise<Worker> {
        return this.get<Worker>(id);
    }

    create(dto: SaveWorkerDto): Promise<Worker> {
        return this.post<Worker>('', dto);
    }

    update(id: string, dto: SaveWorkerDto): Promise<Worker> {
        return this.put<Worker>(id, dto);
    }

    /** Runs `code` once against `variables` without saving it. */
    test(code: string, variables: Record<string, any>): Promise<WorkerTestResult> {
        return this.post<WorkerTestResult>('test', { code, variables });
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }
}
