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
      <button v-if="isAuthenticated" @click="callTestApi" style="margin-left: 15px;">Test Secured API</button>
      <span v-if="isAuthenticated && currentUserInfo" class="user-display">
        Welcome, {{ currentUserInfo.username }} ({{ currentUserInfo.role }})
      </span>
      <router-link v-if="!isAuthenticated" to="/login">Login</router-link>
      <a v-if="isAuthenticated" @click="handleLogout" href="#" class="logout-link">Logout</a>
    </nav>
    <div v-if="testApiResponse">
      <h4>Test API Response:</h4>
      <pre>{{ testApiResponse }}</pre>
    </div>
    <div v-if="testApiError" class="error-message">
      <h4>Test API Error:</h4>
      <pre>{{ testApiError }}</pre>
    </div>

    <div v-if="appLoading || isLoading || isLoadingUsers" class="loading-indicator">Loading data...</div>
    <div v-if="error || userError" class="error-message">{{ error || userError }}</div>

    <router-view
      v-if="!appLoading && !(isLoading || isLoadingUsers) && !(error || userError)"
      :reports="reports"
      :users="users"
      :get-report-by-id="getReportById"
      :get-user-by-id="getUserById"
      :is-authenticated="isAuthenticated"
      :current-user="currentUserInfo"
      :user-to-edit="selectedUserForEdit"
      :is-loading-users="isLoadingUsers"
      :form-error="userError || loginError"
      @save-report="handleSaveReport"
      @delete-report="handleDeleteReport"
      @save-user="handleSaveUser"
      @delete-user="handleDeleteUser"
      @fetch-users="fetchUsers"

    />
  </div>
</template>

<script>
import { Auth, Hub } from 'aws-amplify';
import axios from 'axios';
// === UPDATE THIS URL ===
const REPORTS_API_URL = 'https://REPLACE_ME_your-api-id.execute-api.your-region.amazonaws.com/your-stage/reports';
const USERS_API_URL = 'http://localhost:3001/users'; // This will be updated in Phase 3
const TEST_API_URL = 'https://REPLACE_ME_xxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello';

