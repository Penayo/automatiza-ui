<script setup lang="ts">
/**
 * In-place re-authentication — docs/specs/authentication-and-sessions.spec.md §11 (D7).
 *
 * Shown when a request comes back 401 while a session is on screen. The point is
 * that the page underneath stays exactly as it was: an unsaved BPMN diagram, a
 * half-filled form, whatever the user was working on. They type their password,
 * the failed request replays, and work continues.
 *
 * Signing out is still offered, but it is the only path that discards work — so
 * it confirms first when an editor reports unsaved changes.
 */
import { ref, watch, nextTick } from 'vue';
import { Dialog, InputText, Password, Button, Message, useConfirm } from 'primevue';
import { reauthOpen, completeReauth, abandonReauth, hasUnsavedWork } from '@services/session';
import { navigateTo } from '@services/routerRef';
import { AuthService } from '@services/AuthService';
import { confirmIfDirty } from '@/utils/common';

const confirm = useConfirm();
const auth    = new AuthService();

const password  = ref('');
const error     = ref('');
const loading   = ref(false);
const passwordEl = ref<any>(null);

const access     = ref(auth.getAccessInfo());
const username   = ref('');
const tenantSlug = ref('');

// Refresh the identity each time the dialog opens — the stored session may have
// changed since this component mounted.
watch(reauthOpen, async (isOpen) => {
    if (!isOpen) return;

    access.value     = auth.getAccessInfo();
    username.value   = access.value?.user?.username ?? '';
    tenantSlug.value = localStorage.getItem('tenantSlug') ?? '';
    password.value   = '';
    error.value      = '';

    await nextTick();
    passwordEl.value?.$el?.querySelector('input')?.focus();
});

async function submit() {
    if (!password.value || loading.value) return;

    loading.value = true;
    error.value   = '';

    try {
        const result = await auth.login({
            tenantSlug: tenantSlug.value,
            username:   username.value,
            password:   password.value,
        });
        auth.saveAccessInfo(result);
        password.value = '';
        // Releases every caller waiting on this dialog; each replays its request.
        completeReauth();
    } catch (err: any) {
        error.value = err?.response?.data?.message ?? 'Could not sign you back in. Check your password.';
    } finally {
        loading.value = false;
    }
}

function signOut() {
    confirmIfDirty(
        confirm,
        hasUnsavedWork(),
        () => {
            abandonReauth();
            auth.logout();
            navigateTo('/login');
        },
        'You have unsaved changes on this page. Signing out will discard them. Sign out anyway?'
    );
}
</script>

<template>
    <Dialog
        :visible="reauthOpen"
        modal
        :closable="false"
        :close-on-escape="false"
        :draggable="false"
        header="Your session expired"
        class="w-full max-w-sm"
    >
        <form class="flex flex-col gap-4" @submit.prevent="submit">
            <p class="text-sm text-surface-600 dark:text-surface-300">
                Sign back in to continue. Nothing on this page has been lost — anything you were
                working on is still here.
            </p>

            <div v-if="username" class="text-sm">
                <span class="text-surface-500">Signed in as</span>
                <span class="font-medium"> {{ username }}</span>
                <span v-if="tenantSlug" class="text-surface-500"> · {{ tenantSlug }}</span>
            </div>

            <!-- The slug is normally known from login; ask only if it is missing
                 (e.g. a session predating this dialog). -->
            <InputText
                v-if="!tenantSlug"
                v-model="tenantSlug"
                placeholder="Organization"
                autocomplete="organization"
                class="w-full"
            />

            <Password
                ref="passwordEl"
                v-model="password"
                placeholder="Password"
                :feedback="false"
                toggle-mask
                fluid
                autocomplete="current-password"
            />

            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

            <div class="flex justify-between items-center gap-2">
                <Button
                    label="Sign out"
                    severity="secondary"
                    text
                    :disabled="loading"
                    @click="signOut"
                />
                <Button
                    type="submit"
                    label="Continue"
                    :loading="loading"
                    :disabled="!password"
                />
            </div>
        </form>
    </Dialog>
</template>
