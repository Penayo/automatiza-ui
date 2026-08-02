import { ref, onMounted, type Ref } from 'vue';
import { $api } from '@services/api';
import type { BrandingTheme, CompanyNameStyle, TenantBrandingResponse } from '@services/TenantsService';

/** Branding as delivered by either /tenants/branding or the public-start payload. */
export type TenantBranding = TenantBrandingResponse;

type Palette = Record<string, string>;

// ── Shade generation ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
        .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
        .join('');
}

function mix(base: [number, number, number], target: [number, number, number], pct: number): string {
    return rgbToHex(
        base[0] + (target[0] - base[0]) * pct,
        base[1] + (target[1] - base[1]) * pct,
        base[2] + (target[2] - base[2]) * pct,
    );
}

export function generateShades(hex: string): Palette {
    const base  = hexToRgb(hex);
    const white: [number, number, number] = [255, 255, 255];
    const black: [number, number, number] = [0, 0, 0];
    return {
        '50':  mix(base, white, 0.95),
        '100': mix(base, white, 0.90),
        '200': mix(base, white, 0.75),
        '300': mix(base, white, 0.55),
        '400': mix(base, white, 0.30),
        '500': hex,
        '600': mix(base, black, 0.15),
        '700': mix(base, black, 0.30),
        '800': mix(base, black, 0.45),
        '900': mix(base, black, 0.60),
        '950': mix(base, black, 0.72),
    };
}

// ── Preset palettes ──────────────────────────────────────────────────────────

const PALETTES: Record<BrandingTheme, Palette> = {
    sky: {
        '50':'#f0f9ff','100':'#e0f2fe','200':'#bae6fd','300':'#7dd3fc',
        '400':'#38bdf8','500':'#0ea5e9','600':'#0284c7','700':'#0369a1',
        '800':'#075985','900':'#0c4a6e','950':'#082f49',
    },
    violet: {
        '50':'#f5f3ff','100':'#ede9fe','200':'#ddd6fe','300':'#c4b5fd',
        '400':'#a78bfa','500':'#8b5cf6','600':'#7c3aed','700':'#6d28d9',
        '800':'#5b21b6','900':'#4c1d95','950':'#2e1065',
    },
    emerald: {
        '50':'#ecfdf5','100':'#d1fae5','200':'#a7f3d0','300':'#6ee7b7',
        '400':'#34d399','500':'#10b981','600':'#059669','700':'#047857',
        '800':'#065f46','900':'#064e3b','950':'#022c22',
    },
    rose: {
        '50':'#fff1f2','100':'#ffe4e6','200':'#fecdd3','300':'#fda4af',
        '400':'#fb7185','500':'#f43f5e','600':'#e11d48','700':'#be123c',
        '800':'#9f1239','900':'#881337','950':'#4c0519',
    },
    amber: {
        '50':'#fffbeb','100':'#fef3c7','200':'#fde68a','300':'#fcd34d',
        '400':'#fbbf24','500':'#f59e0b','600':'#d97706','700':'#b45309',
        '800':'#92400e','900':'#78350f','950':'#451a03',
    },
    slate: {
        '50':'#f8fafc','100':'#f1f5f9','200':'#e2e8f0','300':'#cbd5e1',
        '400':'#94a3b8','500':'#64748b','600':'#475569','700':'#334155',
        '800':'#1e293b','900':'#0f172a','950':'#020617',
    },
    indigo: {
        '50':'#eef2ff','100':'#e0e7ff','200':'#c7d2fe','300':'#a5b4fc',
        '400':'#818cf8','500':'#6366f1','600':'#4f46e5','700':'#4338ca',
        '800':'#3730a3','900':'#312e81','950':'#1e1b4b',
    },
    teal: {
        '50':'#f0fdfa','100':'#ccfbf1','200':'#99f6e4','300':'#5eead4',
        '400':'#2dd4bf','500':'#14b8a6','600':'#0d9488','700':'#0f766e',
        '800':'#115e59','900':'#134e4a','950':'#042f2e',
    },
    orange: {
        '50':'#fff7ed','100':'#ffedd5','200':'#fed7aa','300':'#fdba74',
        '400':'#fb923c','500':'#f97316','600':'#ea580c','700':'#c2410c',
        '800':'#9a3412','900':'#7c2d12','950':'#431407',
    },
    pink: {
        '50':'#fdf2f8','100':'#fce7f3','200':'#fbcfe8','300':'#f9a8d4',
        '400':'#f472b6','500':'#ec4899','600':'#db2777','700':'#be185d',
        '800':'#9d174d','900':'#831843','950':'#500724',
    },
    cyan: {
        '50':'#ecfeff','100':'#cffafe','200':'#a5f3fc','300':'#67e8f9',
        '400':'#22d3ee','500':'#06b6d4','600':'#0891b2','700':'#0e7490',
        '800':'#155e75','900':'#164e63','950':'#083344',
    },
    fuchsia: {
        '50':'#fdf4ff','100':'#fae8ff','200':'#f5d0fe','300':'#f0abfc',
        '400':'#e879f9','500':'#d946ef','600':'#c026d3','700':'#a21caf',
        '800':'#86198f','900':'#701a75','950':'#4a044e',
    },
    red: {
        '50':'#fef2f2','100':'#fee2e2','200':'#fecaca','300':'#fca5a5',
        '400':'#f87171','500':'#ef4444','600':'#dc2626','700':'#b91c1c',
        '800':'#991b1b','900':'#7f1d1d','950':'#450a0a',
    },
    blue: {
        '50':'#eff6ff','100':'#dbeafe','200':'#bfdbfe','300':'#93c5fd',
        '400':'#60a5fa','500':'#3b82f6','600':'#2563eb','700':'#1d4ed8',
        '800':'#1e40af','900':'#1e3a8a','950':'#172554',
    },
    navy: {
        '50':'#eef1fa','100':'#d5dcf2','200':'#a8b8e5','300':'#7491d4',
        '400':'#4a6dc2','500':'#2a4fa8','600':'#1e3d8a','700':'#162d6b',
        '800':'#0f1f4e','900':'#081333','950':'#04091c',
    },
    garnet: {
        '50':'#fdf2f4','100':'#fbe6e9','200':'#f5c2cb','300':'#ec8fa0',
        '400':'#de5672','500':'#c0293f','600':'#9e1a2c','700':'#80111e',
        '800':'#630d17','900':'#4c0b12','950':'#2e060b',
    },
    coffee: {
        '50':'#faf6f2','100':'#f2e8de','200':'#e2cebc','300':'#cead95',
        '400':'#b48869','500':'#8b6148','600':'#6f4e37','700':'#573c2a',
        '800':'#402b1d','900':'#2c1c12','950':'#180f09',
    },
};

