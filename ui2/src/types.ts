interface ICategory {
  id: string
  name: string
}

interface ITask {
  id: string
  name: string
  categoryId: string
}

interface IStore {
  categories: ICategory[]
  tasks: ITask[]
}


export type {
  ICategory,
  ITask,
  IStore
}
