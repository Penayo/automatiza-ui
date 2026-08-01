import type { SaveDatasourceDto } from '@services/DatasourcesService';

import postgrest from './postgrest.json';
import nocodb from './nocodb.json';
import fastapi from './fastapi.json';
import custom from './custom.json';

/**
 * Starter declarations for common data APIs.
 *
 * Files, not database rows, and deliberately so — a preset is product knowledge
 * about how a third-party API behaves, the same kind of thing as the modeler's
 * `element-templates/`. Keeping them in git means a correction is reviewable and
 * ships with the release that learned it.
 *
 * **To add or fix a preset:** edit the JSON beside this file and add it to the
 * import list. Nothing else registers them.
 *
 * A preset is only a starting point: applying one copies its values into the
 * form, after which the datasource is independent of it.
 */
export interface DatasourcePreset {
    id: string;
    name: string;
    description: string;
    docsUrl: string | null;
    /**
     * When and against what this was confirmed, or null for "written from
     * documentation only". Surfaced in the UI — the PostgREST spike corrected
     * three documented assumptions, so the distinction is not cosmetic.
     */
    verified: string | null;
    notes: string[];
    template: Partial<SaveDatasourceDto>;
}

export const DATASOURCE_PRESETS: DatasourcePreset[] = [
    postgrest as DatasourcePreset,
    nocodb as DatasourcePreset,
    fastapi as DatasourcePreset,
    custom as DatasourcePreset,
];

export function findPreset(id: string | null | undefined): DatasourcePreset | undefined {
    return DATASOURCE_PRESETS.find(p => p.id === id);
}
