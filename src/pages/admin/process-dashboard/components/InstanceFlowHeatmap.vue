<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { HeatmapCell } from '@services/ProcessDashboardService';

const props = defineProps<{ data: HeatmapCell[] }>();
const svgRef = ref<SVGElement | null>(null);

function draw() {
  if (!svgRef.value || !props.data.length) return;
  const el = svgRef.value;

  const processes = [...new Set(props.data.map((d) => d.processName))];
  const tasks = [...new Set(props.data.map((d) => d.taskName))];

  const cellW = Math.max(60, Math.min(120, (el.clientWidth - 160) / processes.length));
  const cellH = 28;
  const marginLeft = 160;
  const marginTop = 60;
  const totalWidth = marginLeft + processes.length * cellW + 20;
  const totalHeight = marginTop + tasks.length * cellH + 20;

  d3.select(el).selectAll('*').remove();
  d3.select(el).attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

  const svg = d3.select(el).append('g').attr('transform', `translate(${marginLeft},${marginTop})`);

  const maxCount = d3.max(props.data, (d) => d.count) ?? 1;
  const color = d3.scaleSequential(d3.interpolateGreens).domain([0, maxCount]);

  const xScale = d3.scaleBand().domain(processes).range([0, processes.length * cellW]).padding(0.05);
  const yScale = d3.scaleBand().domain(tasks).range([0, tasks.length * cellH]).padding(0.05);

  // Cells
  svg.selectAll('.cell')
    .data(props.data).enter().append('rect')
    .attr('x', (d) => xScale(d.processName) ?? 0)
    .attr('y', (d) => yScale(d.taskName) ?? 0)
    .attr('width', xScale.bandwidth()).attr('height', yScale.bandwidth())
    .attr('fill', (d) => color(d.count)).attr('rx', 3);

  // Count label inside cell
  svg.selectAll('.cell-label')
    .data(props.data).enter().append('text')
    .attr('x', (d) => (xScale(d.processName) ?? 0) + xScale.bandwidth() / 2)
    .attr('y', (d) => (yScale(d.taskName) ?? 0) + yScale.bandwidth() / 2 + 4)
    .attr('text-anchor', 'middle').attr('font-size', '10px')
    .attr('fill', (d) => (d.count > maxCount * 0.6 ? '#fff' : '#374151'))
    .text((d) => d.count);

  // X axis — process names (rotated)
  svg.append('g')
    .call(d3.axisTop(xScale).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text')
    .attr('font-size', '11px').attr('fill', '#374151')
    .attr('transform', 'rotate(-35)').style('text-anchor', 'start')
    .text((d) => d.length > 14 ? d.slice(0, 12) + '…' : d);

  // Y axis — task names
  svg.append('g')
    .call(d3.axisLeft(yScale).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text')
    .attr('font-size', '11px').attr('fill', '#374151')
    .text((d) => d.length > 22 ? d.slice(0, 20) + '…' : d);
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
</script>

<template>
  <div class="w-full overflow-x-auto">
    <svg ref="svgRef" class="w-full min-w-[400px]"></svg>
    <div v-if="!data.length" class="text-center text-gray-400 text-sm mt-2">No task flow data for this period</div>
  </div>
</template>
