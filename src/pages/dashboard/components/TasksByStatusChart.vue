<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { TasksByStatus } from '../../../services/DashboardService';

const props = defineProps<{ data: TasksByStatus[] }>();

const svgRef = ref<SVGElement | null>(null);

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  FAILED: '#ef4444',
  CREATED: '#3b82f6',
  SCHEDULED: '#f59e0b',
  WAITING: '#8b5cf6',
  CANCELLED: '#6b7280',
};

function draw() {
  if (!svgRef.value || !props.data.length) return;

  const el = svgRef.value;
  const width = el.clientWidth || 280;
  const height = 220;
  const radius = Math.min(width, height) / 2 - 10;
  const innerRadius = radius * 0.55;

  d3.select(el).selectAll('*').remove();

  const svg = d3
    .select(el)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const color = (status: string) => STATUS_COLORS[status] ?? '#94a3b8';

  const pie = d3.pie<TasksByStatus>().value((d) => d.count).sort(null);

  const arc = d3
    .arc<d3.PieArcDatum<TasksByStatus>>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const arcs = svg.selectAll('.arc').data(pie(props.data)).enter().append('g').attr('class', 'arc');

  arcs
    .append('path')
    .attr('d', arc)
    .attr('fill', (d) => color(d.data.status))
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  const total = d3.sum(props.data, (d) => d.count);

  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.2em')
    .attr('font-size', '1.75rem')
    .attr('font-weight', '700')
    .attr('fill', 'currentColor')
    .text(total);

  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.3em')
    .attr('font-size', '0.7rem')
    .attr('fill', '#6b7280')
    .text('total tasks');
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <svg ref="svgRef" class="w-full" style="height: 220px"></svg>
    <div v-if="!data.length" class="text-gray-400 text-sm">No data available</div>
    <div class="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm">
      <div v-for="item in data" :key="item.status" class="flex items-center gap-1.5">
        <span
          class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ backgroundColor: STATUS_COLORS[item.status] ?? '#94a3b8' }"
        ></span>
        <span class="text-gray-500 dark:text-gray-400">{{ item.status }}</span>
        <span class="font-semibold text-gray-700 dark:text-gray-200">{{ item.count }}</span>
      </div>
    </div>
  </div>
</template>
