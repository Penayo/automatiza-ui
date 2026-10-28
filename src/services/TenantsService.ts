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
    profile?:   TenantProfile;
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

/** The tenant's business identity; feeds the `tenant` process variable. */
export interface TenantProfile {
    legalName?: string;
    taxId?:     string;
    email?:     string;
    phone?:     string;
    website?:   string;
    address?: {
        line1?:      string;
        line2?:      string;
        city?:       string;
        state?:      string;
        postalCode?: string;
        country?:    string;
    };
    signer?: { name?: string; title?: string };
    custom?: { key: string; value: string }[];
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

    /** Replaces the tenant's organization profile (SUPER_ADMIN). */
    async updateProfile(id: string, profile: TenantProfile): Promise<TenantProfile> {
        return this.put<TenantProfile>(`${id}/profile`, profile) as Promise<TenantProfile>;
    }

    async getBranding(): Promise<TenantBrandingResponse> {
        return this.get<TenantBrandingResponse>('branding') as Promise<TenantBrandingResponse>;
    }
}
