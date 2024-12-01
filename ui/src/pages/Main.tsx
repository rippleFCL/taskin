import { GetCategoriesResponse, TTask, TCategory } from '../client/types.gen';
import { GridItem } from '../styles';
import { ReactElement } from 'react'
import { TaskMode } from '../types';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import TaskComponent from '../components/Task';
import { create } from '@mui/material/styles/createTransitions';

interface MainPropTypes {
  categories: TCategory[],
  createTask: (task: TTask | null, newTask: TTask) => void
  updateTask: (task: TTask | null, newTask: TTask) => void
}

const Home = (props: MainPropTypes): ReactElement => {
  const { categories, createTask, updateTask } = props

  return (
    <Box>
      {categories.map((category: TCategory) => (
        <GridItem key={category.name}> {/*<GridItem key={category.uuid}>*/}
          <h1>{category.name}</h1>
          {(category.tasks ? category.tasks : []).map((task: TTask) => (
            <GridItem key={task.id}>
              <TaskComponent
                key={task.id}
                task={task}
                updateTask={updateTask}
                createTask={createTask}
                mode={TaskMode.view}
              />
            </GridItem>
          ))}
        </GridItem>
      ))}

      <Grid>
        <GridItem>
          <TaskComponent
                task={null}
                updateTask={updateTask}
                createTask={createTask}
                mode={TaskMode.create}
              />
        </GridItem>
      </Grid>
    </Box>
  )
}

export default Home
