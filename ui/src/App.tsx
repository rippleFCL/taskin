import { BrowserRouter, Routes, Route } from 'react-router'
import { createClient } from '@hey-api/client-fetch'
import { createTask, getCategories, deleteTask, updateTask } from './client/sdk.gen'
import { GetCategoriesResponse, TCategory } from './client/types.gen'
import { OuterContainer } from './styles'
import { TTask } from './client/types.gen'
import { useState, useEffect } from 'react'
import Main from './pages/Main'

const apiClient = createClient({
  baseUrl: 'http://localhost:8080',
  headers: {
    Authorization: 'Bearer <token_from_service_client>',
  },
})

apiClient.interceptors.request.use((request, options) => {
  console.log('Request:', request, options)
  return request
})

const App = (): JSX.Element => {
  const [hasFetched, setHasFetched] = useState(false)

  const [hasError, setHasError] = useState<boolean | string>(false)
  const [categories, setCategories] = useState<TCategory[]>([])

  function getTaskCategory(task: TTask): [category: TCategory | undefined, categoryIndex: number | undefined] {
    const category = categories.find(cat => cat.id === task.category_id);
    console.log(category, task)
    if (!category) {
      console.log('Category not found');
      return [undefined, undefined];
    }
    if (!category.tasks) {
      console.log('Category has no tasks');
      return [undefined, undefined];

    }
    const categoryIndex = categories.indexOf(category);
    if (categoryIndex === -1) {
      console.log('Category isnt in Categories');
      return [undefined, undefined];
    }

    return [category, categoryIndex]
  }

  function replaceTaskInCategory(task: TTask | null, newTask: TTask) {
    // Find the category by id
    console.log("wheel up da ting", task, newTask)
    if (task?.id !== newTask.id) {
      return console.log('Task not found');

    }
    if (!newTask.id) {
      return console.log('New task has no id');
    }

    if (task.category_id === newTask.category_id) {
      const [category, categoryIndex] = getTaskCategory(task);
      const newCategories = [...categories]
      if (categoryIndex === undefined || categoryIndex === -1) {
        return console.log('Category index not found');
      }
      if (!category) {
        return console.log('Category not found');
      }
      if (!newCategories[categoryIndex].tasks) {
        return console.log('Category has no tasks');
      }
      const taskIndex = category?.tasks?.findIndex(catTask => catTask.id === task.id)
      if (taskIndex === undefined || taskIndex === -1) {
        return console.log('Task not found');;
      }
      category.tasks?.splice(taskIndex, 1, newTask)
      newCategories[categoryIndex] = category
      setCategories(newCategories)
    }
    if (!task.id) {
      const [category, oldCategoryIndex] = getTaskCategory(task);
      const oldCategoryTasks = category?.tasks?.filter(catTask => catTask.id !== task.id)

    }
    const [category, newCategoryIndex] = getTaskCategory(newTask);
    const newCategoryTasks = category?.tasks?.concat([newTask])


    // Replace the task with the new task


    // Find the task in the category

  }

  function addTaskToCategory(task: TTask) {
    const [category, categoryIndex] = getTaskCategory(task);
    const newCategories = [...categories]
    if (categoryIndex === undefined || categoryIndex === -1) {
      return console.log('Category index not found');
    }
    if (!category) {
      return console.log('Category not found');
    }
    if (!newCategories[categoryIndex].tasks) {
      return console.log('Category has no tasks');
    }
    newCategories[categoryIndex].tasks?.push(task)
    setCategories(newCategories)
  }

  function removeTaskFromCategory(task: TTask) {
    const [category, categoryIndex] = getTaskCategory(task);
    const newCategories = [...categories]
    if (categoryIndex === undefined || categoryIndex === -1) {
      return console.log('Category index not found');
    }
    if (!category) {
      return console.log('Category not found');
    }
    if (!newCategories[categoryIndex].tasks) {
      return console.log('Category has no tasks');
    }
    const taskIndex = category?.tasks?.findIndex(catTask => catTask.id === task.id)
    if (taskIndex === undefined || taskIndex === -1) {
      return console.log('Task not found');;
    }
    category.tasks?.splice(taskIndex, 1)
    newCategories[categoryIndex] = category
    setCategories(newCategories)
  }

  useEffect(() => {
    getCategories({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      }
    }).then(response => {
      const { data, error } = response;
      if (error) {
        console.error(error);
      } else {
        console.info(data);
        setHasFetched(true);
        setCategories(data as unknown as GetCategoriesResponse);
      }
    }).catch(error => {
      setHasError(error);

      console.error(error);
    });
  }, [])

  const newTask = (task: TTask | null, newTask: TTask) => {
    createTask({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      body: newTask
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.log(data, task);
        addTaskToCategory(data as unknown as TTask);
      }
    })
  }

  const SaveTask = (task: TTask | null, newTask: TTask) => {
    console.log(task, newTask)
    if (!newTask?.id) {
      return console.error('Task has no id');
    }
    replaceTaskInCategory(task, newTask);
    updateTask({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      path: {
        task_id: newTask.id
      },
      body: newTask
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.log(data, task);
      }
    })
  }

  const removeTask = (task: TTask) => {
    if (!task?.id) {
      return console.error('Task has no id');
    }
    removeTaskFromCategory(task);
    deleteTask({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      path: {
        task_id: task.id
      }
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.log(data, task);
      }
    })
  }
  if (!hasFetched) {
    return <div><img src="https://cdn.dribbble.com/users/1204962/screenshots/4651504/hamster-loader.gif" alt="loading.gif" width="100px"></img></div>
  }

  if (hasError) {
    return <div>Something went wrong: {hasError}</div>
  }

  return (
    <OuterContainer>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Main
            categories={categories}
            createTask={newTask}
            deleteTask={removeTask}
            updateTask={SaveTask}
          />} />
          {/* <Route path="/create" element={<TodoForm />} /> */}
          {/* <Route path="/:id" element={<TodoForm />} /> */}
        </Routes>
      </BrowserRouter>
    </OuterContainer>
  )
}


export default App