export default {
  name: 'App',
  data() {
    return {
      isAuthenticated: false,
      currentUserInfo: null,
      appLoading: true,
      reports: [],
      users: [],
      isLoading: false, // For reports loading
      isLoadingUsers: false,
      error: null,
      userError: null,
      loginError: null,
      // New data properties for test API call
      testApiResponse: null,
      testApiError: null
    };
  },
  computed: {
    isAdmin() {
      return this.isAuthenticated && this.currentUserInfo && this.currentUserInfo.role === 'administrator';
    },
    selectedUserForEdit() {
      if (this.$route.name === 'UserEdit' && this.$route.params.id && this.users.length) {
        // Ensure users are loaded before trying to find one
        return this.users.find(u => u.id === Number(this.$route.params.id));
      }
      return null;
    }
  },
  created() {
    this.checkAuthState();
    Hub.listen('auth', (data) => {
      const { payload } = data;
      switch (payload.event) {
        case 'signIn':
          console.log('User signed in via Hub');
          this.setCurrentUserInfo(payload.data);
          this.isAuthenticated = true;
          this.loginError = null; // Clear any previous login errors passed to UserLogin
          this.$router.push('/');
          // Data fetching (reports/users) will be triggered by route watchers or created hooks of child components
          // or by explicit calls if needed here. For instance, fetching reports on sign-in.
          this.fetchReports(); // Fetch reports after successful sign-in
          if(this.isAdmin && this.$route.name === 'UserList') { // If landed on UserList & is admin
            this.fetchUsers();
          }
          break;
        case 'signOut':
          console.log('User signed out via Hub');
          this.isAuthenticated = false;
          this.currentUserInfo = null;
          this.reports = [];
          this.users = [];
          this.error = null; this.userError = null; this.loginError = null;
          this.$router.push('/login');
          break;
        case 'signIn_failure':
        case 'customOAuthState_failure': // Example of other failure events
        case 'tokenRefresh_failure':
          console.error('Auth event error in Hub:', payload.event, payload.data);
          this.isAuthenticated = false;
          this.currentUserInfo = null;
          // UserLogin.vue handles its own error display based on Auth.signIn() promise rejection.
          // App.vue's loginError is not directly set here for signIn_failure to avoid conflict.
          // If a global auth error needs to be shown, set this.error or a dedicated authError property.
          break;
      }
    });
  },
  watch: {
    '$route'(to, from) {
      this.error = null;
      this.userError = null;
      this.loginError = null; // Clear loginError on route change

      if (this.isAuthenticated) { // Only fetch data if authenticated
        if (to.name === 'ReportList') {
          this.fetchReports();
        }
        if (to.name === 'UserList' && this.isAdmin) {
          this.fetchUsers();
        }
      }
    }
  },
  methods: {
    async checkAuthState() {
      this.appLoading = true;
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        this.setCurrentUserInfo(cognitoUser);
        this.isAuthenticated = true;
        // Fetch initial data based on current route after auth state is confirmed
        if (this.$route.name === 'ReportList') this.fetchReports();
        if (this.$route.name === 'UserList' && this.isAdmin) this.fetchUsers();

      } catch (e) {
        this.isAuthenticated = false;
        this.currentUserInfo = null;
      } finally {
        this.appLoading = false;
      }
    },
    setCurrentUserInfo(cognitoUser) {
      if (!cognitoUser || !cognitoUser.attributes) {
          this.currentUserInfo = null;
          return;
      }
      this.currentUserInfo = {
        id: cognitoUser.attributes.sub,
        username: cognitoUser.username || cognitoUser.attributes.email,
        email: cognitoUser.attributes.email,
        role: cognitoUser.attributes['custom:role'] || 'general' // Default to 'general' if not present
      };
      console.log('Current user info set:', this.currentUserInfo);
    },
    async handleLogout() {
      this.isLoading = true;
      try {
        await Auth.signOut();
      } catch (error) {
        console.error('Error signing out: ', error);
        // Even if signout fails, try to clear local state for better UX
        this.isAuthenticated = false;
        this.currentUserInfo = null;
        this.reports = []; this.users = [];
        this.$router.push('/login');
      } finally {
         this.isLoading = false;
      }
    },

    // --- Report Methods ---
    async fetchReports() {
      // No change to isAuthenticated check needed here, route guards handle access to components that call this.
      this.isLoading = true;
      this.error = null;
      try {
        // GET ${REPORTS_API_URL}
        // Lambda (listReportsLambda) returns an array of reports. This matches json-server.
        // Assumes Axios interceptor adds Auth header
        const response = await axios.get(REPORTS_API_URL);
        this.reports = response.data;
      } catch (err) {
        console.error('Error fetching reports:', err);
        this.error = `Failed to load reports: ${err.response?.data?.message || err.message}`;
      } finally {
        this.isLoading = false;
      }
    },

    getReportById(id) {
      const numericId = Number(id);
      return this.reports.find(report => report.id === numericId);
    },

    async handleSaveReport(reportData) {
      if (!this.isAdmin) {
        this.error = 'Permission denied. Only administrators can save reports.';
        return;
      }
      this.isLoading = true;
      this.error = null;
      try {
        let response;
        // For safety, let's send only title and content for PUT/POST.
        const payload = { title: reportData.title, content: reportData.content };
        if (reportData.id) { // Existing report - PUT
          // Assumes Axios interceptor adds Auth header
          response = await axios.put(`${REPORTS_API_URL}/${reportData.id}`, payload);
          const index = this.reports.findIndex(r => r.id === reportData.id);
          if (index !== -1) this.reports.splice(index, 1, response.data);
        } else { // New report - POST
          // Assumes Axios interceptor adds Auth header
          response = await axios.post(REPORTS_API_URL, payload);
          this.reports.push(response.data);
        }
        this.$router.push('/');
      } catch (err) {
        console.error('Error saving report:', err);
        this.error = `Failed to save report: ${err.response?.data?.message || err.message}`;
      } finally {
        this.isLoading = false;
      }
    },

    async handleDeleteReport(reportId) {
      if (!this.isAdmin) {
        this.error = 'Permission denied. Only administrators can delete reports.';
        return;
      }
      this.isLoading = true;
      this.error = null;
      try {
        // Assumes Axios interceptor adds Auth header
        await axios.delete(`${REPORTS_API_URL}/${reportId}`);
        this.reports = this.reports.filter(report => report.id !== Number(reportId)); // Ensure comparison is safe

        const currentRouteId = Number(this.$route.params.id);
        if ((this.$route.name === 'ReportView' || this.$route.name === 'ReportEdit') && currentRouteId === Number(reportId)) {
          this.$router.push('/');
        }
      } catch (err) {
        console.error('Error deleting report:', err);
        this.error = `Failed to delete report: ${err.response?.data?.message || err.message}`;
      } finally {
        this.isLoading = false;
      }
    },

    // --- User Management Methods (RBAC uses this.isAdmin, still point to json-server) ---
    async fetchUsers() {
      if (!this.isAdmin) {
        this.userError = "You don't have permission to view users."; this.users = []; return;
      }
      this.isLoadingUsers = true; this.userError = null;
      try {
        const session = await Auth.currentSession();
        const token = session.getIdToken().getJwtToken();
        const response = await axios.get(USERS_API_URL, { headers: { Authorization: `Bearer ${token}` } });
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
        this.userError = 'You do not have permission to save users.'; return;
      }
      this.isLoadingUsers = true; this.userError = null;
      try {
        const session = await Auth.currentSession();
        const token = session.getIdToken().getJwtToken();
        const headers = { Authorization: `Bearer ${token}` };
        let response;
        if (userData.id) {
          response = await axios.put(`${USERS_API_URL}/${userData.id}`, userData, { headers });
          const index = this.users.findIndex(u => u.id === userData.id);
          if (index !== -1) this.users.splice(index, 1, response.data);
        } else {
          response = await axios.post(USERS_API_URL, userData, { headers });
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
        this.userError = 'You do not have permission to delete users.'; return;
      }
      if (this.currentUserInfo && this.currentUserInfo.id_from_json_server === userId) {
          this.userError = "You cannot delete your own account record via this interface.";
      }

      this.isLoadingUsers = true; this.userError = null;
      try {
        const session = await Auth.currentSession();
        const token = session.getIdToken().getJwtToken();
        await axios.delete(`${USERS_API_URL}/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
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
    },

    async callTestApi() {
      this.testApiResponse = null;
      this.testApiError = null;
      if (!this.isAuthenticated) {
        this.testApiError = 'You must be logged in to test the API.';
        return;
      }

      try {
        const session = await Auth.currentSession(); // Ensure session is fresh
        const idToken = session.getIdToken().getJwtToken();
        const response = await axios.get(TEST_API_URL, {
           headers: { 'Authorization': `Bearer ${idToken}` } // Explicitly set for this call
        });
        this.testApiResponse = JSON.stringify(response.data, null, 2);
      } catch (err) {
        console.error('Error calling test API:', err);
        if (err.response) {
          this.testApiError = `Error: ${err.response.status} - ${JSON.stringify(err.response.data, null, 2)}`;
        } else {
          this.testApiError = `Error: ${err.message}`;
        }
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
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  text-align: left; /* Keep pre content aligned left */
}
</style>
