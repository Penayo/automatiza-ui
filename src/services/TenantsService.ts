import { BaseService } from '@services/BaseService';

export type TenantStatus = 'active' | 'suspended';
export type BrandingTheme     = 'sky' | 'violet' | 'emerald' | 'rose' | 'amber' | 'slate'
                              | 'indigo' | 'teal' | 'orange' | 'pink' | 'cyan' | 'fuchsia' | 'red'
                              | 'blue' | 'navy' | 'garnet' | 'coffee';
export type CompanyNameStyle  = 'display' | 'heading' | 'subheading' | 'caption';

export interface TenantBranding {
    theme?:                BrandingTheme;
    customPrimaryColor?:   string;
    customSecondaryColor?: string;
    logoUrl?:              string;
    logoDarkUrl?:          string;
    logoSize?:             number;
    logoPadding?:          number;
    logoBgColor?:          string;
    companyName?:          string;
    showCompanyName?:      boolean;
    companyNameStyle?:     CompanyNameStyle;
}

export interface ITenant {
    id:         string;
    slug:       string;
    name:       string;
    status:     TenantStatus;
    createdAt:  string;
    branding:   TenantBranding;
    settings:   Record<string, any>;
}

export interface CreateTenantDto {
    slug: string;
    name: string;
}

export interface UpdateTenantDto {
    name?:     string;
    branding?: TenantBranding;
}

export interface TenantBrandingResponse {
    theme:                BrandingTheme | null;
    customPrimaryColor:   string | null;
    customSecondaryColor: string | null;
    logoUrl:              string | null;
    logoDarkUrl:          string | null;
    logoSize:             number | null;
    logoPadding:          number | null;
    logoBgColor:          string | null;
    companyName:          string;
    showCompanyName:      boolean;
    companyNameStyle:     CompanyNameStyle;
}

export class TenantsService extends BaseService {
    constructor() {
        super('tenants');
    }

    async findAll(): Promise<ITenant[]> {
        return this.get<ITenant[]>('') as Promise<ITenant[]>;
    }

    async findById(id: string): Promise<ITenant> {
        return this.get<ITenant>(id) as Promise<ITenant>;
    }

    async create(dto: CreateTenantDto): Promise<ITenant> {
        return this.post<ITenant>('', dto) as Promise<ITenant>;
    }

    async update(id: string, dto: UpdateTenantDto): Promise<ITenant> {
        return this.put<ITenant>(id, dto) as Promise<ITenant>;
    }

    async suspend(id: string): Promise<ITenant> {
        return this.post<ITenant>(`${id}/suspend`, {}) as Promise<ITenant>;
    }

    async activate(id: string): Promise<ITenant> {
        return this.post<ITenant>(`${id}/activate`, {}) as Promise<ITenant>;
    }

    async getBranding(): Promise<TenantBrandingResponse> {
        return this.get<TenantBrandingResponse>('branding') as Promise<TenantBrandingResponse>;
    }
}
