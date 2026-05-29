import axios from 'axios';
import { ModelApiService } from '@services/ModelAPI';

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

    getAll(): Promise<ReportDefinition[]> {
        return this.get<ReportDefinition[]>() as Promise<ReportDefinition[]>;
    }

    findById(id: string): Promise<ReportDefinition> {
        return this.get<ReportDefinition>(id) as Promise<ReportDefinition>;
    }

    create(dto: SaveReportDto): Promise<ReportDefinition> {
        return this.post<ReportDefinition>('', dto) as Promise<ReportDefinition>;
    }

    async update(id: string, dto: SaveReportDto): Promise<ReportDefinition> {
        const response = await this.put(id, dto);
        return (response as any)?.data ?? response as ReportDefinition;
    }

    remove(id: string): Promise<void> {
        return this.delete(id) as Promise<void>;
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
