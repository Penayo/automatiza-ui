import type { ProcessDefinition } from '@services/ProcessesService';

const STORAGE_KEY = 'process-recently-opened';
const MAX_ENTRIES = 30;

function getMap(): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
}

export function trackProcessOpen(processId: string) {
    const map = getMap();
    map[processId] = Date.now();
    // Prune to MAX_ENTRIES by keeping only the most recent
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

export type ProcessSort = 'recent' | 'az' | 'newest';

export function sortProcesses(processes: ProcessDefinition[], sort: ProcessSort): ProcessDefinition[] {
    const map = getMap();
    const copy = [...processes];
    if (sort === 'az') {
        return copy.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }
    if (sort === 'newest') {
        return copy.sort((a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        );
    }
    // recent: opened processes first (newest open first), then never-opened sorted A–Z
    return copy.sort((a, b) => {
        const ta = map[a.processId ?? a.id ?? ''] ?? 0;
        const tb = map[b.processId ?? b.id ?? ''] ?? 0;
        if (ta !== tb) return tb - ta;
        return (a.name ?? '').localeCompare(b.name ?? '');
    });
}
