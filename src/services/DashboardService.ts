import axios from 'axios';

export const DashboardService = {

    async getDashboardData() {
        // Mocked dashboard data
        return {
            activeTasks: 12,
            completedTasks: 34,
            suspendedTasks: 3,
            totalProcesses: 7,
            tasksPerProcess: [
                { processName: 'Onboarding', taskCount: 8 },
                { processName: 'Claims', taskCount: 5 },
                { processName: 'Payments', taskCount: 2 },
                { processName: 'Support', taskCount: 4 },
            ],
            taskCompletionByUser: [
                { username: 'alice', completedTasks: 10 },
                { username: 'bob', completedTasks: 7 },
                { username: 'carol', completedTasks: 12 },
                { username: 'dave', completedTasks: 5 },
            ],
        }
    },
};
