<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="username">Username (or Email):</label>
        <input type="text" id="username" v-model="username" required />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" :disabled="isLoading">{{ isLoading ? 'Logging in...' : 'Login' }}</button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </form>
  </div>
</template>

<script>
import { Auth } from 'aws-amplify';

export default {
  name: 'UserLogin',
  props: {
    // loginError prop is removed as per instructions
  },
  data() {
    return {
      username: '',
      password: '',
      error: '',
      isLoading: false
    };
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.error = '';
      try {
        const user = await Auth.signIn(this.username, this.password);
        console.log('Cognito user signed in:', user);
        // Hub listener in App.vue will handle successful login
      } catch (err) {
        console.error('Error signing in:', err);
        this.error = err.message || 'An error occurred during login.';
      } finally {
        this.isLoading = false;
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
  min-height: 80vh;
}
.login-form {
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  width: 350px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}
button[type="submit"] {
  width: 100%;
  padding: 12px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
button[type="submit"]:hover {
  background-color: #4cae4c;
}
button[type="submit"]:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 10px;
  text-align: center;
}
</style>
