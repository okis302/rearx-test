<template>
  <div class="report-list">
    <h2>Reports</h2>
    <button @click="navigateToCreate" class="create-btn">Create New Report</button>
    <ul>
      <li v-for="report in reports" :key="report.id">
        <span>{{ report.title }}</span>
        <div>
          <button @click="navigateToView(report.id)">View</button>
          <button @click="navigateToEdit(report.id)">Edit</button>
          <button @click="confirmDelete(report.id)">Delete</button>
        </div>
      </li>
    </ul>
    <p v-if="!reports.length">No reports available. Create one!</p>
  </div>
</template>

<script>
export default {
  name: 'ReportList',
  props: {
    reports: {
      type: Array,
      required: true
    }
  },
  emits: ['delete-report'], // Vue 3 style event declaration
  methods: {
    navigateToView(reportId) {
      this.$router.push({ name: 'ReportView', params: { id: reportId } });
    },
    navigateToEdit(reportId) {
      this.$router.push({ name: 'ReportEdit', params: { id: reportId } });
    },
    navigateToCreate() {
      this.$router.push({ name: 'ReportCreate' });
    },
    confirmDelete(reportId) { // Renamed from deleteReport to avoid confusion with emit
      if (window.confirm('Are you sure you want to delete this report?')) {
        this.$emit('delete-report', reportId);
      }
    }
    // Removed old viewReport, editReport, createReport methods
  }
};
</script>

<style scoped>
.report-list {
  margin: 20px;
}
.report-list ul {
  list-style-type: none;
  padding: 0;
}
.report-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.report-list button {
  margin-left: 10px;
}
.create-btn {
  margin-bottom: 15px;
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}
.report-list li div {
  display: flex;
  gap: 5px; /* Adds space between buttons */
}
</style>