// ── Apply helpers ────────────────────────────────────────────────────────────

function applyPalette(el: HTMLElement, palette: Palette, prefix: string = 'fo-brand') {
    for (const [shade, value] of Object.entries(palette)) {
        el.style.setProperty(`--${prefix}-${shade}`, value);
    }
}

function clearPalette(el: HTMLElement, prefix: string = 'fo-brand') {
    ['50','100','200','300','400','500','600','700','800','900','950'].forEach(shade => {
        el.style.removeProperty(`--${prefix}-${shade}`);
    });
}

/**
 * Applies a tenant's palette to one element as --fo-brand-* / --fo-secondary-*
 * variables. Shared by the frontoffice layout and the public start page, which
 * gets its branding from the public-start payload instead of /tenants/branding.
 */
export function applyBrandingPalette(el: HTMLElement | null, branding: Partial<TenantBranding> | null) {
    if (!el || !branding) return;

    // Primary: custom color overrides preset theme
    if (branding.customPrimaryColor) {
        applyPalette(el, generateShades(branding.customPrimaryColor), 'fo-brand');
    } else if (branding.theme && branding.theme in PALETTES) {
        applyPalette(el, PALETTES[branding.theme], 'fo-brand');
    }

    // Secondary: always independent
    if (branding.customSecondaryColor) {
        applyPalette(el, generateShades(branding.customSecondaryColor), 'fo-secondary');
    } else {
        clearPalette(el, 'fo-secondary');
    }
}

// ── Composable ───────────────────────────────────────────────────────────────

export function useTenantBranding(containerRef: Ref<HTMLElement | null>) {
    const companyName      = ref<string | null>(null);
    const logoUrl          = ref<string | null>(null);
    const logoDarkUrl      = ref<string | null>(null);
    const logoSize         = ref<number | null>(null);
    const logoPadding      = ref<number | null>(null);
    const logoBgColor      = ref<string | null>(null);
    const showCompanyName  = ref<boolean>(true);
    const companyNameStyle = ref<CompanyNameStyle>('subheading');

    onMounted(async () => {
        try {
            const branding = await $api.tenants.getBranding();
            companyName.value      = branding.companyName      ?? null;
            logoUrl.value          = branding.logoUrl          ?? null;
            logoDarkUrl.value      = branding.logoDarkUrl      ?? null;
            logoSize.value         = branding.logoSize         ?? null;
            logoPadding.value      = branding.logoPadding      ?? null;
            logoBgColor.value      = branding.logoBgColor      ?? null;
            showCompanyName.value  = branding.showCompanyName  ?? true;
            companyNameStyle.value = branding.companyNameStyle ?? 'subheading';

            applyBrandingPalette(containerRef.value, branding);
        } catch {
            // Silently ignore — CSS defaults remain active
        }
    });

    return { companyName, logoUrl, logoDarkUrl, logoSize, logoPadding, logoBgColor, showCompanyName, companyNameStyle };
}
