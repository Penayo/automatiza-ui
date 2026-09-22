<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Page from '@components/Page.vue';
import ProviderIcon from './components/ProviderIcon.vue';
import {
    Button, Column, DataTable, Dialog, InputText, Message, Select, Tag, useConfirm, useToast,
} from 'primevue';
import { $api } from '@services/api';
import type {
    ConnectionTestResult,
    StorageConnection,
    StorageConnectionSummary,
    StorageProviderId,
} from '@services/FilesService';

const toast   = useToast();
const confirm = useConfirm();

const connections = ref<StorageConnectionSummary[]>([]);
const loading     = ref(false);
const saving      = ref(false);
const testing     = ref(false);
const result      = ref<ConnectionTestResult | null>(null);

const dialogOpen = ref(false);
/** The code being edited, or null while creating — also what makes code/provider immutable. */
const editing    = ref<string | null>(null);

const form = ref<{ code: string; name: string; provider: StorageProviderId; config: Record<string, any> }>({
    code: '', name: '', provider: 'm365', config: {},
});

const PROVIDERS = [
    { value: 'r2',     label: 'Object storage (S3 / Cloudflare R2)' },
    { value: 'm365',   label: 'Microsoft 365 (SharePoint / OneDrive)' },
    { value: 'gdrive', label: 'Google Drive' },
];

const STEP_LABELS: Record<string, string> = {
    'authenticate':  'Authenticate',
    'resolve-drive': 'Find the document library',
    'write':         'Write a test file',
    'read':          'Read it back',
    'delete':        'Remove it again',
};

const providerLabel = (p: StorageProviderId) =>
    PROVIDERS.find(o => o.value === p)?.label ?? p;

/** Points at the setup guide, named for whichever provider is selected. */
const SETUP_GUIDE_LABELS: Record<string, string> = {
    gdrive: 'How to create a Google service account key',
    m365:   'How to register the Microsoft 365 application',
    r2:     'How to set up your own bucket',
};

const setupGuideLabel = computed(() =>
    SETUP_GUIDE_LABELS[form.value.provider] ?? 'Setup guide');

/** An r2 connection with no account or bucket is the platform's own storage. */
const isPlatformBucket = computed(() =>
    form.value.provider === 'r2' && !form.value.config.accountId && !form.value.config.bucket);

async function load() {
    loading.value = true;
    try {
        connections.value = await $api.files.listStorageConnections();
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load the storage connections.', life: 4000 });
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    editing.value = null;
    result.value  = null;
    form.value    = { code: '', name: '', provider: 'm365', config: {} };
    dialogOpen.value = true;
}

async function openEdit(code: string) {
    result.value = null;
    try {
        const connection: StorageConnection = await $api.files.getStorageConnection(code);
        editing.value = code;
        form.value = {
            code:     connection.code,
            name:     connection.name,
            provider: connection.provider,
            config:   { ...(connection.config ?? {}) },
        };
        dialogOpen.value = true;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: `Could not open "${code}".`, life: 4000 });
    }
}

async function test() {
    testing.value = true;
    result.value  = null;
    try {
        result.value = await $api.files.testStorageConnection(form.value.provider, form.value.config);
    } catch (error: any) {
        toast.add({
            severity: 'error',
            summary: 'Test failed',
            detail: error?.response?.data?.message ?? 'The connection test could not be run.',
            life: 5000,
        });
    } finally {
        testing.value = false;
    }
}

async function save() {
    saving.value = true;
    try {
        if (editing.value) {
            await $api.files.updateStorageConnection(editing.value, {
                name:   form.value.name,
                config: form.value.config,
            });
        } else {
            await $api.files.createStorageConnection({
                code:     form.value.code.trim(),
                name:     form.value.name.trim(),
                provider: form.value.provider,
                config:   form.value.config,
            });
        }
        dialogOpen.value = false;
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Storage connection saved.', life: 3000 });
        await load();
    } catch (error: any) {
        // The server re-runs the connection test on save, so a failure here carries
        // the per-step detail — show it rather than a generic message.
        const data = error?.response?.data;
        if (data?.steps) result.value = { ok: false, steps: data.steps };
        toast.add({
            severity: 'error',
            summary: 'Not saved',
            detail: data?.message ?? 'Could not save the storage connection.',
            life: 6000,
        });
    } finally {
        saving.value = false;
    }
}

async function act(
    label: string,
    run: () => Promise<unknown>,
) {
    try {
        await run();
        toast.add({ severity: 'success', summary: label, life: 2500 });
        await load();
    } catch (error: any) {
        toast.add({
            severity: 'error',
            summary: label,
            detail: error?.response?.data?.message ?? 'The change was not applied.',
            life: 6000,
        });
    }
}

