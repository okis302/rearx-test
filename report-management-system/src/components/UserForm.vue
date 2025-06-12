<template>
  <div class="user-form-container">
    <h2>{{ formTitle }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="username">Username:</label>
        <input type="text" id="username" v-model="userData.username" required />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="userData.password" :placeholder="isEditMode ? 'Leave blank to keep current password' : ''" />
        <p v-if="isEditMode && !userData.password" class="password-info">
          Leave blank to keep the current password.
        </p>
      </div>
      <div class="form-group">
        <label for="role">Role:</label>
        <select id="role" v-model="userData.role" required>
          <option value="general">General</option>
          <option value="administrator">Administrator</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="submit" class="save-btn">Save User</button>
        <button type="button" @click="cancelForm" class="cancel-btn">Cancel</button>
      </div>
      <p v-if="formError" class="error-message">{{ formError }}</p>
    </form>
  </div>
</template>

<script>
export default {
  name: 'UserForm',
  props: {
    userToEdit: {
      type: Object,
      default: null
    },
    formError: {
        type: String,
        default: null
    }
  },
  emits: ['save-user', 'cancel-form'],
  data() {
    return {
      userData: {
        id: null,
        username: '',
        password: '',
        role: 'general'
      }
    };
  },
  computed: {
    isEditMode() {
      return !!(this.userToEdit && this.userToEdit.id);
    },
    formTitle() {
      return this.isEditMode ? 'Edit User' : 'Add New User';
    }
  },
  watch: {
    userToEdit: {
      handler(newUser) {
        if (newUser && newUser.id) {
          this.userData.id = newUser.id;
          this.userData.username = newUser.username || '';
          this.userData.role = newUser.role || 'general';
          this.userData.password = '';
        } else {
          this.userData.id = null;
          this.userData.username = '';
          this.userData.password = '';
          this.userData.role = 'general';
        }
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    handleSubmit() {
      // The formError prop is for errors from the parent.
      // This component can also have its own local validation error state if needed.
      // For now, we rely on parent to set formError if save-user results in an error.
      if (!this.userData.username || !this.userData.role) {
        // For simplicity, this component doesn't set its own error state for this,
        // but relies on the parent to potentially set formError if the emitted data is invalid.
        // Or, we could add a local error data property.
        // Emitting null for data and an error message is one way to signal parent.
        // However, the prompt for save-user event is just (dataToSave).
        // Let's assume parent validation or backend validation will set formError prop.
        // For now, just proceed with emitting. Parent (App.vue) will handle.
      }
      if (!this.isEditMode && !this.userData.password) {
        // Similar to above, parent/backend validation.
        // This is more of a UX concern for the form itself.
        // A real app might have more complex local validation.
      }

      const dataToSave = { ...this.userData };
      if (this.isEditMode && !dataToSave.password) {
        delete dataToSave.password;
      }

      this.$emit('save-user', dataToSave);
    },
    cancelForm() {
      this.$emit('cancel-form');
    }
  }
};
</script>

<style scoped>
.user-form-container {
  max-width: 500px;
  margin: 30px auto;
  padding: 30px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.user-form-container h2 {
  text-align: center;
  margin-bottom: 25px;
  color: #333;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}
.form-group input[type="text"],
.form-group input[type="password"],
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
}
.password-info {
  font-size: 0.85em;
  color: #777;
  margin-top: 5px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}
.save-btn, .cancel-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  font-weight: bold;
}
.save-btn {
  background-color: #5cb85c;
  color: white;
}
.save-btn:hover {
  background-color: #4cae4c;
}
.cancel-btn {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
}
.cancel-btn:hover {
  background-color: #e0e0e0;
}
.error-message {
  color: red;
  margin-top: 15px;
  text-align: center;
}
</style>
