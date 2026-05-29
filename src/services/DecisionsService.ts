import type { APIData } from '@services/BaseService';
import { ModelApiService } from '@services/ModelAPI';

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

    getAll(): Promise<DecisionDefinition[]> {
        return this.get<DecisionDefinition[]>();
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

    remove(id: string): Promise<void> {
        return this.delete(id);
    }
}
