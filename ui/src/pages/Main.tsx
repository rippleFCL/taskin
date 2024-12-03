import { GetCategoriesResponse, TTask, TCategory } from '../client/types.gen';
import { Grid, Box, Stack } from '../styles';
import React, { ReactElement } from 'react'
import { TaskMode } from '../types';
import { Badge, Button, Chip, Tab, Tabs } from '@mui/material';
import TaskComponent from '../components/Task';
import NewCategoryComponent from '../components/newCategory';
import { create } from '@mui/material/styles/createTransitions';
import { deleteCategory } from '../client';
import CustomTabPanel from '../components/TabPannle';


declare module '@mui/material/Grid2' {
  interface GridPropsVariantOverrides {
    card: true;
  }
}

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
  const [value, setValue] = React.useState(1);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const renderControls = (category: TCategory) => {
    if (category.id == null) {
      return <></>
    }

    return <Button variant="outlined" color="primary" onClick={() => { deleteCategory(category) }}>Delete Category</Button>
  }

  const renderCategory = (filter: string) => {
    return <>{categories.map((category: TCategory) => (
          <Grid key={category.name}> {/*<GridItem key={category.uuid}>*/}
            <h1>{category.name}</h1>
            {(category.tasks ? category.tasks : []).map((task: TTask) => (task.status === filter &&
              <Stack key={task.id}>
                <TaskComponent
                  key={task.id}
                  task={task}
                  updateTask={updateTask}
                  createTask={createTask}
                  deleteTask={deleteTask}
                  categories={categories}
                  mode={TaskMode.view}
                />
              </Stack>
            ))}
          </Grid>
        ))}</>
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const sumTasks = (filter: string) => {
    let sum = 0;
    for (let i = 0; i < categories.length; i++) {
      sum += categories[i].tasks?.filter(task => task.status === filter).length ?? 0
    }
    return sum;
  }


  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs variant="fullWidth" value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label={<>Todo<Chip label={sumTasks('todo')} /></>} {...a11yProps(0)} />
          <Tab label={ <>In Progress <Chip label={sumTasks('in_prog')} /></>} {...a11yProps(1)} />
          <Tab label={<>Completed <Chip label={sumTasks('comp')} /></>} {...a11yProps(2)} />
          <Tab label="Category Management" {...a11yProps(3)} />

        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        {renderCategory('todo')}
        <Stack>
          <TaskComponent
            task={null}
            updateTask={updateTask}
            createTask={createTask}
            deleteTask={deleteTask}
            categories={categories}
            mode={TaskMode.create}
          />
        </Stack>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <Grid >
          <h1>In Progress</h1>

          {categories.map((category: TCategory) => (
            (category.tasks ? category.tasks : []).map((task: TTask) => (task.status === "in_prog" &&
              <Stack key={task.id}>
                <TaskComponent
                  key={task.id}
                  task={task}
                  updateTask={updateTask}
                  createTask={createTask}
                  deleteTask={deleteTask}
                  categories={categories}
                  mode={TaskMode.view}
                />
              </Stack>
            ))
          ))}
        </Grid>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        {renderCategory('comp')}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <Grid>
          <Grid>
            <h1>Categories</h1>

            {categories.map((category: TCategory) => (
              <Grid key={category.id}>
                <h1>{category.name}</h1>
                {renderControls(category)}
              </Grid>
            ))}
          </Grid>
          <Grid>
            <NewCategoryComponent setCategory={setCategory} />
          </Grid>
        </Grid>
      </CustomTabPanel>

    </Box>
  )
}

export default Home
