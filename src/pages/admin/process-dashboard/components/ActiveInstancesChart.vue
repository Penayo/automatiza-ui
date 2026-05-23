<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { ActiveInstances } from '@services/ProcessDashboardService';

const props = defineProps<{ data: ActiveInstances[] }>();
const svgRef = ref<SVGElement | null>(null);

function draw() {
  if (!svgRef.value) return;
  const el = svgRef.value;
  const totalWidth = el.clientWidth || 400;
  const totalHeight = 220;
  const margin = { top: 16, right: 16, bottom: 60, left: 40 };
  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  d3.select(el).selectAll('*').remove();
  if (!props.data.length) return;

  const svg = d3.select(el)
    .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(props.data.map((d) => d.processName)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(props.data, (d) => d.count) ?? 1]).nice().range([height, 0]);

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-width))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'))
    .selectAll('text').attr('font-size', '11px').attr('fill', '#6b7280');

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text')
    .attr('font-size', '11px').attr('fill', '#6b7280').attr('dy', '1.2em')
    .attr('transform', 'rotate(-25)').style('text-anchor', 'end')
    .text((d) => d.length > 14 ? d.slice(0, 12) + '…' : d);

  svg.selectAll('.bar')
    .data(props.data).enter().append('rect')
    .attr('x', (d) => x(d.processName) ?? 0).attr('y', (d) => y(d.count))
    .attr('width', x.bandwidth()).attr('height', (d) => height - y(d.count))
    .attr('fill', '#3b82f6').attr('rx', 3);

  svg.selectAll('.label')
    .data(props.data).enter().append('text')
    .attr('x', (d) => (x(d.processName) ?? 0) + x.bandwidth() / 2).attr('y', (d) => y(d.count) - 4)
    .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', '#6b7280')
    .text((d) => d.count);
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
</script>

<template>
  <div class="w-full">
    <svg ref="svgRef" class="w-full" style="height: 220px"></svg>
    <div v-if="!data.length" class="text-center text-gray-400 text-sm mt-2">No active instances</div>
  </div>
</template>
