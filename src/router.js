import { createRouter, createWebHistory } from 'vue-router'
import MealsTab from './components/MealsTab.vue'
import ScheduleTab from './components/ScheduleTab.vue'
import GroceryTab from './components/GroceryTab.vue'
import ToolsTab from './components/ToolsTab.vue'
import SettingsTab from './components/SettingsTab.vue'
import MealDetail from './components/MealDetail.vue'
import AddMealScreen from './components/AddMealScreen.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'meals',
      component: MealsTab,
    },
    {
      path: '/meals/new',
      name: 'meal-new',
      component: AddMealScreen,
      props: (route) => ({
        scheduledDate: route.query.date ?? '',
      }),
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
      path: '/meals/:mealId/edit',
      name: 'meal-edit',
      component: AddMealScreen,
      props: (route) => ({
        mealId: route.params.mealId,
        scheduledDate: route.query.date ?? '',
      }),
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
