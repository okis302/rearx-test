import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { Amplify } from 'aws-amplify'; // Import Amplify
import amplifyConfig from './amplify-config'; // Import your Amplify configuration

Amplify.configure(amplifyConfig); // Configure Amplify

createApp(App)
  .use(router)
  .mount('#app');
