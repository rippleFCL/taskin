import { BrowserRouter, Routes, Route } from 'react-router'
import { createClient } from '@hey-api/client-fetch'
import { createTask, getCategories } from './client/sdk.gen'
import { GetCategoriesResponse, Task } from './client/types.gen'
import { OuterContainer } from './styles'
import { TaskSet } from './client/types.gen'
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
  const [categories, setCategories] = useState<GetCategoriesResponse>([])

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
        setCategories(data as unknown as GetCategoriesResponse);
        setHasFetched(true);
      }
    }).catch(error => {
      setHasError(error);
      console.error(error);
    });
  }, [])

  const newTask = (task: Task) => {
    createTask({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      body: {
        ...task,
        id: task.id
      } as TaskSet
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.info('Task created:', data);
      }
    })
  }

  const updateTask = (task: Task) => {
    createTask({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      },
      body: {
        ...task,
        id: task.id
      } as TaskSet
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.info('Task updated:', data);
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
            createTask={(task: TaskSet) => newTask(task)}
            updateTask={(task: TaskSet) => updateTask(task)}
          />} />
          {/* <Route path="/create" element={<TodoForm />} /> */}
          {/* <Route path="/:id" element={<TodoForm />} /> */}
        </Routes>
      </BrowserRouter>
    </OuterContainer>
  )
}


export default App
