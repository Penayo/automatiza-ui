import { ModelApiService } from '@services/ModelAPI';

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

    getAll(): Promise<FormVariable[]> {
        return this.get<FormVariable[]>();
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

    remove(id: string): Promise<void> {
        return this.delete(id);
    }
}
