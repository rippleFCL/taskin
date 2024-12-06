import { create } from 'zustand'
import { ICategory, ITask, IStore } from './types'
import { getTasks, getCategories } from './client/sdk.gen'
import { GetCategoryResponse } from './client';
import { createClient } from '@hey-api/client-fetch';

const apiClient = createClient({
  baseUrl: 'http://'+window.location.hostname+':8080',
  // headers: {
  //   Authorization: 'Bearer <token_from_service_client>',
  // },
})

// apiClient.interceptors.request.use((request, options) => {
//   console.log('Request:', request, options)
//   return request
// })

export const useStore = create((set) => ({
  title: "Welcome",
  error: false,
  errorData: null,
  loading: true,
  tasks: [],
  categories: [],
  setTitle: (title: string) => set({title: title}),
  addCategory: (category: ICategory) => set((state: IStore) => ({ categories: [...state.categories, category] })),
  addTask: (task: ITask) => set((state: IStore) => ({ tasks: [...state.tasks, task] })),
  removeTask: (id: string) => set((state: IStore) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
  removeCategory: (id: string) => set((state: IStore) => ({ categories: state.categories.filter((category) => category.id !== id) })),
  updateTask: (task: ITask) => set((state: IStore) => ({ tasks: state.tasks.map((t) => t.id === task.id ? task : t) })),
  updateCategory: (category: ICategory) => set((state: IStore) => ({ categories: state.categories.map((c) => c.id === category.id ? category : c) })),
  getTasksByCategory: (categoryId: string) => set((state: IStore) => ({ tasks: state.tasks.filter((task) => task.categoryId === categoryId) })),
  getTaskById: (id: string) => set((state: IStore) => ({ tasks: state.tasks.find((task) => task.id === id) })),
  getCategoryById: (id: string) => set((state: IStore) => ({ categories: state.categories.find((category) => category.id === id) })),
  getCategories: () => set((state: IStore) => ({ categories: state.categories })),
  getTasks: () => set((state: IStore) => ({ tasks: state.tasks })),
  reset: () => set({}, true),
}))
