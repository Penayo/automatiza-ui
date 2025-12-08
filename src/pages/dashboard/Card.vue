<template>
  <div class="dashboard-card">
    <i :class="icon" class="dashboard-card-icon" />
    <div class="dashboard-card-content">
      <div class="dashboard-card-title">{{ title }}</div>
      <div class="dashboard-card-value">{{ value }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String,
});
</script>

<style scoped>
.dashboard-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  min-width: 180px;
}
.dashboard-card-icon {
  font-size: 2.5rem;
  color: #1976d2;
  margin-right: 1.5rem;
}
.dashboard-card-content {
  display: flex;
  flex-direction: column;
}
.dashboard-card-title {
  font-size: 1rem;
  color: #888;
}
.dashboard-card-value {
  font-size: 2rem;
  font-weight: bold;
  color: #222;
}
</style>
