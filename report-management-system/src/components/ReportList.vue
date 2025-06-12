<template>
  <div class="report-list">
    <h2>Reports</h2>
    <button
      v-if="canManageReports"
      @click="navigateToCreate"
      class="create-btn">
      Create New Report
    </button>
    <ul>
      <li v-for="report in reports" :key="report.id">
        <span>{{ report.title }}</span>
        <div v-if="canManageReports"> {/* Group buttons for admins */}
          <button @click="navigateToView(report.id)">View</button>
          <button @click="navigateToEdit(report.id)">Edit</button>
          <button @click="confirmDelete(report.id)">Delete</button>
        </div>
        <div v-else> {/* Just view button for general users */}
          <button @click="navigateToView(report.id)">View</button>
        </div>
      </li>
    </ul>
    <p v-if="!reports.length">No reports available. <span v-if="canManageReports">Create one!</span></p>
  </div>
</template>

<script>
export default {
  name: 'ReportList',
  props: {
    reports: {
      type: Array,
      required: true
    },
    currentUser: { // Accept currentUser prop
      type: Object,
      default: null
    }
  },
  emits: ['delete-report'],
  computed: {
    canManageReports() {
      return this.currentUser && this.currentUser.role === 'administrator';
    }
  },
  methods: {
    navigateToView(reportId) {
      this.$router.push({ name: 'ReportView', params: { id: reportId } });
    },
    navigateToEdit(reportId) {
      if (!this.canManageReports) return;
      this.$router.push({ name: 'ReportEdit', params: { id: reportId } });
    },
    navigateToCreate() {
      if (!this.canManageReports) return;
      this.$router.push({ name: 'ReportCreate' });
    },
    confirmDelete(reportId) {
      if (!this.canManageReports) return;
      if (window.confirm('Are you sure you want to delete this report?')) {
        this.$emit('delete-report', reportId);
      }
    }
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
.report-list button { /* General button styling within list items */
  margin-left: 10px;
}
.create-btn { /* Specific styling for the main create button */
  margin-bottom: 15px;
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  margin-left: 0; /* Override general button margin if needed */
}
.report-list li div {
  display: flex;
  gap: 5px;
}
</style>
