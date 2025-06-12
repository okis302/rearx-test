<template>
  <div id="app">
    <nav>
      <router-link v-if="isAuthenticated" to="/">Home (Report List)</router-link>
      <router-link
        v-if="isAdmin"
        to="/report/new"
        style="margin-left: 10px;">
        Create Report
      </router-link>
      <router-link
        v-if="isAdmin"
        to="/admin/users"
        style="margin-left: 10px;">
        User Management
      </router-link>
      <span v-if="isAuthenticated && currentUser" class="user-display">Welcome, {{ currentUser.username }} ({{ currentUser.role }})</span>
      <router-link v-if="!isAuthenticated" to="/login">Login</router-link>
      <a v-if="isAuthenticated" @click="handleLogout" href="#" class="logout-link">Logout</a>
    </nav>

    <div v-if="isLoading || isLoadingUsers" class="loading-indicator">Loading data...</div>
    <div v-if="error || userError" class="error-message">{{ error || userError }}</div>

    <router-view
      v-if="!(isLoading || isLoadingUsers) && !(error || userError)"
      :reports="reports"
      :users="users"
      :get-report-by-id="getReportById"
      :get-user-by-id="getUserById"
      :is-authenticated="isAuthenticated"
      :login-error="loginError"
      :current-user="currentUser"
      :user-to-edit="selectedUserForEdit"
      :is-loading-users="isLoadingUsers"
      :form-error="userError"
      @save-report="handleSaveReport"
      @delete-report="handleDeleteReport"
      @login-attempt="handleLoginAttempt"
      @save-user="handleSaveUser"
      @delete-user="handleDeleteUser"
      @fetch-users="fetchUsers"
    />
  </div>
</template>

<script>
import axios from 'axios';
const REPORTS_API_URL = 'http://localhost:3001/reports';
const USERS_API_URL = 'http://localhost:3001/users';

