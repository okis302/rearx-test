<template>
  <div class="report-view" v-if="report">
    <h2>{{ report.title }}</h2>
    <p>{{ report.content }}</p>
    <button @click="closeView">Close</button>
  </div>
  <div v-else>
    <p>Report not found or loading...</p>
  </div>
</template>

<script>
export default {
  name: 'ReportView',
  props: {
    id: [String, Number], // Route param id
    getReportById: Function // Injected from App.vue
  },
  data() {
    return {
      report: null
    };
  },
  created() {
    if (this.id && this.getReportById) {
      this.report = this.getReportById(this.id);
    }
    if (!this.report && this.id) {
        // Handle case where report is not found, maybe navigate or show error
        console.warn(`Report with id ${this.id} not found.`);
        // this.$router.replace('/'); // Option: redirect
    }
  },
   watch: { // Watch for route changes if the same component instance is reused
    id(newId) {
      if (newId && this.getReportById) {
        this.report = this.getReportById(newId);
      } else {
        this.report = null;
      }
      if (!this.report && newId) {
        console.warn(`Report with id ${newId} not found after route change.`);
      }
    }
  },
  methods: {
    closeView() {
      this.$router.push('/'); // Or this.$router.go(-1) to go back
    }
  }
};
</script>

<style scoped>
.report-view {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
}
</style>
