import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import Home from './pages/Home'
import { ITodo } from './types'
import { client } from './client/sdk.gen'
import { comTasksTasksGet } from './client/sdk.gen'
import { createClient } from '@hey-api/client-fetch'
import { OuterContainer } from './styles'

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

const App = () => {
  const [hasFetched, setHasFetched] = useState(false);
  const [hasError, setHasError] = useState<boolean | string>(false);
  const [todos, setTodos] = useState<ITodo[]>([]);

  useEffect(() => {
    comTasksTasksGet({
      client: apiClient,
      headers: {
        Authorization: 'Bearer <token>',
      }
    }).then(response => {
      const { data, error } = response;
      if (error) {
        return console.error(error);
      } else {
        console.info(data);
        setTodos(data as unknown as ITodo[]);
        return setHasFetched(true);
      }
    }).catch(error => {
      setHasError(error);
      // console.error(error);
    });
  }, [])

  // if (!hasFetched) {
  //   return <div><img src="https://cdn.dribbble.com/users/1204962/screenshots/4651504/hamster-loader.gif" alt="loading.gif" width="100px"></img></div>
  // }

  if (hasError) {
    return <div>Something went wrong: {hasError}</div>
  }

  const createTodo = (todo: ITodo) => {
    setTodos([...todos, todo]);

    apiClient.post({
      url: '/tasks',
      body: todo as unknown as Record<string, unknown>,
      headers: {
        Authorization: '<token>',
      }
    }).then(response => {
      const { data, error } = response;
      if (error) {
        console.error(error);
      } else {
        console.info(data);

      }
    }).catch(error => {
      console.error(error);
    });

  }

  return (
    <OuterContainer>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <Home todos={todos} setTodos={setTodos} createTodo={createTodo} />
          } />
          {/* <Route path="/create" element={<TodoForm />} /> */}
          {/* <Route path="/:id" element={<TodoForm />} /> */}
        </Routes>
      </BrowserRouter>
    </OuterContainer>
  )
}

export default App
