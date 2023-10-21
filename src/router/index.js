import Vue from 'vue'
import VueRouter from "vue-router";
import Index from "@/pages/index.vue";
import translate from "@/pages/translate.vue";

Vue.use(VueRouter);
const router = new VueRouter({
    mode: process.env.IS_ELECTRON ? 'hash' : 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            name:'index',
            redirect:'/default',
            component: () => import('@/App.vue'),
            children:[
                {path:'default',name:'default',meta:{title: 'Welcome to use ChatGPT'},component: Index},
                {path:'translate',name:'translate',component:translate}
            ]
        },
    ]
})
export default router
