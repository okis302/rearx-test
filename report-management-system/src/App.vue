<template>
  <div id="app">
    <nav>
      <router-link to="/">Home (Report List)</router-link> |
      <router-link to="/report/new">Create Report</router-link>
    </nav>
    <div v-if="isLoading" class="loading-indicator">Loading reports...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <router-view
      v-if="!isLoading && !error"
      :reports="reports"
      :get-report-by-id="getReportById"
      @save-report="handleSaveReport"
      @delete-report="handleDeleteReport"
    />
  </div>
</template>

<script>
import axios from 'axios'; // Import axios

const API_URL = 'http://localhost:3001/reports'; // Base URL for json-server

export default {
  name: 'App',
  data() {
    return {
      reports: [], // Initialize as empty, will be fetched
      isLoading: false,
      error: null,
    };
  },
  created() {
    this.fetchReports();
  },
  methods: {
    async fetchReports() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get(API_URL);
        this.reports = response.data;
      } catch (err) {
        console.error('Error fetching reports:', err);
        this.error = 'Failed to load reports. Make sure the mock backend is running. (npm run serve-json)';
      } finally {
        this.isLoading = false;
      }
    },
    getReportById(id) {
      const numericId = Number(id);
      return this.reports.find(report => report.id === numericId);
    },
    async handleSaveReport(reportData) {
      this.isLoading = true;
      this.error = null;
      try {
        if (reportData.id && this.reports.some(r => r.id === reportData.id)) {
          // Existing report (check based on presence in local array AND having an id)
          const response = await axios.put(`${API_URL}/${reportData.id}`, reportData);
          const index = this.reports.findIndex(r => r.id === reportData.id);
          if (index !== -1) {
            this.reports.splice(index, 1, response.data);
          }
        } else {
          // New report
          // Ensure ID is not sent if backend auto-generates it; json-server can handle it or ignore.
          // If reportData comes with an ID from ReportEdit (e.g. Date.now()), json-server will use it.
          const response = await axios.post(API_URL, reportData);
          this.reports.push(response.data);
        }
        this.$router.push('/'); // Navigate back to list after save
      } catch (err) {
        console.error('Error saving report:', err);
        this.error = 'Failed to save report.';
      } finally {
        this.isLoading = false;
      }
    },
    async handleDeleteReport(reportId) {
      this.isLoading = true;
      this.error = null;
      try {
        await axios.delete(`${API_URL}/${reportId}`);
        this.reports = this.reports.filter(report => report.id !== reportId);
        if (this.$route.params.id && Number(this.$route.params.id) === reportId) {
          this.$router.push('/');
        }
      } catch (err) {
        console.error('Error deleting report:', err);
        this.error = 'Failed to delete report.';
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
}
nav {
  padding: 15px;
  background-color: #f0f0f0;
  margin-bottom: 20px;
}
nav a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
}
nav a.router-link-exact-active {
  color: #42b983;
}
.loading-indicator {
  padding: 20px;
  font-size: 1.2em;
  color: #3498db;
}
.error-message {
  padding: 20px;
  font-size: 1.2em;
  color: #e74c3c;
  background-color: #fdd;
  border: 1px solid #e74c3c;
  border-radius: 5px;
}
</style>
