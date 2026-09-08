/**
 * Multi-step form chaining — client side.
 * See docs/specs/multi-step-forms.spec.md §9, §11, §12.
 *
 * The backend answers every submit that opted in with a `chain` object naming
 * the next step of the wizard. When the next step is behind a queued service
 * task the answer is `pending`, and this module subscribes to the stream the
 * response points at until the wizard resolves.
 */

const BASE = import.meta.env.VITE_API_HOST ?? 'http://localhost:3000';

export type FormChainReason =
    | 'chainEnd'
    | 'endEvent'
    | 'failed'
    | 'pending'
    | 'branched'
    | 'unauthorized';

export interface FormChainNextTask {
    taskId:          string;
    taskName?:       string;
    /** Public path only — fetch the next step with GET /task-form/:token. */
    shareLinkToken?: string;
}

export interface FormChain {
    status:    'nextForm' | 'noForm';
    reason?:   FormChainReason;
    nextTask?: FormChainNextTask;
    resume?:   { streamUrl: string };
}

/** `pending` is the only non-terminal outcome — everything else ends the wait. */
export function isPending(chain: FormChain | undefined): boolean {
    return chain?.status === 'noForm' && chain.reason === 'pending';
}

/** The wizard continues — there is a next step to render. */
export function hasNextForm(chain: FormChain | undefined): chain is FormChain & { nextTask: FormChainNextTask } {
    return chain?.status === 'nextForm' && !!chain.nextTask;
}

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Waits for a pending chain to resolve, resolving with the first non-`pending`
 * chain the server sends. Resolves with a terminal `pending` if the server closes
 * the stream at its lifetime cap, or if the connection cannot be established.
 *
 * Implemented over `fetch` rather than `EventSource` because EventSource cannot
 * set an Authorization header, and the authenticated surface needs a Bearer
 * token. The wire format is the same either way; only the transport differs.
 *
 * Named `ping` events are heartbeats that keep the ALB and nginx from dropping
 * an idle connection — they are skipped here, exactly as EventSource's
 * `onmessage` would skip them.
 */
export async function awaitChain(streamUrl: string, signal?: AbortSignal): Promise<FormChain> {
    const timedOut: FormChain = { status: 'noForm', reason: 'pending' };

    try {
        const response = await fetch(`${BASE}${streamUrl}`, {
            headers: { Accept: 'text/event-stream', ...authHeaders() },
            signal,
        });

        if (!response.ok || !response.body) return timedOut;

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // SSE frames are separated by a blank line; fields are "name: value".
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let split: number;
            while ((split = buffer.indexOf('\n\n')) !== -1) {
                const frame = buffer.slice(0, split);
                buffer = buffer.slice(split + 2);

                let eventName = 'message';
                const dataLines: string[] = [];

                for (const line of frame.split('\n')) {
                    if (line.startsWith(':')) continue;                       // comment
                    if (line.startsWith('event:')) eventName = line.slice(6).trim();
                    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
                }

                if (eventName === 'ping' || dataLines.length === 0) continue;  // heartbeat

                try {
                    const chain = JSON.parse(dataLines.join('\n')) as FormChain;
                    reader.cancel().catch(() => {});
                    return chain;
                } catch {
                    // A frame we can't parse is not worth failing the wizard over.
                }
            }
        }

        return timedOut;
    } catch {
        // Aborted, offline, or blocked by an intermediary — the caller falls back
        // to its end-of-wizard screen, same as a timeout.
        return timedOut;
    }
}

/**
 * One-shot resolution. Used when a page reopens a wizard it was already waiting
 * on, and as the fallback for anything that cannot hold a streaming connection.
 */
export async function pollChain(chainUrl: string): Promise<FormChain> {
    try {
        const response = await fetch(`${BASE}${chainUrl}`, { headers: authHeaders() });
        if (!response.ok) return { status: 'noForm', reason: 'pending' };
        return await response.json() as FormChain;
    } catch {
        return { status: 'noForm', reason: 'pending' };
    }
}
