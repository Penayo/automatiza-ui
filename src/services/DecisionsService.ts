import type { APIData } from '@services/BaseService';
import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

export interface DecisionDefinition extends APIData {
    id:           string;
    decisionId:   string;
    name:         string;
    dmnXml:       string;
    version:      number;
    deployedAt?:  string;
    description?: string;
    createdAt?:   string;
}

export interface SaveDecisionDto {
    dmnXml:       string;
    description?: string;
}

export class DecisionsService extends ModelApiService {
    constructor() {
        super('decisions');
    }

    /** Full list. */
    getAll(): Promise<DecisionDefinition[]> {
        return this.get<DecisionDefinition[]>();
    }

    /** One page. `page` is what makes the backend return the envelope. */
    getPage(params: ListQuery & { page: number }): Promise<PageResponse<DecisionDefinition>> {
        return this.get<PageResponse<DecisionDefinition>>('', { params });
    }

    findById(id: string): Promise<DecisionDefinition> {
        return this.get<DecisionDefinition>(id);
    }

    save(dto: SaveDecisionDto): Promise<DecisionDefinition> {
        return this.post<DecisionDefinition>('', dto);
    }

    deploy(id: string): Promise<DecisionDefinition> {
        return this.post<DecisionDefinition>(`${id}/deploy`);
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }

    evaluate(id: string, variables: Record<string, any>): Promise<{ outputs: Record<string, any>; matchedRules: number[] }> {
        return this.post<{ outputs: Record<string, any>; matchedRules: number[] }>(`${id}/evaluate`, { variables });
    }
}
