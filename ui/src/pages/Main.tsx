import { GetCategoriesResponse, TTask, TCategory } from '../client/types.gen';
import { Grid, Box, Stack, fabStyle } from '../styles';
import React, { ReactElement, useEffect } from 'react'
import { Badge, Button, Chip, Tab, Tabs } from '@mui/material';
import TaskComponent from '../components/Task';
import NewCategoryComponent from '../components/newCategory';
import { create } from '@mui/material/styles/createTransitions';
import { deleteCategory } from '../client';
import CustomTabPanel from '../components/TabPannle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import NewTask from '../components/newTask';

declare module '@mui/material/Grid2' {
  interface GridPropsVariantOverrides {
    card: true;
  }
}

interface MainPropTypes {
  categories: TCategory[],
  createTask: (newTask: TTask) => void
  updateTask: (task: TTask | null, newTask: TTask) => void
  deleteTask: (task: TTask) => void;
  setCategory: (category: TCategory) => void
  deleteCategory: (category: TCategory) => void

}

const Home = (props: MainPropTypes): ReactElement => {
  const { categories, createTask, updateTask, deleteTask, setCategory, deleteCategory } = props

  const sumTasks = (filter: string) => {
    let sum = 0;
    for (let i = 0; i < categories.length; i++) {
      sum += categories[i].tasks?.filter(task => task.status === filter).length ?? 0
    }
    return sum;
  }

  const [value, setValue] = React.useState(sumTasks("in_prog") > 0 ? 1 : 0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };


  const renderControls = (category: TCategory) => {
    if (category.id == null) {
      return <></>
    }

    return <Button variant="outlined" color="primary" onClick={() => { deleteCategory(category) }}>Delete Category</Button>
  }

  const renderTasks = (tasks: TTask[] | undefined | null) => {
    return <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableBody>
          {(tasks ?? []).map((task: TTask) => (
            <TableRow key={task.id}>
              <TaskComponent
                key={task.id}
                task={task}
                updateTask={updateTask}
                createTask={createTask}
                deleteTask={deleteTask}
                categories={categories}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer >
  }

  const renderCategories = (filter: string) => {
    return <>{categories.map((category: TCategory) => (
      <Accordion defaultExpanded={(category.tasks ?? []).filter(task => task.status === filter).length > 0 ? true : false} expanded={(category.tasks ?? []).filter(task => task.status === filter).length > 0 ? true : false} key={category.name}>
        <AccordionSummary
          key={category.name}
          aria-controls={"panel-" + category.name + "-content"}
          id={"panel-" + category.name + "-header"}
        >
          <Typography variant='h4'>{category.name}</Typography>
        </AccordionSummary>
        <AccordionDetails key={category.name}>
          {renderTasks(category.tasks?.filter(task => task.status === filter))}
        </AccordionDetails>

      </Accordion>
    ))}</>
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }


  const inProgressTasks = () => {
    const tasks = []
    for (let i = 0; i < categories.length; i++) {
      tasks.push(...(categories[i].tasks?.filter((task) => task.status === 'in_prog')) ?? [])
    }
    return tasks
  }
  return (
    <Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs variant="fullWidth" value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label={<>Todo<Chip label={sumTasks('todo')} /></>} {...a11yProps(0)} />
          <Tab label={<>In Progress <Chip label={sumTasks('in_prog')} /></>} {...a11yProps(1)} />
          <Tab label={<>Completed <Chip label={sumTasks('comp')} /></>} {...a11yProps(2)} />
          <Tab label="Category Management" {...a11yProps(3)} />

        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        {renderCategories('todo')}
        {/* <Stack>
          <TaskComponent
            task={null}
            updateTask={updateTask}
            createTask={createTask}
            deleteTask={deleteTask}
            categories={categories}
          />
        </Stack> */}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <Grid >
          {renderTasks(inProgressTasks())}
        </Grid>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        {renderCategories('comp')}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <Grid>
          <Grid>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableBody>
                  {categories.map((category: TCategory) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Typography variant="h5">
                          {category.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {renderControls(category)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer >

          </Grid>
          <Grid>
            <NewCategoryComponent setCategory={setCategory} />
          </Grid>
        </Grid>
      </CustomTabPanel>
      <NewTask categories={categories} createTask={createTask} />
    </Box>
  )
}

export default Home
