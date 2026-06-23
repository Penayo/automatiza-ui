import { ref } from 'vue';
import { $api } from '@services/api';

// Module-level so Sidebar and Inbox page share the same reactive value
const unreadCount = ref(0);

async function refresh() {
    try {
        unreadCount.value = await $api.testEmailLogs.unreadCount();
    } catch {
        // badge is informational — silently ignore
    }
}

export function useTestEmailUnread() {
    return { unreadCount, refresh };
}
