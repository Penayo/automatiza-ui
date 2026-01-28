<template>
  <div class="dashboard">
    <div class="dashboard-cards">
      <Card v-for="card in cards" :key="card.title" :title="card.title" :value="card.value" :icon="card.icon" />
    </div>
    <div class="dashboard-charts">
      <div class="chart-section">
        <h3>Tasks per Process</h3>
        <svg ref="tasksPerProcessChart" width="600" height="300"></svg>
      </div>
      <div class="chart-section">
        <h3>Task Completion by User</h3>
        <svg ref="taskCompletionByUserChart" width="600" height="300"></svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import Card from './components/Card.vue';
import { DashboardService } from '../../../services/DashboardService';

const cards = ref([
    { title: 'Active Tasks', value: 0, icon: 'pi pi-clock' },
    { title: 'Completed Tasks', value: 0, icon: 'pi pi-check' },
    { title: 'Suspended Tasks', value: 0, icon: 'pi pi-ban' },
    { title: 'Total Processes', value: 0, icon: 'pi pi-sitemap' },
]);

const tasksPerProcessChart = ref(null);
const taskCompletionByUserChart = ref(null);

const chartData = ref({
    tasksPerProcess: [],
    taskCompletionByUser: [],
});

onMounted(async () => {
    const dashboardData = await DashboardService.getDashboardData();
    // Update cards
    cards.value[0].value = dashboardData.activeTasks;
    cards.value[1].value = dashboardData.completedTasks;
    cards.value[2].value = dashboardData.suspendedTasks;
    cards.value[3].value = dashboardData.totalProcesses;

    chartData.value.tasksPerProcess = dashboardData.tasksPerProcess;
    chartData.value.taskCompletionByUser = dashboardData.taskCompletionByUser;

    renderTasksPerProcessChart();
    renderTaskCompletionByUserChart();
});

function renderTasksPerProcessChart() {
    const svg = d3.select(tasksPerProcessChart.value);
    svg.selectAll('*').remove();
    const data = chartData.value.tasksPerProcess;
    if (!data.length) return;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(data.map(d => d.processName)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.taskCount)]).nice().range([height, 0]);
    g.append('g').call(d3.axisLeft(y));
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.processName))
        .attr('y', d => y(d.taskCount))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.taskCount))
        .attr('fill', '#42A5F5');
}

function renderTaskCompletionByUserChart() {
    const svg = d3.select(taskCompletionByUserChart.value);
    svg.selectAll('*').remove();
    const data = chartData.value.taskCompletionByUser;
    if (!data.length) return;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(data.map(d => d.username)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.completedTasks)]).nice().range([height, 0]);
    g.append('g').call(d3.axisLeft(y));
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.username))
        .attr('y', d => y(d.completedTasks))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.completedTasks))
        .attr('fill', '#66BB6A');
}
</script>

<style scoped>
.dashboard {
    padding: 2rem;
}
.dashboard-cards {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
}
.dashboard-charts {
    display: flex;
    gap: 2rem;
}
.chart-section {
    flex: 1;
}
</style>
