import { CategoryResponse, GetCategoriesResponse, Task, TaskSet } from '../client/types.gen';
import { GridItem } from '../styles';
import { ReactElement } from 'react'
import { TaskMode } from '../types';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import TaskComponent from '../components/Task';

interface MainPropTypes {
  categories: GetCategoriesResponse
  createTask: (task: TaskSet) => void
  updateTask: (task: TaskSet) => void
}

const Home = (props: MainPropTypes): ReactElement => {
  const { categories } = props

  return (
    <Box>
      {categories.map((category: CategoryResponse) => (
        <GridItem key={category.name}> {/*<GridItem key={category.uuid}>*/}
          <h1>{category.name}</h1>
          {category.tasks.map((task: Task) => (
            <GridItem key={task.id}>
              {task.name}
              <TaskComponent
                key={task.id}
                task={task}
                updateTask={(t: TaskSet) => props.updateTask(t)}
                createTask={(t: TaskSet) => props.createTask(t)}
                mode={TaskMode.view}
              />
            </GridItem>
          ))}
        </GridItem>
      ))}
      <Grid>
        <GridItem>
          CREATE A NEW TASK HERE, blud.
          {/* <Todo key={index} todo={todo} setTodos={setTodos} createTodo={createTodo} mode={TodoMode.edit} /> */}
        </GridItem>
      </Grid>
    </Box>
  )
}

export default Home
