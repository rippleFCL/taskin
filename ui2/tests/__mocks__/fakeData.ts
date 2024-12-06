import { ICategory, ITask } from '../../src/types'

const categories: ICategory[] = [
  {
    id: '1',
    name: 'Category 1',
  },
  {
    id: '2',
    name: 'Category 2',
  },
  {
    id: '3',
    name: 'Category 3',
  },
]


const tasks: ITask[] = [
  {
    id: '1',
    name: 'Task 1',
    categoryId: '1',
  },
  {
    id: '2',
    name: 'Task 2',
    categoryId: '2',
  },
  {
    id: '3',
    name: 'Task 3',
    categoryId: '3',
  },
]

export default {
  categories,
  tasks,
}
