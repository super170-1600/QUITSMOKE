import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {Button,Field,Icon,Loading,NavBar,Rate,Stepper} from 'vant'
import App from './App.vue'
import router from './router'
import 'vant/es/button/style/index.mjs'
import 'vant/es/field/style/index.mjs'
import 'vant/es/icon/style/index.mjs'
import 'vant/es/loading/style/index.mjs'
import 'vant/es/nav-bar/style/index.mjs'
import 'vant/es/rate/style/index.mjs'
import 'vant/es/stepper/style/index.mjs'
import 'vant/es/toast/style/index.mjs'
import 'vant/es/dialog/style/index.mjs'
import './styles.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
for(const component of [Button,Field,Icon,Loading,NavBar,Rate,Stepper])app.use(component)
app.mount('#app')
