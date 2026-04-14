import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CalendarView from '../views/CalendarView.vue'
import RubricaView from '../views/RubricaView.vue'
import DocumentiView from '../views/DocumentiView.vue'
import LinkView from '../views/LinkView.vue'
import ContattiView from '../views/ContattiView.vue'
import OrariView from '../views/OrariView.vue'
import BuoniView from '../views/BuoniView.vue'
import DdsView from '../views/DdsView.vue'
import BachecaTurniView from '../views/BachecaTurniView.vue'
import BachecaUtilityView from '../views/BachecaUtilityView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/calendario', name: 'calendario', component: CalendarView },
    { path: '/rubrica', name: 'rubrica', component: RubricaView },
    { path: '/documenti', name: 'documenti', component: DocumentiView },
    { path: '/link', name: 'link', component: LinkView },
    { path: '/contatti', name: 'contatti', component: ContattiView },
    { path: '/orari', name: 'orari', component: OrariView },
    { path: '/buoni', name: 'buoni', component: BuoniView },
    { path: '/dds', name: 'dds', component: DdsView },
    { path: '/bacheca_turni', name: 'bacheca_turni', component: BachecaTurniView },
    { path: '/bacheca_utility', name: 'bacheca_utility', component: BachecaUtilityView },
    
    // Final migrated routes
    { path: '/dati_calendario', name: 'dati_calendario', component: () => import('../views/DatiCalendarioView.vue') },
    { path: '/turni', name: 'turni', component: () => import('../views/TurniView.vue') },
    { path: '/rotazione_ferie', name: 'rotazione_ferie', component: () => import('../views/RotazioneFerieView.vue') },
    { path: '/rotazioni', name: 'rotazioni', component: () => import('../views/RotazioniView.vue') },
    { path: '/guida', name: 'guida', component: () => import('../views/GuidaView.vue') },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue') },
    { path: '/generatore', name: 'generatore', component: () => import('../views/GeneratoreView.vue') }
  ]
})

export default router