const makeDefault = (code: string) =>
    act('Default updated', () => $api.files.makeStorageConnectionDefault(code));

/** Which connection is being probed right now, so only its button spins. */
const checking = ref<string | null>(null);

async function checkNow(code: string) {
    checking.value = code;
    try {
        const health = await $api.files.checkStorageConnection(code);
        toast.add({
            severity: health.health === 'ok' ? 'success' : 'error',
            summary:  health.health === 'ok' ? 'Connection works' : 'Connection failing',
            detail:   health.error,
            life:     health.health === 'ok' ? 2500 : 8000,
        });
        await load();
    } catch (error: any) {
        toast.add({
            severity: 'error',
            summary: 'Check failed',
            detail: error?.response?.data?.message ?? 'The health check could not be run.',
            life: 5000,
        });
    } finally {
        checking.value = null;
    }
}

type Health = StorageConnectionSummary['health'];

const HEALTH: Record<Health, { label: string; severity: 'success' | 'danger' | 'secondary' }> = {
    ok:      { label: 'OK',          severity: 'success' },
    failing: { label: 'Failing',     severity: 'danger' },
    unknown: { label: 'Not checked', severity: 'secondary' },
};

const healthOf = (value: unknown): { label: string; severity: 'success' | 'danger' | 'secondary' } =>
    HEALTH[(value as Health) ?? 'unknown'] ?? HEALTH.unknown;

