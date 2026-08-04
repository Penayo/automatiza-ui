<script setup lang="ts">
import { Select, MultiSelect } from 'primevue';
import type { SaveDatasourceDto } from '@services/DatasourcesService';
import type { IRole } from '@services/RoleService';

defineProps<{
  roleOptions: IRole[];
  writeOperationKeys: string[];
}>();

const form = defineModel<SaveDatasourceDto>('form', { required: true });
</script>

<template>
  <div class="flex flex-col gap-4">

    <div>
      <h3 class="text-sm font-semibold mb-2">Access Control</h3>
      <div>
        <label class="text-xs font-medium">Read roles</label>
        <MultiSelect
          v-model="form.permissions!.read" :options="roleOptions" option-label="key" option-value="key"
          display="chip" class="w-full" size="small" placeholder="Any authenticated user"
        />
      </div>

      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="text-xs font-medium">Create Operation</label>
          <Select v-model="form.createOperation" :options="writeOperationKeys" class="w-full" size="small"
                  showClear placeholder="none — create disabled" />
        </div>
        <div>
          <label class="text-xs font-medium">Create roles</label>
          <MultiSelect
            v-model="form.permissions!.create" :options="roleOptions" option-label="key" option-value="key"
            display="chip" class="w-full" size="small" placeholder="No one — disabled"
            :disabled="!form.createOperation"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="text-xs font-medium">Update Operation</label>
          <Select v-model="form.updateOperation" :options="writeOperationKeys" class="w-full" size="small"
                  showClear placeholder="none — update disabled" />
        </div>
        <div>
          <label class="text-xs font-medium">Update roles</label>
          <MultiSelect
            v-model="form.permissions!.update" :options="roleOptions" option-label="key" option-value="key"
            display="chip" class="w-full" size="small" placeholder="No one — disabled"
            :disabled="!form.updateOperation"
          />
        </div>
      </div>
      <small class="text-surface-400 block mt-2">
        Read defaults to any authenticated user when no roles are set. Create/Update default to
        <b>disabled</b> until both an operation and at least one role are set — the first capability
        here that actually mutates the remote system. There is no Update UI yet; the operation/roles
        are ready for when one ships.
      </small>
    </div>

  </div>
</template>
