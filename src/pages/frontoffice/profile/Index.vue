<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { Password, Button, Message, Dialog } from 'primevue';
import { AuthService, type IProfile } from '@services/AuthService';

const router  = useRouter();
const toast   = useToast();
const auth    = new AuthService();

// ── Profile ────────────────────────────────────────────────────────────────
const profile = ref<IProfile | null>(null);
const loading = ref(true);

const fullName = computed(() => {
    const p: any = profile.value?.person;
    if (p?.firstName || p?.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    return '—';
});
const initial = computed(() => (profile.value?.username ?? '?').charAt(0).toUpperCase());

// ── Change password modal ─────────────────────────────────────────────────────
const dialogOpen      = ref(false);
const currentPassword = ref('');
const newPassword     = ref('');
const confirmPassword = ref('');
const submitting      = ref(false);
const formError       = ref('');

const canSubmit = computed(() =>
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    confirmPassword.value.length > 0 &&
    !submitting.value
);

function openDialog() {
    currentPassword.value = '';
    newPassword.value     = '';
    confirmPassword.value = '';
    formError.value       = '';
    dialogOpen.value      = true;
}

async function loadProfile() {
    loading.value = true;
    try {
        profile.value = await auth.getProfile();
    } catch {
        toast.add({ severity: 'error', summary: 'Could not load profile', detail: 'Please try again later.', life: 4000 });
    } finally {
        loading.value = false;
    }
}

async function submit() {
    formError.value = '';

    if (newPassword.value.length < 8) {
        formError.value = 'New password must be at least 8 characters.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        formError.value = 'New password and confirmation do not match.';
        return;
    }
    if (newPassword.value === currentPassword.value) {
        formError.value = 'New password must be different from the current one.';
        return;
    }

    submitting.value = true;
    try {
        await auth.changePassword({
            currentPassword: currentPassword.value,
            newPassword:     newPassword.value,
        });

        dialogOpen.value = false;
        toast.add({
            severity: 'success',
            summary:  'Password changed',
            detail:   'Please sign in again with your new password.',
            life:     3000,
        });

        // Force re-login: clear local auth state and send back to /login.
        setTimeout(() => {
            auth.logout();
            router.push('/login');
        }, 1500);
    } catch (err: any) {
        const status = err?.response?.status;
        formError.value = status === 401
            ? 'Your current password is incorrect.'
            : 'Could not change the password. Please try again.';
    } finally {
        submitting.value = false;
    }
}

onMounted(loadProfile);
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 flex flex-col gap-6">
    <h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Profile</h1>

    <!-- Profile card -->
    <section class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div v-if="loading" class="text-zinc-500">Loading…</div>
      <div v-else-if="profile" class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-xl font-bold text-zinc-700 dark:text-zinc-200">
          {{ initial }}
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-400">Username</dt>
            <dd class="text-zinc-900 dark:text-zinc-100 font-medium">{{ profile.username }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-400">Full name</dt>
            <dd class="text-zinc-900 dark:text-zinc-100 font-medium">{{ fullName }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-400">Email</dt>
            <dd class="text-zinc-900 dark:text-zinc-100 font-medium">{{ profile.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-400">Roles</dt>
            <dd class="text-zinc-900 dark:text-zinc-100 font-medium">{{ profile.roles?.join(', ') || '—' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Security actions -->
    <section class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Password</h2>
        <p class="text-sm text-zinc-500">Change the password you use to sign in.</p>
      </div>
      <Button label="Change password" icon="pi pi-key" severity="secondary" @click="openDialog" />
    </section>

    <!-- Change password modal -->
    <Dialog
      v-model:visible="dialogOpen"
      modal
      header="Change password"
      :style="{ width: '26rem' }"
      :breakpoints="{ '640px': '95vw' }"
      :closable="!submitting"
    >
      <p class="text-sm text-zinc-500 mb-4">You'll be signed out and asked to log in again after changing it.</p>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current password</label>
          <Password v-model="currentPassword" :feedback="false" toggleMask fluid autocomplete="current-password" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">New password</label>
          <Password v-model="newPassword" toggleMask fluid autocomplete="new-password" />
          <span class="text-xs text-zinc-400">At least 8 characters.</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm new password</label>
          <Password v-model="confirmPassword" :feedback="false" toggleMask fluid autocomplete="new-password" />
        </div>

        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>

        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" severity="secondary" label="Cancel" :disabled="submitting" @click="dialogOpen = false" />
          <Button type="submit" label="Change password" :loading="submitting" :disabled="!canSubmit" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
