import { GetCategoriesResponse, TTask, TCategory } from '../client/types.gen';
import { GridItem } from '../styles';
import { ReactElement } from 'react'
import { TaskMode } from '../types';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import { Button } from '@mui/material';
import TaskComponent from '../components/Task';
import NewCategoryComponent from '../components/newCategory';
import { create } from '@mui/material/styles/createTransitions';
import { deleteCategory } from '../client';

interface MainPropTypes {
  categories: TCategory[],
  createTask: (task: TTask | null, newTask: TTask) => void
  updateTask: (task: TTask | null, newTask: TTask) => void
  deleteTask: (task: TTask) => void;
  setCategory: (category: TCategory) => void
  deleteCategory: (category: TCategory) => void

}

const Home = (props: MainPropTypes): ReactElement => {
  const { categories, createTask, updateTask, deleteTask, setCategory, deleteCategory } = props

  const renderControls = (category: TCategory) => {
    if(category.id == null) {
      return <></>
    }

    return <Button variant="outlined" color="primary" onClick={() => { deleteCategory(category) }}>Delete Category</Button>
  }
  return (
    <Box>
      {categories.map((category: TCategory) => (
        <GridItem key={category.name}> {/*<GridItem key={category.uuid}>*/}
          {renderControls(category)}
          <h1>{category.name}</h1>
          {(category.tasks ? category.tasks : []).map((task: TTask) => (
            <GridItem key={task.id}>
              <TaskComponent
                key={task.id}
                task={task}
                updateTask={updateTask}
                createTask={createTask}
                deleteTask={deleteTask}
                categories={categories}
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
            deleteTask={deleteTask}
            categories={categories}
            mode={TaskMode.create}
          />
        </GridItem>
        <GridItem>
          <NewCategoryComponent setCategory={setCategory} />
        </GridItem>
      </Grid>
    </Box>
  )
}

export default Home
