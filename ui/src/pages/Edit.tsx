import React, { useState, useEffect, ReactElement } from 'react'
import Todo from '../components/Todo'
import { ITodo } from '../types'
import { GridItem, Box, Grid } from '../styles'

interface HomePropTypes {
  todos: ITodo[]
  setTodos: React.Dispatch<React.SetStateAction<ITodo[]>>
}

const Edit = (props: HomePropTypes): ReactElement => {
  const { todos, setTodos } = props
  const [selected, setSelected] = useState<ITodo | null>(null)


  if (todos?.length === 0) {
    return <div><img src="https://cdn.dribbble.com/users/1204962/screenshots/4651504/hamster-loader.gif" alt="loading.gif" width="100px"></img></div>
  }

  if (selected) {
    return (
      <Box>
        <Todo todo={selected} setTodos={setTodos} />
      </Box>
    )
  }

  return (
    <Box>
      <Grid>
        <GridItem>
          <Todo todo={null} setTodos={setTodos} />
        </GridItem>
      </Grid>
    </Box>
  )
}

export default Home
