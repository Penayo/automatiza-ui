<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button, Textarea, useConfirm, useToast } from 'primevue';
import { $api } from '@services/api';
import type { IComment } from '@services/CommentsService';
import { parseApiError } from '@/utils/error';
import { onDelete } from '@/utils/common';

/**
 * The comment thread of a process **instance**.
 *
 * `taskId`/`taskName` only tag new comments with where they were written — the
 * thread itself is never filtered by task, which is what makes the conversation
 * survive as the case moves from one task to the next.
 */
const props = defineProps<{
    processInstanceId?: string | null;
    taskId?: string | null;
    taskName?: string | null;
    /** Hides the composer (e.g. a task the user does not own). */
    readOnly?: boolean;
}>();

const PAGE_SIZE = 20;

const toast   = useToast();
const confirm = useConfirm();

const comments     = ref<IComment[]>([]);
const totalRecords = ref(0);
const page         = ref(1);
const loading      = ref(false);
const posting      = ref(false);
const draft        = ref('');

const currentUser = computed(() => $api.authService.getAccessInfo()?.user.username);
const hasMore     = computed(() => comments.value.length < totalRecords.value);
const canPost     = computed(() => !props.readOnly && !!props.processInstanceId);

async function load(nextPage = 1) {
    if (!props.processInstanceId) return;

    try {
        loading.value = true;
        const result = await $api.comments.listForInstance(
            props.processInstanceId, nextPage, PAGE_SIZE,
        );
        // Page 1 replaces; later pages append older comments below.
        comments.value     = nextPage === 1 ? result.rows : [...comments.value, ...result.rows];
        totalRecords.value = result.totalRecords;
        page.value         = nextPage;
    } catch (error) {
        toast.add({ ...parseApiError(error), life: 5000 });
    } finally {
        loading.value = false;
    }
}

async function post() {
    const body = draft.value.trim();
    if (!body || !props.processInstanceId || posting.value) return;

    try {
        posting.value = true;
        const created = await $api.comments.create(props.processInstanceId, {
            body,
            taskId:   props.taskId   ?? undefined,
            taskName: props.taskName ?? undefined,
        });
        comments.value = [created, ...comments.value];
        totalRecords.value += 1;
        draft.value = '';
    } catch (error) {
        toast.add({ ...parseApiError(error), life: 6000 });
    } finally {
        posting.value = false;
    }
}

/**
 * Deletable only by its author, and only while still on the task it was written
 * from — once the case moves on the note belongs to the handover, not the author.
 */
function canDelete(comment: IComment): boolean {
    return comment.author === currentUser.value
        && !!comment.taskId
        && comment.taskId === props.taskId;
}

function remove(comment: IComment) {
    if (!props.taskId) return;

    onDelete(confirm, comment, async () => {
        try {
            await $api.comments.remove(comment.id, props.taskId as string);
            comments.value     = comments.value.filter(c => c.id !== comment.id);
            totalRecords.value = Math.max(0, totalRecords.value - 1);
        } catch (error) {
            toast.add({ ...parseApiError(error), life: 6000 });
        }
    }, 'Delete this comment?');
}

function initials(author: string): string {
    return author.slice(0, 2).toUpperCase();
}

function formatDate(value: string): string {
    return new Date(value).toLocaleString();
}

// Ctrl/Cmd+Enter posts — the textarea keeps Enter for newlines.
function onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        post();
    }
}

watch(() => props.processInstanceId, () => {
    comments.value     = [];
    totalRecords.value = 0;
    draft.value        = '';
    load(1);
}, { immediate: true });

defineExpose({ reload: () => load(1) });
</script>

<template>
    <section class="flex flex-col gap-3">
        <header class="flex items-center gap-2">
            <i class="pi pi-comments text-surface-400" />
            <h3 class="text-sm font-semibold text-(--layout-accent-color)">Comments</h3>
            <span
                v-if="totalRecords"
                class="text-xs text-surface-400 rounded-full bg-surface-100 dark:bg-zinc-800 px-2 py-0.5"
            >{{ totalRecords }}</span>
        </header>

        <!-- Composer -->
        <div v-if="canPost" class="flex flex-col gap-2">
            <Textarea
                v-model="draft"
                rows="3"
                auto-resize
                placeholder="Add a comment for whoever picks this case up next…"
                class="w-full text-sm"
                :disabled="posting"
                @keydown="onKeydown"
            />
            <div class="flex justify-end">
                <Button
                    size="small"
                    icon="pi pi-send"
                    label="Comment"
                    :loading="posting"
                    :disabled="!draft.trim()"
                    @click="post"
                />
            </div>
        </div>

        <!-- Thread -->
        <div v-if="loading && !comments.length" class="flex justify-center py-8 text-surface-400">
            <i class="pi pi-spin pi-spinner text-xl" />
        </div>

        <p
            v-else-if="!comments.length"
            class="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center"
        >
            No comments yet. Notes left here stay with the case through every task.
        </p>

        <ul v-else class="flex flex-col gap-3 list-none p-0 m-0">
            <li
                v-for="comment in comments"
                :key="comment.id"
                class="flex gap-2.5"
            >
                <div
                    class="shrink-0 w-8 h-8 rounded-full bg-surface-100 dark:bg-zinc-800 text-xs font-semibold
                           text-surface-500 dark:text-zinc-300 flex items-center justify-center"
                >{{ initials(comment.author) }}</div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-2 flex-wrap">
                        <span class="text-sm font-medium text-(--layout-accent-color)">{{ comment.author }}</span>
                        <span class="text-xs text-surface-400">{{ formatDate(comment.createdAt) }}</span>
                        <Button
                            v-if="canDelete(comment)"
                            text
                            rounded
                            size="small"
                            severity="secondary"
                            icon="pi pi-trash"
                            aria-label="Delete comment"
                            class="ml-auto !w-7 !h-7"
                            @click="remove(comment)"
                        />
                    </div>
                    <p class="text-sm whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300 mt-0.5 mb-0">
                        {{ comment.body }}
                    </p>
                    <span v-if="comment.taskName" class="text-xs text-surface-400">
                        on {{ comment.taskName }}
                    </span>
                </div>
            </li>
        </ul>

        <Button
            v-if="hasMore"
            text
            size="small"
            severity="secondary"
            label="Load older comments"
            :loading="loading"
            @click="load(page + 1)"
        />
    </section>
</template>
