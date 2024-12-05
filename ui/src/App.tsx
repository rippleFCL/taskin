import { createClient } from '@hey-api/client-fetch'
import { createTask, getCategories, deleteTask, updateTask, createCategory, deleteCategory } from './client/sdk.gen'
import { GetCategoriesResponse, TCategory } from './client/types.gen'
import { OuterContainer, darkTheme } from './styles'
import { TTask } from './client/types.gen'
import { useState, useEffect } from 'react'
import Main from './pages/Main'
import { CssBaseline, ThemeProvider } from '@mui/material'

const apiClient = createClient({
  baseUrl: window.location.origin+'/api',
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
  const [hasError, setHasError] = useState<string>("")
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

  function addTaskToCategory(task: TTask) {
    const [category, categoryIndex] = getTaskCategory(task);
    const newCategories = [...categories]
    console.log("wah", category, categoryIndex)
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
      console.log('Task not found')

    }
    removeTaskFromCategory(task);
    addTaskToCategory(newTask);
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
      setHasError(error.toString());

      console.error(error);
    });
  }, [])

  const newTask = (newTask: TTask) => {
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

  const setCategory = (category: TCategory) => {
    createCategory({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      body: category
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        const newCategories = [data as unknown as TCategory, ...categories]
        console.log(newCategories)
        setCategories(newCategories);
      }
    })
  }

  const removeCategory = (category: TCategory) => {
    if (!category?.id) {
      return console.error('Category has no id');
    }
    const categoryIndex = categories.indexOf(category);
    if (categoryIndex === -1) {
      return console.error('Category not found');
    }
    const newCategories = [...categories];
    newCategories.splice(categoryIndex, 1);
    setCategories(newCategories);

    deleteCategory({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      path: {
        category_id: category.id
      }
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.log(data, category);
      }
    })
  }

  if (hasError) {
    return <div>Something went wrong: {hasError}</div>
  }

  if (!hasFetched) {
    return <div><img src="https://cdn.dribbble.com/users/1204962/screenshots/4651504/hamster-loader.gif" alt="loading.gif" width="100px"></img></div>
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <OuterContainer>
        <Main
            categories={categories}
            createTask={newTask}
            deleteTask={removeTask}
            updateTask={SaveTask}
            setCategory={setCategory}
            deleteCategory={removeCategory}
         />
      </OuterContainer>
    </ThemeProvider>
  )
}


export default App
