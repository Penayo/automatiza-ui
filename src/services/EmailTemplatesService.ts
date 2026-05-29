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

    async update(id: string, dto: SaveEmailTemplateDto): Promise<EmailTemplateDefinition> {
        const response = await this.put(id, dto);
        return (response as any)?.data ?? response as EmailTemplateDefinition;
    }

    remove(id: string): Promise<void> {
        return this.delete(id) as Promise<void>;
    }
}