export default {
  name: 'App',
  data() {
    return {
      reports: [],
      users: [],
      isLoading: false,
      isLoadingUsers: false,
      error: null,
      userError: null,
      isAuthenticated: false,
      loginError: null,
      currentUser: null
    };
  },
  computed: {
    isAdmin() {
      return this.isAuthenticated && this.currentUser && this.currentUser.role === 'administrator';
    },
    selectedUserForEdit() {
      if (this.$route.name === 'UserEdit' && this.$route.params.id) {
        return this.users.find(u => u.id === Number(this.$route.params.id));
      }
      return null;
    }
  },
  created() {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    if (authStatus) {
      this.isAuthenticated = true;
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
        } catch (e) {
          console.error('Error parsing stored user data:', e);
          localStorage.removeItem('currentUser');
          this.currentUser = null;
        }
      }
      if (this.$route.name === 'ReportList' || this.$route.path === '/') {
         this.fetchReports();
      } else if (this.$route.name === 'UserList') {
         if (this.isAdmin) { this.fetchUsers(); }
      }
    }
  },
  watch: {
    '$route'(to, from) {
      this.error = null; // Clear general errors on route change
      this.userError = null; // Clear user-specific errors on route change

      if (to.name === 'ReportList' && this.isAuthenticated) {
        this.fetchReports();
      }
      if (to.name === 'UserList' && this.isAdmin) {
        this.fetchUsers();
      }
    }
  },
  methods: {
    // --- Report Methods ---
    async fetchReports() {
      if (!this.isAuthenticated) { this.reports = []; return; }
      this.isLoading = true; this.error = null;
      try {
        const response = await axios.get(REPORTS_API_URL);
        this.reports = response.data;
      } catch (err) {
        console.error('Error fetching reports:', err);
        this.error = 'Failed to load reports. Ensure mock backend is running.';
      } finally {
        this.isLoading = false;
      }
    },
    getReportById(id) {
      const numericId = Number(id);
      return this.reports.find(report => report.id === numericId);
    },
    async handleSaveReport(reportData) {
        if (!this.isAdmin) { this.error = 'You do not have permission to save reports.'; return; }
        this.isLoading = true; this.error = null;
        try {
            if (reportData.id && this.reports.some(r => r.id === reportData.id)) {
                const response = await axios.put(`${REPORTS_API_URL}/${reportData.id}`, reportData);
                const index = this.reports.findIndex(r => r.id === reportData.id);
                if (index !== -1) this.reports.splice(index, 1, response.data);
            } else {
                const response = await axios.post(REPORTS_API_URL, reportData);
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
        if (!this.isAdmin) { this.error = 'You do not have permission to delete reports.'; return; }
        this.isLoading = true; this.error = null;
        try {
            await axios.delete(`${REPORTS_API_URL}/${reportId}`);
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

    // --- Auth Methods ---
    async handleLoginAttempt({ userId, password }) {
      this.loginError = null; this.isLoading = true;
      try {
        const response = await axios.get(USERS_API_URL, { params: { username: userId, password: password } });
        if (response.data && response.data.length > 0) {
          const user = response.data[0];
          this.isAuthenticated = true;
          this.currentUser = { id: user.id, username: user.username, role: user.role }; // Store id, username, role
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          this.error = null; this.userError = null;
          this.$router.push('/');
          this.fetchReports();
        } else {
          this.isAuthenticated = false; this.currentUser = null;
          localStorage.removeItem('isAuthenticated'); localStorage.removeItem('currentUser');
          this.loginError = 'Invalid User ID or Password.';
        }
      } catch (err) {
        console.error('Error during login attempt:', err);
        this.isAuthenticated = false; this.currentUser = null;
        localStorage.removeItem('isAuthenticated'); localStorage.removeItem('currentUser');
        this.loginError = 'Login failed. Please try again later.';
      } finally {
        this.isLoading = false;
      }
    },
    handleLogout() {
      this.isAuthenticated = false; this.currentUser = null;
      localStorage.removeItem('isAuthenticated'); localStorage.removeItem('currentUser');
      this.reports = []; this.users = [];
      this.loginError = null; this.error = null; this.userError = null;
      this.$router.push('/login');
    },

    // --- User Management Methods ---
    async fetchUsers() {
      if (!this.isAdmin) {
        this.userError = "You don't have permission to view users.";
        this.users = [];
        return;
      }
      this.isLoadingUsers = true; this.userError = null;
      try {
        const response = await axios.get(USERS_API_URL);
        this.users = response.data;
      } catch (err) {
        console.error('Error fetching users:', err);
        this.userError = 'Failed to load users.';
      } finally {
        this.isLoadingUsers = false;
      }
    },
    getUserById(userId) {
      const numericId = Number(userId);
      return this.users.find(user => user.id === numericId);
    },
    async handleSaveUser(userData) {
      if (!this.isAdmin) {
        this.userError = 'You do not have permission to save users.';
        return;
      }
      this.isLoadingUsers = true; this.userError = null;
      try {
        let response;
        if (userData.id) {
          response = await axios.put(`${USERS_API_URL}/${userData.id}`, userData);
          const index = this.users.findIndex(u => u.id === userData.id);
          if (index !== -1) this.users.splice(index, 1, response.data);
        } else {
          response = await axios.post(USERS_API_URL, userData);
          this.users.push(response.data);
        }
        this.$router.push({ name: 'UserList' });
      } catch (err) {
        console.error('Error saving user:', err);
        this.userError = `Failed to save user: ${err.response?.data?.message || err.message}`;
      } finally {
        this.isLoadingUsers = false;
      }
    },
    async handleDeleteUser(userId) {
      if (!this.isAdmin) {
        this.userError = 'You do not have permission to delete users.';
        return;
      }
      if (this.currentUser && this.currentUser.id === userId) {
          this.userError = "You cannot delete your own account via this interface.";
          return;
      }
      this.isLoadingUsers = true; this.userError = null;
      try {
        await axios.delete(`${USERS_API_URL}/${userId}`);
        this.users = this.users.filter(user => user.id !== userId);
        if (this.$route.name === 'UserEdit' && Number(this.$route.params.id) === userId) {
            this.$router.push({ name: 'UserList'});
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        this.userError = 'Failed to delete user.';
      } finally {
        this.isLoadingUsers = false;
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
  display: flex;
  justify-content: center;
  align-items: center;
}
nav a, .logout-link, .user-display {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
  vertical-align: middle;
}
nav a.router-link-exact-active {
  color: #42b983;
}
.logout-link {
  cursor: pointer;
}
.logout-link:hover, nav a:hover:not(.router-link-exact-active) {
  color: #42b983;
}
.user-display {
  color: #555;
  margin-left: 15px;
}
.loading-indicator {
  padding: 20px; font-size: 1.2em; color: #3498db;
}
.error-message {
  padding: 20px; font-size: 1.2em; color: #e74c3c;
  background-color: #fdd; border: 1px solid #e74c3c; border-radius: 5px;
  margin: 10px 20px;
}
</style>
