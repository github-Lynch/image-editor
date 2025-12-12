import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia' // [新增] 1. 引入 createPinia

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 如果有图标库，也可以在这里引入
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
const pinia = createPinia() // [新增] 2. 创建 Pinia 实例

// [新增] 3. 注册所有图标 (可选，防止部分图标不显示)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(pinia) // [新增] 4. 挂载 Pinia (一定要在 mount 之前)
app.mount('#app')