<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="userId">User ID:</label>
        <input type="text" id="userId" v-model="userId" required />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit">Login</button>
      <p v-if="error || loginError" class="error-message">{{ error || loginError }}</p>
    </form>
  </div>
</template>

<script>
export default {
  name: 'UserLogin',
  props: {
    loginError: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      userId: '',
      password: '',
      error: ''
    };
  },
  methods: {
    handleLogin() {
      // Clear previous client-side errors, App.vue will manage auth errors via prop
      this.error = '';
      if (this.userId && this.password) {
        this.$emit('login-attempt', { userId: this.userId, password: this.password });
      } else {
        this.error = 'User ID and Password are required.'; // Client-side validation
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh; /* Adjust as needed */
}
.login-form {
  padding: 30px; /* Increased padding */
  border: 1px solid #ccc;
  border-radius: 8px; /* More rounded corners */
  background-color: #f9f9f9;
  width: 350px; /* Wider form */
  box-shadow: 0 4px 8px rgba(0,0,0,0.1); /* Added subtle shadow */
}
.login-form h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input {
  width: 100%;
  padding: 10px; /* Increased padding */
  border: 1px solid #ddd; /* Lighter border */
  border-radius: 4px;
  box-sizing: border-box;
}
button[type="submit"] {
  width: 100%;
  padding: 12px; /* Increased padding */
  background-color: #5cb85c; /* Green color */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
button[type="submit"]:hover {
  background-color: #4cae4c; /* Darker green on hover */
}
.error-message {
  color: red;
  margin-top: 10px;
  text-align: center;
}
</style>
