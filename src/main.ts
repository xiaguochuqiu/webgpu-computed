import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import "element-plus/dist/index.css"
import { useRouter } from "./router"
import ElementPlus from 'element-plus'

const app = createApp(App)
useRouter(app)
app.use(ElementPlus)
app.mount('#app')