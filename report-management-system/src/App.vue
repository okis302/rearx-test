<template>
  <div id="app">
    <nav>
      <router-link v-if="isAuthenticated" to="/">Home</router-link>
      <router-link v-if="isAuthenticated" to="/report/new" style="margin-left: 10px;">Create Report</router-link>
      <span v-if="isAuthenticated && currentUser" class="user-display">Welcome, {{ currentUser }}</span>
      <router-link v-if="!isAuthenticated" to="/login">Login</router-link>
      <a v-if="isAuthenticated" @click="handleLogout" href="#" class="logout-link">Logout</a>
    </nav>
    <div v-if="isLoading" class="loading-indicator">Loading...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <router-view
      v-if="!isLoading && !error"
      :reports="reports"
      :get-report-by-id="getReportById"
      :is-authenticated="isAuthenticated"
      :login-error="loginError"
      @save-report="handleSaveReport"
      @delete-report="handleDeleteReport"
      @login-attempt="handleLoginAttempt"
    />
  </div>
</template>

<script>
import axios from 'axios';

const API_URL = 'http://localhost:3001/reports';
const USERS_API_URL = 'http://localhost:3001/users'; // New API endpoint for users

export default {
  name: 'App',
  data() {
    return {
      reports: [],
      isLoading: false,
      error: null,
      isAuthenticated: false,
      loginError: null,
      currentUser: null // Store current user's name
    };
  },
  created() {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      this.isAuthenticated = true;
      this.currentUser = localStorage.getItem('currentUser');
      // Fetch reports if authenticated and on a route that needs them (or rely on guard + watch)
      if (this.$route.name === 'ReportList' || (this.$route.path === '/' && !this.$route.name)) { // '/' might not have a name before redirect
        this.fetchReports();
      }
    }
  },
  watch: {
    '$route'(to, from) {
      if (to.name === 'ReportList' && this.isAuthenticated) {
        this.fetchReports();
      }
      // Clear loginError when navigating away from login page
      if (to.name !== 'UserLogin') {
        this.loginError = null;
      }
    }
  },
  methods: {
    async fetchReports() {
      if (!this.isAuthenticated) {
          // This case should ideally be prevented by route guards for routes that need reports.
          // If somehow reached, clear reports and avoid API call.
          this.reports = [];
          this.isLoading = false; // Ensure loading is false if we skip fetching
          return;
      }

      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get(API_URL);
        this.reports = response.data;
      } catch (err) {
        console.error('Error fetching reports:', err);
        this.error = 'Failed to load reports. Ensure mock backend is running. (Try: npm run serve-json)';
      } finally {
        this.isLoading = false;
      }
    },
    getReportById(id) {
      const numericId = Number(id);
      return this.reports.find(report => report.id === numericId);
    },
    async handleSaveReport(reportData) {
      if (!this.isAuthenticated) {
        this.error = 'You must be logged in to save reports.';
        this.$router.push('/login');
        return;
      }
      this.isLoading = true;
      this.error = null;
      try {
        if (reportData.id && this.reports.some(r => r.id === reportData.id)) {
          const response = await axios.put(`${API_URL}/${reportData.id}`, reportData);
          const index = this.reports.findIndex(r => r.id === reportData.id);
          if (index !== -1) {
            this.reports.splice(index, 1, response.data);
          }
        } else {
          const response = await axios.post(API_URL, reportData);
          this.reports.push(response.data);
        }
        this.$router.push('/');
      } catch (err) {
        console.error('Error saving report:', err);
        this.error = 'Failed to save report.';
      } finally {
        this.isLoading = false;
      }
    },
    async handleDeleteReport(reportId) {
      if (!this.isAuthenticated) {
        this.error = 'You must be logged in to delete reports.';
        this.$router.push('/login');
        return;
      }
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
    },
    async handleLoginAttempt({ userId, password }) {
      this.loginError = null;
      this.isLoading = true;

      try {
        const response = await axios.get(USERS_API_URL, {
          params: {
            username: userId,
            password: password
          }
        });

        if (response.data && response.data.length > 0) {
          this.isAuthenticated = true;
          this.currentUser = response.data[0].username;
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('currentUser', this.currentUser);
          this.error = null;
          this.$router.push('/');
          this.fetchReports();
        } else {
          this.isAuthenticated = false;
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('currentUser');
          this.loginError = 'Invalid User ID or Password.';
        }
      } catch (err) {
        console.error('Error during login attempt:', err);
        this.isAuthenticated = false;
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        this.loginError = 'Login failed due to a server error. Please try again later.';
      } finally {
        this.isLoading = false;
      }
    },
    handleLogout() {
      this.isAuthenticated = false;
      this.currentUser = null;
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentUser');
      this.reports = [];
      this.loginError = null;
      this.$router.push('/login');
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
  display: flex; /* Use flexbox for alignment */
  justify-content: center;
  align-items: center;
}
nav a, .logout-link, .user-display { /* Apply common styling */
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
}
nav a.router-link-exact-active {
  color: #42b983;
}
.logout-link {
  cursor: pointer;
}
.logout-link:hover, nav a:hover:not(.router-link-exact-active) { /* Hover for non-active links */
  color: #42b983;
}
.user-display {
  font-style: italic; /* Differentiate user display */
  color: #555; /* Slightly different color */
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
  margin: 10px 20px; /* Add some margin */
}
</style>
