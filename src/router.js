import { createRouter, createWebHistory } from 'vue-router'
import MealsTab from './components/MealsTab.vue'
import ScheduleTab from './components/ScheduleTab.vue'
import GroceryTab from './components/GroceryTab.vue'
import ToolsTab from './components/ToolsTab.vue'
import SettingsTab from './components/SettingsTab.vue'
import MealDetail from './components/MealDetail.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'meals',
      component: MealsTab,
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: ScheduleTab,
    },
    {
      path: '/grocery',
      name: 'grocery',
      component: GroceryTab,
    },
    {
      path: '/tools',
      name: 'tools',
      component: ToolsTab,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsTab,
    },
    {
      path: '/meals/:mealId',
      name: 'meal',
      component: MealDetail,
      props: (route) => ({
        mealId: route.params.mealId,
      }),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})
