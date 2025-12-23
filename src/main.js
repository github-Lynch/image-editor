import { createApp } from 'vue'
import './style.css' // 确保这里引入了我们新写的通用 CSS (包含 .ie-btn 等样式)
import App from './App.vue'
import { applyTheme } from './config/theme.js';
// 1. 创建 Vue 实例
const app = createApp(App)

// 2. 应用主题
applyTheme();

// 3. 挂载
app.mount('#app')