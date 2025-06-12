<template>
  <div class="user-list-container">
    <h2>User Management</h2>
    <div class="toolbar">
      <button @click="navigateToAddUser" class="add-user-btn">Add New User</button>
    </div>
    <table v-if="users.length">
      <thead>
        <tr>
          <th>Username</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ user.role }}</td>
          <td>
            <button @click="navigateToEditUser(user.id)" class="action-btn edit-btn">Edit</button>
            <button
              @click="confirmDeleteUser(user.id)"
              class="action-btn delete-btn"
              :disabled="isCurrentUser(user.id)">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!users.length && !isLoadingUsers">No users found.</p>
    <p v-if="isLoadingUsers">Loading users...</p>
    <p v-if="userError" class="error-message">{{ userError }}</p>
  </div>
</template>

<script>
export default {
  name: 'UserList',
  props: {
    users: {
      type: Array,
      required: true,
      default: () => []
    },
    currentUser: {
      type: Object,
      required: true
    },
    isLoadingUsers: {
        type: Boolean,
        default: false
    },
    userError: {
        type: String,
        default: null
    }
  },
  emits: ['delete-user'],
  methods: {
    navigateToAddUser() {
      this.$router.push({ name: 'UserCreate' });
    },
    navigateToEditUser(userId) {
      this.$router.push({ name: 'UserEdit', params: { id: userId } });
    },
    confirmDeleteUser(userId) {
      if (this.isCurrentUser(userId)) {
        alert("You cannot delete your own account.");
        return;
      }
      if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        this.$emit('delete-user', userId);
      }
    },
    isCurrentUser(userId) {
      // Ensure currentUser and its id property exist before comparison
      return this.currentUser && this.currentUser.id !== undefined && this.currentUser.id === userId;
    }
  }
};
</script>

<style scoped>
.user-list-container {
  margin: 20px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.user-list-container h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}
.toolbar {
  margin-bottom: 20px;
  text-align: right;
}
.add-user-btn {
  background-color: #5cb85c;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}
.add-user-btn:hover {
  background-color: #4cae4c;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
th {
  background-color: #e9ecef;
  color: #495057;
  font-weight: bold;
}
tr:nth-child(even) {
  background-color: #f2f2f2;
}
tr:hover {
  background-color: #e2e6ea;
}
.action-btn {
  padding: 8px 12px;
  margin-right: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95em;
}
.edit-btn {
  background-color: #f0ad4e;
  color: white;
}
.edit-btn:hover {
  background-color: #ec971f;
}
.delete-btn {
  background-color: #d9534f;
  color: white;
}
.delete-btn:hover {
  background-color: #c9302c;
}
.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 10px;
}
</style>
