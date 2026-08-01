import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

export interface FormVariableItem {
    label: string;
    value: any;
}

export interface FormVariable {
    id:           string;
    key:          string;
    label:        string;
    description?: string;
    items:        FormVariableItem[];
    createdAt?:   string;
    updatedAt?:   string;
}

export interface SaveFormVariableDto {
    key:          string;
    label:        string;
    description?: string;
    items:        FormVariableItem[];
}

export class FormVariablesService extends ModelApiService {
    constructor() { super('form-variables'); }

    /** Full list — form previews resolve expression keys against every variable. */
    getAll(): Promise<FormVariable[]> {
        return this.get<FormVariable[]>();
    }

    /** One page. `page` is what makes the backend return the envelope. */
    getPage(params: ListQuery & { page: number }): Promise<PageResponse<FormVariable>> {
        return this.get<PageResponse<FormVariable>>('', { params });
    }

    findById(id: string): Promise<FormVariable> {
        return this.get<FormVariable>(id);
    }

    create(dto: SaveFormVariableDto): Promise<FormVariable> {
        return this.post<FormVariable>('', dto);
    }

    update(id: string, dto: SaveFormVariableDto): Promise<FormVariable> {
        return this.put<FormVariable>(id, dto);
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }
}
