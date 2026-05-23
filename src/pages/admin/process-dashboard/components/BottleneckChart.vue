<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { Bottleneck } from '@services/ProcessDashboardService';

const props = defineProps<{ data: Bottleneck[] }>();
const svgRef = ref<SVGElement | null>(null);

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function draw() {
  if (!svgRef.value || !props.data.length) return;
  const el = svgRef.value;
  const totalWidth = el.clientWidth || 400;
  const rowH = 34;
  const totalHeight = props.data.length * rowH + 40;
  const margin = { top: 10, right: 80, bottom: 10, left: 140 };
  const width = totalWidth - margin.left - margin.right;

  d3.select(el).selectAll('*').remove();
  d3.select(el).attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

  const svg = d3.select(el).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(props.data.map((d) => d.taskName)).range([0, props.data.length * rowH]).padding(0.35);
  const x = d3.scaleLinear().domain([0, d3.max(props.data, (d) => d.avgMs) ?? 1]).range([0, width]);

  const color = d3.scaleSequential(d3.interpolateOranges).domain([0, d3.max(props.data, (d) => d.avgMs) ?? 1]);

  svg.selectAll('.bar')
    .data(props.data).enter().append('rect')
    .attr('y', (d) => y(d.taskName) ?? 0).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', (d) => x(d.avgMs))
    .attr('fill', (d) => color(d.avgMs)).attr('rx', 3);

  svg.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text').attr('font-size', '11px').attr('fill', '#374151')
    .text((d) => d.length > 20 ? d.slice(0, 18) + '…' : d);

  svg.selectAll('.val-label')
    .data(props.data).enter().append('text')
    .attr('x', (d) => x(d.avgMs) + 6).attr('y', (d) => (y(d.taskName) ?? 0) + y.bandwidth() / 2 + 4)
    .attr('font-size', '11px').attr('fill', '#6b7280')
    .text((d) => fmt(d.avgMs));
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
</script>

<template>
  <div class="w-full">
    <svg ref="svgRef" class="w-full"></svg>
    <div v-if="!data.length" class="text-center text-gray-400 text-sm mt-2">No completed tasks in selected period</div>
  </div>
</template>
