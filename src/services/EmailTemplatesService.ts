import { ModelApiService } from '@services/ModelAPI';

export interface EmailTemplateDefinition {
    id:           string;
    key:          string;
    name:         string;
    description?: string;
    design:       Record<string, any>;
    html:         string;
    createdAt?:   string;
    updatedAt?:   string;
}

export interface SaveEmailTemplateDto {
    key:          string;
    name:         string;
    description?: string;
    design:       Record<string, any>;
    html:         string;
}

export class EmailTemplatesService extends ModelApiService {
    constructor() { super('email-templates'); }

    getAll(): Promise<EmailTemplateDefinition[]> {
        return this.get<EmailTemplateDefinition[]>() as Promise<EmailTemplateDefinition[]>;
    }

    findById(id: string): Promise<EmailTemplateDefinition> {
        return this.get<EmailTemplateDefinition>(id) as Promise<EmailTemplateDefinition>;
    }

    create(dto: SaveEmailTemplateDto): Promise<EmailTemplateDefinition> {
        return this.post<EmailTemplateDefinition>('', dto) as Promise<EmailTemplateDefinition>;
    }

    update(id: string, dto: SaveEmailTemplateDto): Promise<EmailTemplateDefinition> {
        return this.put<EmailTemplateDefinition>(id, dto);
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }
}
