import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './stores';
import './assets/main.css';
import { useAuthStore } from './stores/auth.ts';

const app = createApp(App);

app.use(router);
app.use(pinia);

const auth = useAuthStore();
auth.fetchCurrentUser().finally(() => app.mount("#app");