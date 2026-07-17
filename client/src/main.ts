import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './stores';
import './assets/main.css';
import { useAuthStore } from './stores/auth.ts';

const app = createApp(App);

app.use(router);
app.use(pinia);

// Validate any stored session before mounting, so a stale token doesn't
// briefly render the app before the first 401 bounces the user to login.
const auth = useAuthStore();
auth.fetchCurrentUser().finally(() => app.mount("#app"));