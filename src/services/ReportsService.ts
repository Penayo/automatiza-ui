import axios from 'axios';
import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

export interface ReportDefinition {
    id:           string;
    key:          string;
    name:         string;
    description?: string;
    template:     Record<string, any>;
    createdAt?:   string;
    updatedAt?:   string;
}

export interface SaveReportDto {
    key:          string;
    name:         string;
    description?: string;
    template:     Record<string, any>;
}

export class ReportsService extends ModelApiService {
    constructor() { super('reports'); }

    /** Full list. */
    getAll(): Promise<ReportDefinition[]> {
        return this.get<ReportDefinition[]>() as Promise<ReportDefinition[]>;
    }

    /** One page. `page` is what makes the backend return the envelope. */
    getPage(params: ListQuery & { page: number }): Promise<PageResponse<ReportDefinition>> {
        return this.get<PageResponse<ReportDefinition>>('', { params });
    }

    findById(id: string): Promise<ReportDefinition> {
        return this.get<ReportDefinition>(id) as Promise<ReportDefinition>;
    }

    create(dto: SaveReportDto): Promise<ReportDefinition> {
        return this.post<ReportDefinition>('', dto) as Promise<ReportDefinition>;
    }

    /** Backend route is PATCH /reports/:id — a PUT here 404s. */
    update(id: string, dto: SaveReportDto): Promise<ReportDefinition> {
        return this.patch<ReportDefinition>(id, dto);
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }

    /**
     * POST /reports/:id/generate → stream PDF back as a Blob URL.
     * inputs: array with one entry per rendered page.
     */
    async generateBlob(id: string, inputs: Record<string, any>[]): Promise<string> {
        const response = await axios.post(
            this.getUrl(`${id}/generate`),
            { inputs },
            {
                headers:      { ...this.getAuthorizationHeader() },
                responseType: 'blob',
            },
        );
        const blob = new Blob([response.data], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
    }
}
