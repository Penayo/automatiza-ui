<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { FailureRate } from '../../../services/ProcessDashboardService';

const props = defineProps<{ data: FailureRate[] }>();
const svgRef = ref<SVGElement | null>(null);

function draw() {
  if (!svgRef.value || !props.data.length) return;
  const el = svgRef.value;
  const totalWidth = el.clientWidth || 400;
  const rowH = 34;
  const totalHeight = props.data.length * rowH + 40;
  const margin = { top: 10, right: 60, bottom: 10, left: 140 };
  const width = totalWidth - margin.left - margin.right;

  d3.select(el).selectAll('*').remove();
  d3.select(el).attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

  const svg = d3.select(el).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(props.data.map((d) => d.processName)).range([0, props.data.length * rowH]).padding(0.35);
  const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

  const color = d3.scaleSequential(d3.interpolateReds).domain([0, 100]);

  // Background track
  svg.selectAll('.track')
    .data(props.data).enter().append('rect')
    .attr('y', (d) => y(d.processName) ?? 0).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', width).attr('fill', '#f3f4f6').attr('rx', 4);

  // Failure bar
  svg.selectAll('.bar')
    .data(props.data).enter().append('rect')
    .attr('y', (d) => y(d.processName) ?? 0).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', (d) => x(d.failureRate))
    .attr('fill', (d) => color(d.failureRate)).attr('rx', 4);

  svg.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text').attr('font-size', '11px').attr('fill', '#374151')
    .text((d) => d.length > 18 ? d.slice(0, 16) + '…' : d);

  svg.selectAll('.pct-label')
    .data(props.data).enter().append('text')
    .attr('x', (d) => x(d.failureRate) + 6).attr('y', (d) => (y(d.processName) ?? 0) + y.bandwidth() / 2 + 4)
    .attr('font-size', '11px').attr('fill', '#6b7280')
    .text((d) => `${d.failureRate.toFixed(1)}%`);
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
</script>

<template>
  <div class="w-full">
    <svg ref="svgRef" class="w-full"></svg>
    <div v-if="!data.length" class="text-center text-gray-400 text-sm mt-2">No data for this period</div>
  </div>
</template>
