<template>
  <div class="report-edit">
    <h2>{{ editing ? 'Edit Report' : 'Create Report' }}</h2>
    <form @submit.prevent="saveReportForm">
      <div>
        <label for="title">Title:</label>
        <input type="text" id="title" v-model="reportData.title" required />
      </div>
      <div>
        <label for="content">Content:</label>
        <textarea id="content" v-model="reportData.content" required></textarea>
      </div>
      <button type="submit">Save Report</button>
      <button type="button" @click="cancelEdit">Cancel</button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'ReportEdit',
  props: {
    id: [String, Number], // From route param
    getReportById: Function, // Injected from App.vue
  },
  emits: ['save-report'],
  data() {
    return {
      reportData: { title: '', content: '' },
      editing: false
    };
  },
  created() {
    this.loadReport();
  },
  watch: {
    // Watch for route param changes if the component instance is reused (e.g. navigating from edit to create)
    id: 'loadReport'
  },
  methods: {
    loadReport() {
      if (this.id && this.getReportById) {
        const existingReport = this.getReportById(this.id);
        if (existingReport) {
          this.reportData = { ...existingReport };
          this.editing = true;
        } else {
          console.warn(`Report with id ${this.id} not found for editing.`);
          // Optional: redirect if report not found, though App.vue might handle this better
          // this.$router.replace('/');
          // For now, allow creating a new one if ID is somehow invalid
          this.reportData = { title: '', content: '' };
          this.editing = false;
        }
      } else {
        this.reportData = { title: '', content: '' }; // Reset for new report
        this.editing = false;
      }
    },
    saveReportForm() { // Renamed from saveReport to avoid conflict with emit name
      const reportToSave = {
        ...this.reportData,
        // Ensure ID is present for saving. If new, generate it.
        // App.vue's handleSaveReport also has a fallback for ID.
        id: this.editing ? this.reportData.id : (this.reportData.id || Date.now())
      };
      this.$emit('save-report', reportToSave);
      // App.vue will handle navigation after saving
    },
    cancelEdit() {
      if (this.editing && this.id) {
        this.$router.push({ name: 'ReportView', params: { id: this.id } });
      } else {
        this.$router.push('/');
      }
    }
  }
};
</script>

<style scoped>
.report-edit {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
}
.report-edit div {
  margin-bottom: 10px;
}
.report-edit label {
  display: block;
  margin-bottom: 5px;
}
.report-edit input[type="text"],
.report-edit textarea {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.report-edit button {
  margin-right: 10px;
}
</style>
