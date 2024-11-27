import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import Home from './pages/Home'

const App = () => {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8123/tasks')
      .then(response => response.json())
      .then(data => setTodos(data))
  }, [])

  if (todos.length === 0) {
    return <div><img src="https://cdn.dribbble.com/users/1204962/screenshots/4651504/hamster-loader.gif" alt="loading.gif"></img></div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Home todos={todos} />
        } />
        {/* <Route path="/create" element={<TodoForm />} /> */}
        {/* <Route path="/:id" element={<TodoForm />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