const checkedAgo = (iso?: string) => {
    if (!iso) return 'never checked';
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1)   return 'checked just now';
    if (minutes < 60)  return `checked ${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)    return `checked ${hours}h ago`;
    return `checked ${Math.round(hours / 24)}d ago`;
};

const archive = (code: string) => confirm.require({
    message: `New files will stop going to "${code}". Everything already stored there keeps working.`,
    header:  'Archive this connection?',
    acceptLabel: 'Archive',
    rejectLabel: 'Cancel',
    accept: () => act('Archived', () => $api.files.archiveStorageConnection(code)),
});

const unarchive = (code: string) =>
    act('Reactivated', () => $api.files.unarchiveStorageConnection(code));

const remove = (code: string) => confirm.require({
    message: `Delete "${code}"? This is refused if it still holds any documents.`,
    header:  'Delete this connection?',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    accept: () => act('Deleted', () => $api.files.deleteStorageConnection(code)),
});

onMounted(load);
</script>

<template>
    <Page title="Document Storage" subtitle="Where uploaded files, generated reports and signed documents are kept">
        <template #actions>
            <Button variant="text" rounded icon="pi pi-refresh" :disabled="loading" @click="load" />
            <Button label="Add connection" icon="pi pi-plus" @click="openCreate" />
        </template>

        <div class="flex flex-col gap-4">
            <Message severity="info" :closable="false">
                A process picks its storage per task, with the <code>storageTarget</code> property set to a
                connection's code — or per process, for everything in it. Anything that names nothing goes to
                the default below. Existing files always stay where they were written.
                Each connection is checked automatically twice a day; a failing one is never swapped for
                another, so nothing is silently written somewhere else.
            </Message>

            <DataTable :value="connections" :loading="loading" dataKey="code" size="small"
                       emptyMessage="No storage connections yet.">
                <Column header="Connection">
                    <template #body="{ data }">
                        <div class="flex items-center gap-3">
                            <ProviderIcon :provider="data.provider" />
                            <div class="flex flex-col gap-0.5 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium truncate">{{ data.name }}</span>
                                    <Tag v-if="data.isDefault" value="Default" severity="success" />
                                    <Tag v-if="data.status === 'archived'" value="Archived" severity="secondary" />
                                </div>
                                <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    <code>{{ data.code }}</code> · {{ providerLabel(data.provider) }}
                                </span>
                            </div>
                        </div>
                    </template>
                </Column>
                <Column header="Health">
                    <template #body="{ data }">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center gap-2">
                                <Tag :value="healthOf(data.health).label"
                                     :severity="healthOf(data.health).severity" />
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ checkedAgo(data.lastCheckedAt) }}
                                </span>
                            </div>
                            <span v-if="data.health === 'failing' && data.lastTestError"
                                  class="text-xs text-red-600 dark:text-red-400">
                                {{ data.lastTestError }}
                            </span>
                        </div>
                    </template>
                </Column>
                <Column header="" style="width: 1%">
                    <template #body="{ data }">
                        <div class="flex justify-end gap-1">
                            <Button variant="text" rounded size="small" icon="pi pi-heart"
                                    v-tooltip.bottom="'Check now'" :loading="checking === data.code"
                                    @click="checkNow(data.code)" />
                            <Button variant="text" rounded size="small" icon="pi pi-pencil"
                                    v-tooltip.bottom="'Edit'" @click="openEdit(data.code)" />
                            <Button v-if="!data.isDefault && data.status === 'active'"
                                    variant="text" rounded size="small" icon="pi pi-star"
                                    v-tooltip.bottom="'Make default'" @click="makeDefault(data.code)" />
                            <Button v-if="data.status === 'active'"
                                    variant="text" rounded size="small" icon="pi pi-box"
                                    v-tooltip.bottom="'Archive'" @click="archive(data.code)" />
                            <Button v-else variant="text" rounded size="small" icon="pi pi-replay"
                                    v-tooltip.bottom="'Reactivate'" @click="unarchive(data.code)" />
                            <Button variant="text" rounded size="small" icon="pi pi-trash" severity="danger"
                                    v-tooltip.bottom="'Delete'" @click="remove(data.code)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="dialogOpen" modal :style="{ width: '46rem' }"
                :header="editing ? `Edit ${editing}` : 'Add a storage connection'">
            <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="code">Code</label>
                        <InputText id="code" v-model="form.code" :disabled="!!editing" placeholder="acme-sharepoint" />
                        <small class="text-gray-500 dark:text-gray-400">
                            What diagrams and forms cite. Lowercase letters, digits, <code>-</code> or
                            <code>_</code>. Permanent once created — stored files carry it.
                        </small>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="name">Name</label>
                        <InputText id="name" v-model="form.name" placeholder="ACME SharePoint" />
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-sm font-medium" for="provider">Provider</label>
                        <Select id="provider" v-model="form.provider" :options="PROVIDERS"
                                optionLabel="label" optionValue="value" :disabled="!!editing" />
                        <small class="text-gray-500 dark:text-gray-400">
                            <i class="pi pi-book text-xs mr-1" />
                            <router-link class="underline"
                                         :to="{ name: 'DocsPage', params: { page: 'storage-connections' } }"
                                         target="_blank">
                                {{ setupGuideLabel }}
                            </router-link>
                            — what to create on their side, and which values go where.
                        </small>
                    </div>
                </div>

                <!-- Microsoft 365 -->
                <div v-if="form.provider === 'm365'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="aadTenantId">Directory (tenant) ID</label>
                        <InputText id="aadTenantId" v-model="form.config.aadTenantId" placeholder="00000000-0000-0000-0000-000000000000" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="clientId">Application (client) ID</label>
                        <InputText id="clientId" v-model="form.config.clientId" placeholder="00000000-0000-0000-0000-000000000000" />
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-sm font-medium" for="clientSecret">Client secret</label>
                        <InputText id="clientSecret" v-model="form.config.clientSecret" placeholder="secrets.M365_CLIENT_SECRET" />
                        <small class="text-gray-500 dark:text-gray-400">
                            A reference to an entry in <router-link class="underline" to="/admin/secrets">Secrets</router-link>,
                            written as <code>secrets.KEY</code>. The value itself is never stored here.
                        </small>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="driveId">Drive ID</label>
                        <InputText id="driveId" v-model="form.config.driveId" placeholder="b!..." />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="rootFolder">Root folder</label>
                        <InputText id="rootFolder" v-model="form.config.rootFolder" placeholder="ProcessLinker" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="siteUrl">Site URL <span class="font-normal text-gray-500">(reference)</span></label>
                        <InputText id="siteUrl" v-model="form.config.siteUrl" placeholder="https://contoso.sharepoint.com/sites/Processes" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="libraryName">Library <span class="font-normal text-gray-500">(reference)</span></label>
                        <InputText id="libraryName" v-model="form.config.libraryName" placeholder="Documents" />
                    </div>
                </div>

                <!-- Google Drive -->
                <div v-else-if="form.provider === 'gdrive'" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="serviceAccountKey">Service account key</label>
                        <InputText id="serviceAccountKey" v-model="form.config.serviceAccountKey" placeholder="secrets.GDRIVE_SA_JSON" />
                        <small class="text-gray-500 dark:text-gray-400">
                            A reference to an entry in <router-link class="underline" to="/admin/secrets">Secrets</router-link>
                            whose value is the <strong>whole</strong> service account JSON file —
                            <router-link class="underline"
                                         :to="{ name: 'DocsPage', params: { page: 'storage-connections' } }"
                                         target="_blank">how to create one</router-link>.
                            Remember to share the drive or folder with the service account's email address,
                            or it can authenticate but not write.
                        </small>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="gdriveId">Shared drive ID</label>
                            <InputText id="gdriveId" v-model="form.config.driveId"
                                       placeholder="0AJ... or paste the drive's URL" />
                            <small class="text-gray-500 dark:text-gray-400">
                                A Workspace shared drive, shared with the service account as Content manager.
                                Writing into a personal My Drive folder instead needs
                                <strong>Impersonate user</strong> below — a service account has no storage of
                                its own, so files it would own are rejected.
                            </small>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="rootFolderId">Root folder ID</label>
                            <InputText id="rootFolderId" v-model="form.config.rootFolderId"
                                       placeholder="1a2B3c... or paste the folder's URL" />
                            <small class="text-gray-500 dark:text-gray-400">
                                Everything is written inside this folder. Empty ⇒ the top of the shared drive.
                            </small>
                        </div>
                        <div class="flex flex-col gap-1 md:col-span-2">
                            <label class="text-sm font-medium" for="subject">Impersonate user <span class="font-normal text-gray-500">(optional)</span></label>
                            <InputText id="subject" v-model="form.config.subject" placeholder="ops@contoso.com" />
                            <small class="text-gray-500 dark:text-gray-400">
                                Domain-wide delegation: files are owned by this user and count against their quota.
                            </small>
                        </div>
                    </div>
                    <Message severity="info" :closable="false">
                        Share the target drive or folder with the service account's email address, as
                        <strong>Content manager</strong> or better — without that it can authenticate but not write.
                    </Message>
                </div>

                <!-- Object storage -->
                <div v-else class="flex flex-col gap-4">
                    <Message severity="secondary" :closable="false">
                        Leave the account and bucket empty to use the platform's own storage — nothing else to
                        configure. Fill them in to write to a bucket you own.
                    </Message>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="accountId">Account ID</label>
                            <InputText id="accountId" v-model="form.config.accountId" placeholder="cloudflare account id" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="bucket">Bucket</label>
                            <InputText id="bucket" v-model="form.config.bucket" placeholder="acme-documents" />
                        </div>
                        <div v-if="!isPlatformBucket" class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="accessKeyId">Access key ID</label>
                            <InputText id="accessKeyId" v-model="form.config.accessKeyId" placeholder="secrets.ACME_R2_KEY_ID" />
                        </div>
                        <div v-if="!isPlatformBucket" class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="secretAccessKey">Secret access key</label>
                            <InputText id="secretAccessKey" v-model="form.config.secretAccessKey" placeholder="secrets.ACME_R2_SECRET" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-medium" for="r2RootFolder">Root folder</label>
                            <InputText id="r2RootFolder" v-model="form.config.rootFolder" placeholder="files" />
                        </div>
                    </div>
                    <small v-if="!isPlatformBucket" class="text-gray-500 dark:text-gray-400">
                        Both keys are references to <router-link class="underline" to="/admin/secrets">Secrets</router-link>,
                        written as <code>secrets.KEY</code>.
                    </small>
                </div>

                <div class="flex items-center gap-3">
                    <Button label="Test connection" icon="pi pi-play" severity="secondary" :loading="testing" @click="test" />
                    <small class="text-gray-500 dark:text-gray-400">
                        Writes a small file, reads it back and removes it. Runs again on save — a connection
                        that fails is not saved.
                    </small>
                </div>

                <!-- Per-step result: a failure has to say which step, or it is unfixable -->
                <div v-if="result" class="rounded-xl border p-4 flex flex-col gap-2"
                     :class="result.ok ? 'border-green-500/40' : 'border-red-500/40'">
                    <div class="font-medium" :class="result.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ result.ok ? 'Connection works.' : 'Connection failed.' }}
                    </div>
                    <div v-for="step in result.steps" :key="step.step" class="flex items-start gap-2 text-sm">
                        <i :class="step.ok ? 'pi pi-check text-green-600 dark:text-green-400' : 'pi pi-times text-red-600 dark:text-red-400'" />
                        <span>
                            {{ STEP_LABELS[step.step] ?? step.step }}
                            <span v-if="step.detail" class="text-gray-500 dark:text-gray-400"> — {{ step.detail }}</span>
                        </span>
                    </div>
                </div>

                <Message v-if="form.provider === 'm365'" severity="info" :closable="false">
                    The app registration needs the <strong>Sites.Selected</strong> application permission, with an
                    admin grant on this one site.
                </Message>
            </div>

            <template #footer>
                <Button label="Cancel" severity="secondary" variant="text" @click="dialogOpen = false" />
                <Button :label="editing ? 'Save' : 'Create'" icon="pi pi-check" :loading="saving" @click="save" />
            </template>
        </Dialog>
    </Page>
</template>
