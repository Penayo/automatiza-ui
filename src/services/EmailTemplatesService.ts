import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

export type EmailTemplateType = 'template' | 'block';

export interface EmailTemplateDefinition {
    id:           string;
    key:          string;
    name:         string;
    description?: string;
    type:         EmailTemplateType;
    design:       Record<string, any>;
    html:         string;
    createdAt?:   string;
    updatedAt?:   string;
}

export interface SaveEmailTemplateDto {
    key:          string;
    name:         string;
    description?: string;
    type?:        EmailTemplateType;
    design:       Record<string, any>;
    html:         string;
}

export class EmailTemplatesService extends ModelApiService {
    constructor() { super('email-templates'); }

    /** Full list, optionally narrowed (e.g. `{ filter: { type: { equalsTo: 'block' } } }`). */
    getAll(params?: ListQuery): Promise<EmailTemplateDefinition[]> {
        return this.get<EmailTemplateDefinition[]>('', { params }) as Promise<EmailTemplateDefinition[]>;
    }

    /** One page. `page` is what makes the backend return the envelope. */
    getPage(params: ListQuery & { page: number }): Promise<PageResponse<EmailTemplateDefinition>> {
        return this.get<PageResponse<EmailTemplateDefinition>>('', { params });
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
