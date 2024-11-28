import React, { useState, useEffect, ReactElement } from 'react'
import Todo from '../components/Todo'
import { ITodo, TodoMode } from '../types'
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import styled from '@emotion/styled'

const GridItem = styled(Grid)`
background-color: #f9f9f9;
padding: 10px;
border-radius: 5px;
margin: 10px;
border: 1px solid #e0e0e0;
box-shadow: 0 0 10px #e0e0e0;

`

interface HomePropTypes {
  todos: ITodo[]
  setTodos: React.Dispatch<React.SetStateAction<ITodo[]>>
  createTodo: (todo: ITodo) => void
}

const Home = (props: HomePropTypes): ReactElement => {
  const { todos, setTodos, createTodo } = props

  return (
    <Box>
      <Grid>
        {todos.map((todo: ITodo, index: number) => (
          <GridItem>
            <Todo key={index} todo={todo} setTodos={setTodos} createTodo={createTodo} mode={TodoMode.view} />
          </GridItem>
        ))}

        <GridItem>
          <Todo todo={null} setTodos={setTodos} createTodo={createTodo} mode={TodoMode.edit}/>
        </GridItem>

      </Grid>
    </Box>
  )
}

export default Home
