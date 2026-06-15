<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Button, DataTable, Column, Tag, useToast } from 'primevue';
import Page from '@components/Page.vue';
import { $api } from '@services/api';
import type { StuckTask } from '@services/RecoveryService';
import { useRouter } from 'vue-router';

const toastSvc = useToast();
const router   = useRouter();

const stuckTasks   = ref<StuckTask[]>([]);
const loading      = ref(false);
const recovering   = ref<Set<string>>(new Set());
const recoveringAll = ref(false);

async function load() {
    loading.value = true;
    try {
        stuckTasks.value = await $api.recovery.getStuckTasks();
    } catch (err: any) {
        toastSvc.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not load stuck tasks.', life: 4000 });
    } finally {
        loading.value = false;
    }
}

async function recoverOne(task: StuckTask) {
    recovering.value = new Set([...recovering.value, task.taskId]);
    try {
        const result = await $api.recovery.repairProcessInstance(task.processInstanceId);
        if (result.fixed.length > 0) {
            toastSvc.add({ severity: 'success', summary: 'Recovered', detail: `Task "${task.taskName}" resumed successfully.`, life: 4000 });
        } else {
            const reason = result.skipped[0]?.reason ?? 'Unknown reason';
            toastSvc.add({ severity: 'warn', summary: 'Skipped', detail: reason, life: 5000 });
        }
        await load();
    } catch (err: any) {
        toastSvc.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Recovery failed.', life: 4000 });
    } finally {
        const next = new Set(recovering.value);
        next.delete(task.taskId);
        recovering.value = next;
    }
}

async function recoverAll() {
    recoveringAll.value = true;
    try {
        const result = await $api.recovery.recoverAll();
        if (result.resumed > 0) {
            toastSvc.add({
                severity: 'success',
                summary: `Recovered ${result.resumed} task(s)`,
                detail: result.failed > 0 ? `${result.failed} task(s) could not be recovered. Check logs.` : 'All stuck tasks resumed.',
                life: 5000,
            });
        } else {
            toastSvc.add({ severity: 'info', summary: 'Nothing to recover', detail: 'No stuck tasks found or none could be resumed.', life: 4000 });
        }
        await load();
    } catch (err: any) {
        toastSvc.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Recover All failed.', life: 4000 });
    } finally {
        recoveringAll.value = false;
    }
}

function goToInstance(id: string) {
    router.push({ name: 'ProcessInstanceDetail', params: { id } });
}

onMounted(load);
</script>

<template>
    <Page title="Process Recovery">
        <template #actions>
            <Button
                icon="pi pi-refresh"
                label="Refresh"
                severity="secondary"
                size="small"
                :loading="loading"
                @click="load"
            />
            <Button
                icon="pi pi-bolt"
                label="Recover All"
                size="small"
                :loading="recoveringAll"
                :disabled="stuckTasks.length === 0 || loading"
                @click="recoverAll"
            />
        </template>

        <!-- Empty state -->
        <div
            v-if="!loading && stuckTasks.length === 0"
            class="flex flex-col items-center justify-center gap-3 py-20 text-surface-400"
        >
            <i class="pi pi-check-circle text-5xl text-emerald-500" />
            <p class="text-lg font-medium text-surface-600 dark:text-surface-300">No stuck tasks found</p>
            <p class="text-sm text-surface-400">All Call Activity tasks are running normally.</p>
        </div>

        <!-- Table -->
        <DataTable
            v-else
            :value="stuckTasks"
            :loading="loading"
            striped-rows
            size="small"
            class="mt-4"
        >
            <!-- Status badge — always STUCK here -->
            <Column header="Status" style="width: 100px">
                <template #body>
                    <Tag value="STUCK" severity="danger" />
                </template>
            </Column>

            <Column header="Process" field="processName">
                <template #body="{ data }">
                    <div class="flex flex-col gap-0.5">
                        <span class="font-medium text-sm">{{ data.processName }}</span>
                        <button
                            class="text-xs text-primary hover:underline text-left font-mono opacity-70"
                            @click="goToInstance(data.processInstanceId)"
                        >
                            {{ data.processInstanceId }}
                        </button>
                    </div>
                </template>
            </Column>

            <Column header="Stuck Task" field="taskName">
                <template #body="{ data }">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-sm">{{ data.taskName }}</span>
                        <span class="text-xs font-mono opacity-50">{{ data.taskDefinitionId }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Child Process" field="childProcessInstanceId">
                <template #body="{ data }">
                    <div class="flex flex-col gap-0.5">
                        <Tag value="COMPLETED" severity="success" class="text-xs" />
                        <button
                            class="text-xs text-primary hover:underline text-left font-mono opacity-70"
                            @click="goToInstance(data.childProcessInstanceId)"
                        >
                            {{ data.childProcessInstanceId }}
                        </button>
                    </div>
                </template>
            </Column>

            <Column header="Created At" field="createdAt" style="width: 160px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-500">
                        {{ new Date(data.createdAt).toLocaleString() }}
                    </span>
                </template>
            </Column>

            <Column header="" style="width: 120px">
                <template #body="{ data }">
                    <Button
                        label="Recover"
                        icon="pi pi-bolt"
                        size="small"
                        :loading="recovering.has(data.taskId)"
                        @click="recoverOne(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </Page>
</template>
